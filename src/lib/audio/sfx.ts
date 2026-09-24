/**
 * Efek suara prosedural dengan Web Audio API — tanpa berkas audio.
 *
 * Konteks audio dibuat malas pada panggilan pertama; browser hanya mengizinkan
 * suara sesudah gerakan pengguna, dan arena selalu diawali klik untuk mengunci
 * kursor, jadi pada saat efek pertama diputar konteks sudah boleh berbunyi.
 */

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  const length = ctx.sampleRate * 1.5;
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

/**
 * Dentuman ledakan: derau yang disaring lolos-rendah dan meluruh, ditambah
 * osilator frekuensi rendah yang turun untuk "dug"-nya. `volume` 0..1 dipakai
 * untuk meredam ledakan yang jauh.
 */
export function playExplosion(volume = 1): void {
  const ctx = audio();
  if (!ctx || volume <= 0.01) return;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1, volume) * 0.9, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  master.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + 1.1);
  source.connect(filter).connect(master);
  source.start(now);
  source.stop(now + 1.4);

  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(110, now);
  thump.frequency.exponentialRampToValueAtTime(35, now + 0.5);
  thumpGain.gain.setValueAtTime(0.8, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  thump.connect(thumpGain).connect(master);
  thump.start(now);
  thump.stop(now + 0.7);
}

/** Desing jet yang lewat di atas: derau lolos-pita yang frekuensinya menyapu turun. */
export function playJetFlyby(volume = 0.6): void {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + 1.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume * 0.5, now + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
  source.stop(now + 1.5);
}

/** Letupan senapan mesin pendek; dipakai helikopter dukungan. */
export function playGunBurst(volume = 0.3): void {
  const ctx = audio();
  if (!ctx || volume <= 0.01) return;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now, Math.random() * 0.5);
  source.stop(now + 0.09);
}

/** Karakter bunyi tembakan per jenis senjata: frekuensi potong, panjang, dan "dug". */
const GUNSHOT_VOICE: Record<string, { cutoff: number; length: number; thump: number; gain: number }> = {
  pistol: { cutoff: 3200, length: 0.12, thump: 180, gain: 0.35 },
  smg: { cutoff: 4200, length: 0.08, thump: 200, gain: 0.28 },
  rifle: { cutoff: 2600, length: 0.16, thump: 140, gain: 0.4 },
  shotgun: { cutoff: 1500, length: 0.3, thump: 90, gain: 0.55 },
  sniper: { cutoff: 1900, length: 0.45, thump: 70, gain: 0.6 },
};

/** Letusan senjata pemain, dibedakan per jenis supaya tiap senjata terdengar khas. */
export function playGunshot(type: string): void {
  const ctx = audio();
  if (!ctx) return;
  const voice = GUNSHOT_VOICE[type] ?? GUNSHOT_VOICE.rifle;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(voice.gain, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + voice.length);
  master.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(voice.cutoff, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + voice.length);
  source.connect(filter).connect(master);
  source.start(now, Math.random() * 0.8);
  source.stop(now + voice.length + 0.02);

  const thump = ctx.createOscillator();
  thump.type = "triangle";
  thump.frequency.setValueAtTime(voice.thump, now);
  thump.frequency.exponentialRampToValueAtTime(40, now + voice.length * 0.6);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.6, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + voice.length * 0.7);
  thump.connect(thumpGain).connect(master);
  thump.start(now);
  thump.stop(now + voice.length);
}

/** "Tik" konfirmasi tembakan kena; lebih tinggi untuk kepala, dobel untuk kill. */
export function playHitConfirm(kind: "badan" | "kepala" | "kill"): void {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const tones = kind === "kill" ? [1320, 1760] : [kind === "kepala" ? 1560 : 1100];
  tones.forEach((frequency, index) => {
    const start = now + index * 0.06;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(frequency, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.08);
  });
}
