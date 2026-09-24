import { channel } from "@/lib/audio/engine";

/**
 * Musik latar prosedural: sequencer 16 langkah yang menjadwalkan nada sedikit
 * di depan waktu (lookahead) supaya ritmenya stabil walau thread utama sibuk.
 *
 * Dua suasana: "menu" — pad akor lembut dan arpeggio pelan; "arena" — bass
 * berdenyut, hi-hat derau, dan stab synth yang lebih mendesak. Semua bunyi
 * dari osilator dan derau, tanpa berkas audio. Berganti suasana memudar
 * silang sehingga tidak ada potongan kasar.
 */

export type MusicMood = "menu" | "arena";

interface MoodSpec {
  bpm: number;
  /** Akar akor per birama (MIDI). */
  progression: number[];
  /** Pola 16 langkah; angka = interval dari akar, null = diam. */
  arp: (number | null)[];
  bass: (number | null)[];
  hat: boolean[];
  pad: boolean;
}

const MOODS: Record<MusicMood, MoodSpec> = {
  menu: {
    bpm: 84,
    progression: [57, 53, 48, 55], // Am – F – C – G
    arp: [0, null, 7, null, 12, null, 7, null, 3, null, 7, null, 12, null, 15, null],
    bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null],
    hat: Array.from({ length: 16 }, () => false),
    pad: true,
  },
  arena: {
    bpm: 124,
    progression: [45, 45, 43, 48], // A – A – G – C (rendah)
    arp: [null, null, 12, null, null, 15, null, null, 12, null, null, 19, null, 15, null, null],
    bass: [0, null, 0, 12, 0, null, 0, 10, 0, null, 0, 12, 0, null, 7, 10],
    hat: [true, false, true, true, true, false, true, true, true, false, true, true, true, false, true, true],
    pad: false,
  },
};

const LOOKAHEAD_SECONDS = 0.12;
const TICK_MS = 25;

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

interface Player {
  mood: MusicMood;
  gain: GainNode;
  step: number;
  nextTime: number;
  timer: ReturnType<typeof setInterval>;
}

let current: Player | null = null;

/**
 * Peredam bersama di antara semua pemutar dan bus musik. `duckMusic` menurunkan
 * sesaat (ledakan, rentetan tembakan); `holdMusicLevel` menahan pada tingkat
 * tertentu (mis. jeda) sampai dilepas lagi.
 */
let duck: GainNode | null = null;
let holdLevel = 1;

function duckNode(ctx: AudioContext, out: AudioNode): GainNode {
  if (!duck || duck.context !== ctx) {
    duck = ctx.createGain();
    duck.gain.value = holdLevel;
    duck.connect(out);
  }
  return duck;
}

/** Menurunkan musik ke `level` sebentar lalu naik lagi ke tingkat tahan. */
export function duckMusic(level: number, seconds: number): void {
  if (!duck) return;
  const ctx = duck.context;
  const now = ctx.currentTime;
  const target = Math.min(level, holdLevel);
  duck.gain.cancelScheduledValues(now);
  duck.gain.setTargetAtTime(target, now, 0.03);
  duck.gain.setTargetAtTime(holdLevel, now + seconds, 0.25);
}

/** Menahan musik di tingkat tertentu (1 = normal) sampai diubah lagi. */
export function holdMusicLevel(level: number): void {
  holdLevel = level;
  if (!duck) return;
  const now = duck.context.currentTime;
  duck.gain.cancelScheduledValues(now);
  duck.gain.setTargetAtTime(level, now, 0.2);
}

function tone(
  ctx: AudioContext,
  out: AudioNode,
  { hz, at, length, type, peak, cutoff }: { hz: number; at: number; length: number; type: OscillatorType; peak: number; cutoff?: number },
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, at);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.02, length / 4));
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  let node: AudioNode = osc;
  if (cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    osc.connect(filter);
    node = filter;
  }
  node.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

function scheduleStep(player: Player, ctx: AudioContext, noise: AudioBuffer) {
  const spec = MOODS[player.mood];
  const stepSeconds = 60 / spec.bpm / 4;
  const at = player.nextTime;
  const bar = Math.floor(player.step / 16) % spec.progression.length;
  const index = player.step % 16;
  const root = spec.progression[bar];

  if (spec.pad && index === 0) {
    for (const interval of [0, 3, 7]) {
      tone(ctx, player.gain, { hz: midiToHz(root + interval), at, length: stepSeconds * 16, type: "sine", peak: 0.05 });
    }
  }
  const arp = spec.arp[index];
  if (arp !== null) {
    tone(ctx, player.gain, {
      hz: midiToHz(root + 12 + arp),
      at,
      length: stepSeconds * (spec.pad ? 1.8 : 0.9),
      type: spec.pad ? "triangle" : "square",
      peak: spec.pad ? 0.05 : 0.025,
      cutoff: spec.pad ? undefined : 1800,
    });
  }
  const bass = spec.bass[index];
  if (bass !== null) {
    tone(ctx, player.gain, {
      hz: midiToHz(root - 12 + bass),
      at,
      length: stepSeconds * (spec.pad ? 6 : 0.8),
      type: "sawtooth",
      peak: spec.pad ? 0.04 : 0.07,
      cutoff: 420,
    });
  }
  if (spec.hat[index]) {
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(index % 4 === 0 ? 0.05 : 0.025, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    source.connect(filter).connect(amp).connect(player.gain);
    source.start(at, Math.random());
    source.stop(at + 0.05);
  }

  player.nextTime += stepSeconds;
  player.step += 1;
}

/** Memutar suasana musik; bila suasana lain sedang main, keduanya memudar silang. */
export function playMusic(mood: MusicMood): boolean {
  if (current?.mood === mood) return true;
  const bus = channel("music");
  if (!bus) return false;
  const { context: ctx, out, noise } = bus;

  stopMusic();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.5);
  gain.connect(duckNode(ctx, out));

  const player: Player = { mood, gain, step: 0, nextTime: ctx.currentTime + 0.05, timer: 0 as never };
  player.timer = setInterval(() => {
    while (player.nextTime < ctx.currentTime + LOOKAHEAD_SECONDS) scheduleStep(player, ctx, noise);
  }, TICK_MS);
  current = player;
  return true;
}

/** Menghentikan musik dengan memudar pelan. */
export function stopMusic(): void {
  if (!current) return;
  const player = current;
  current = null;
  clearInterval(player.timer);
  const ctx = player.gain.context;
  player.gain.gain.cancelScheduledValues(ctx.currentTime);
  player.gain.gain.setValueAtTime(Math.max(0.0001, player.gain.gain.value), ctx.currentTime);
  player.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
  setTimeout(() => player.gain.disconnect(), 1400);
}

export function currentMood(): MusicMood | null {
  return current?.mood ?? null;
}
