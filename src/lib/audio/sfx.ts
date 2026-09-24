import { acquireVoice, channel } from "@/lib/audio/engine";
import { duckMusic } from "@/lib/audio/music";

/**
 * Efek suara prosedural dengan Web Audio API — tanpa berkas audio.
 *
 * Setiap bunyi disambungkan ke bus kanalnya di mesin audio (lib/audio/engine),
 * sehingga volume dari pengaturan berlaku otomatis. Sebelum audio dibuka oleh
 * gestur pertama pemain, panggilan bunyi diabaikan tanpa galat.
 */

/**
 * Dentuman ledakan: derau yang disaring lolos-rendah dan meluruh, ditambah
 * osilator frekuensi rendah yang turun untuk "dug"-nya. `volume` 0..1 dipakai
 * untuk meredam ledakan yang jauh.
 */
export function playExplosion(volume = 1): void {
  const bus = channel("sfx");
  if (!bus || volume <= 0.01) return;
  if (!acquireVoice("ledakan", 4, 60, 1300)) return;
  // Musik meredup sejenak supaya dentuman terasa menguasai ruang.
  duckMusic(0.35, 1.1);
  const ctx = bus.context;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(Math.min(1, volume) * 0.9, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
  master.connect(bus.out);

  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
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
  const bus = channel("sfx");
  if (!bus) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(400, now + 1.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume * 0.5, now + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  source.connect(filter).connect(gain).connect(bus.out);
  source.start(now);
  source.stop(now + 1.5);
}

/** Letupan senapan mesin pendek; dipakai helikopter dukungan. */
export function playGunBurst(volume = 0.3): void {
  const bus = channel("sfx");
  if (!bus || volume <= 0.01) return;
  if (!acquireVoice("helikopter", 3, 40, 90)) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  source.connect(filter).connect(gain).connect(bus.out);
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
  const bus = channel("sfx");
  if (!bus) return;
  if (!acquireVoice("tembakan", 6, 0, 450)) return;
  duckMusic(type === "sniper" || type === "shotgun" ? 0.55 : 0.75, 0.25);
  const ctx = bus.context;
  const voice = GUNSHOT_VOICE[type] ?? GUNSHOT_VOICE.rifle;
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(voice.gain, now);
  master.gain.exponentialRampToValueAtTime(0.001, now + voice.length);
  master.connect(bus.out);

  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
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
  const bus = channel("ui");
  if (!bus) return;
  const ctx = bus.context;
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
    osc.connect(gain).connect(bus.out);
    osc.start(start);
    osc.stop(start + 0.08);
  });
}

/** Satu bunyi logam pendek: klik, dentang, atau geser, dijadwalkan pada `at` detik konteks. */
function metalClick(bus: NonNullable<ReturnType<typeof channel>>, at: number, pitch: number, length: number, gain: number) {
  const ctx = bus.context;
  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = pitch;
  filter.Q.value = 6;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.001, at + length);
  source.connect(filter).connect(amp).connect(bus.out);
  source.start(at, Math.random() * 0.5);
  source.stop(at + length + 0.02);
}

/**
 * Rangkaian bunyi isi ulang yang mengikuti lama isi ulang senjata: magasin
 * dilepas, magasin baru dipasang, lalu kokang. Senjata yang lambat diisi
 * ulang terdengar lebih panjang jedanya.
 */
export function playReload(reloadSeconds: number): void {
  const bus = channel("sfx");
  if (!bus) return;
  const now = bus.context.currentTime;
  const span = Math.max(0.6, reloadSeconds);
  metalClick(bus, now + 0.05, 1800, 0.08, 0.35); // magasin lepas
  metalClick(bus, now + span * 0.55, 1300, 0.1, 0.45); // magasin masuk
  metalClick(bus, now + span * 0.85, 2400, 0.06, 0.4); // kokang tarik
  metalClick(bus, now + span * 0.92, 1600, 0.07, 0.45); // kokang lepas
}

/** Klik pelatuk kosong saat magasin habis. */
export function playDryFire(): void {
  const bus = channel("sfx");
  if (!bus) return;
  metalClick(bus, bus.context.currentTime, 3000, 0.04, 0.3);
}

