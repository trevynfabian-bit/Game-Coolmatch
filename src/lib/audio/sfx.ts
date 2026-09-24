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
