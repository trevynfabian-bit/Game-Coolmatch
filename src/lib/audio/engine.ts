import type { AudioSettings } from "@/lib/store/settings-store";

/**
 * Inti mesin audio prosedural.
 *
 * Satu AudioContext untuk seluruh game dengan empat bus: utama, lalu efek,
 * musik, dan antarmuka di bawahnya. Setiap bunyi disambungkan ke bus
 * kanalnya, jadi volume dari pengaturan cukup diterapkan di gain bus.
 *
 * Browser menahan audio sampai ada gestur pengguna. `installUnlock` menyimak
 * gestur pertama (klik, sentuh, tombol) lalu melanjutkan konteks; sebelum itu
 * semua panggilan bunyi diam-diam diabaikan.
 */

export type AudioChannel = "sfx" | "music" | "ui";

interface Engine {
  context: AudioContext;
  master: GainNode;
  buses: Record<AudioChannel, GainNode>;
  noise: AudioBuffer;
}

let engine: Engine | null = null;
let unlocked = false;
let pendingSettings: AudioSettings | null = null;

function createEngine(): Engine | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const context = new Ctor();
  const master = context.createGain();
  // Limiter di ujung rantai: saat banyak tembakan dan ledakan bertumpuk,
  // puncaknya ditekan alih-alih pecah (clipping).
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  master.connect(limiter).connect(context.destination);
  const bus = () => {
    const gain = context.createGain();
    gain.connect(master);
    return gain;
  };
  const length = context.sampleRate * 1.5;
  const noise = context.createBuffer(1, length, context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return { context, master, buses: { sfx: bus(), music: bus(), ui: bus() }, noise };
}

/** Mesin yang siap berbunyi, atau null bila belum dibuka gestur / tidak didukung. */
export function getEngine(): Engine | null {
  if (!unlocked) return null;
  if (!engine) {
    engine = createEngine();
    if (engine && pendingSettings) applyAudioSettings(pendingSettings);
  }
  if (engine && engine.context.state === "suspended") void engine.context.resume();
  return engine;
}

/** Bus tujuan untuk sebuah kanal, beserta konteksnya. */
export function channel(name: AudioChannel): { context: AudioContext; out: GainNode; noise: AudioBuffer } | null {
  const ready = getEngine();
  return ready ? { context: ready.context, out: ready.buses[name], noise: ready.noise } : null;
}

/** Menerapkan volume dari pengaturan ke bus; diingat bila mesin belum ada. */
export function applyAudioSettings(settings: AudioSettings): void {
  pendingSettings = settings;
  if (!engine) return;
  const now = engine.context.currentTime;
  const set = (gain: GainNode, value: number) => gain.gain.setTargetAtTime(value, now, 0.03);
  set(engine.master, settings.muted ? 0 : settings.master);
  set(engine.buses.sfx, settings.sfx);
  set(engine.buses.music, settings.music);
  set(engine.buses.ui, settings.ui);
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/**
 * Menyimak gestur pertama pemain untuk membuka audio. Mengembalikan fungsi
 * pembersih. Aman dipanggil berulang.
 */
export function installUnlock(onUnlock?: () => void): () => void {
  if (typeof window === "undefined" || unlocked) return () => {};
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    getEngine();
    onUnlock?.();
    cleanup();
  };
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const cleanup = () => events.forEach((name) => window.removeEventListener(name, unlock, true));
  events.forEach((name) => window.addEventListener(name, unlock, true));
  return cleanup;
}

/**
 * Pembatas suara per jenis. Pertempuran ramai bisa memicu puluhan bunyi dalam
 * sedetik; tanpa batas, CPU audio terbebani dan hasilnya cuma dengung. Setiap
 * jenis bunyi punya batas suara bersamaan dan jarak minimum antar-pemicu;
 * pemicu yang melanggar diabaikan (bunyi lain yang sejenis sudah mewakilinya).
 */
interface VoicePool {
  active: number;
  lastAt: number;
}
const pools = new Map<string, VoicePool>();

export function acquireVoice(kind: string, maxVoices: number, minGapMs: number, lengthMs: number): boolean {
  const now = performance.now();
  const pool = pools.get(kind) ?? { active: 0, lastAt: -Infinity };
  pools.set(kind, pool);
  if (pool.active >= maxVoices || now - pool.lastAt < minGapMs) return false;
  pool.active += 1;
  pool.lastAt = now;
  setTimeout(() => {
    pool.active = Math.max(0, pool.active - 1);
  }, lengthMs);
  return true;
}