/** Langkah kaki: hentakan rendah pendek; lari sedikit lebih keras dan tajam. */
export function playFootstep(sprinting: boolean): void {
  const bus = channel("sfx");
  if (!bus) return;
  if (!acquireVoice("langkah", 2, 60, 100)) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = (sprinting ? 900 : 650) * (0.85 + Math.random() * 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(sprinting ? 0.22 : 0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  source.connect(filter).connect(gain).connect(bus.out);
  source.start(now, Math.random());
  source.stop(now + 0.1);
}

/** Bunyi mendarat sesudah melompat; makin keras makin cepat jatuhnya. */
export function playLanding(impactSpeed: number): void {
  const bus = channel("sfx");
  if (!bus) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const strength = Math.min(1, impactSpeed / 14);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(95, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25 + strength * 0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain).connect(bus.out);
  osc.start(now);
  osc.stop(now + 0.2);
  playFootstep(true);
}

/**
 * Peluru menghantam: "tak" kering untuk tembok dan krat, "buk" teredam untuk
 * badan petarung. `distance` meredam bunyi yang jauh.
 */
export function playImpact(onFighter: boolean, distance: number): void {
  const bus = channel("sfx");
  if (!bus) return;
  if (!acquireVoice("dampak", 5, 20, 140)) return;
  const volume = Math.max(0, 1 - distance / 60);
  if (volume <= 0.02) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = onFighter ? "lowpass" : "bandpass";
  filter.frequency.value = onFighter ? 500 : 2200 + Math.random() * 800;
  filter.Q.value = onFighter ? 1 : 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime((onFighter ? 0.35 : 0.18) * volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (onFighter ? 0.12 : 0.06));
  source.connect(filter).connect(gain).connect(bus.out);
  source.start(now, Math.random());
  source.stop(now + 0.14);
}

/**
 * Tembakan musuh: suara yang sama dengan senjatanya, diredam dan disaring
 * menurut jarak supaya pemain bisa menebak seberapa dekat bahayanya.
 */
export function playRemoteGunshot(type: string, distance: number): void {
  const bus = channel("sfx");
  if (!bus) return;
  if (!acquireVoice("tembakan_musuh", 4, 35, 200)) return;
  const volume = Math.max(0, 1 - distance / 70);
  if (volume <= 0.03) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = bus.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  // Makin jauh makin teredam: frekuensi tinggi hilang lebih dulu.
  filter.frequency.value = 600 + 2400 * volume;
  const gain = ctx.createGain();
  const peak = (type === "sniper" || type === "shotgun" ? 0.35 : 0.22) * volume;
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  source.connect(filter).connect(gain).connect(bus.out);
  source.start(now, Math.random());
  source.stop(now + 0.2);
}

/** Pemain terkena tembakan: dengus rendah dan desis singkat. */
export function playHurt(severity: number): void {
  const bus = channel("sfx");
  if (!bus) return;
  if (!acquireVoice("terluka", 2, 80, 200)) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08 + Math.min(0.2, severity * 0.4), now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(filter).connect(gain).connect(bus.out);
  osc.start(now);
  osc.stop(now + 0.2);
}

/** Nada pendek antarmuka: urutan frekuensi yang dimainkan berurutan. */
function stinger(notes: number[], step: number, type: OscillatorType, peak: number): void {
  const bus = channel("ui");
  if (!bus) return;
  const ctx = bus.context;
  const now = ctx.currentTime;
  notes.forEach((hz, index) => {
    const at = now + index * step;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, at);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 1.8);
    osc.connect(gain).connect(bus.out);
    osc.start(at);
    osc.stop(at + step * 2);
  });
}

/** Penanda peristiwa: tumbang, muncul lagi, ronde mulai/selesai, menang/kalah. */
export function playCue(cue: "tumbang" | "muncul" | "ronde_mulai" | "ronde_selesai" | "menang" | "kalah"): void {
  switch (cue) {
    case "tumbang":
      return stinger([392, 311, 233], 0.14, "triangle", 0.12);
    case "muncul":
      return stinger([523, 784], 0.08, "sine", 0.08);
    case "ronde_mulai":
      return stinger([440, 440, 880], 0.12, "square", 0.05);
    case "ronde_selesai":
      return stinger([660, 523], 0.15, "triangle", 0.09);
    case "menang":
      return stinger([523, 659, 784, 1047], 0.13, "triangle", 0.12);
    case "kalah":
      return stinger([440, 392, 349, 330], 0.16, "triangle", 0.1);
  }
}
