/**
 * Suasana arena: bunyi latar yang mengisi kesunyian di antara baku tembak.
 *
 * Berbeda dari dengung musik yang sama di mana pun, suasana mengikuti PETA.
 * Gudang tua berdecit kayu dan besi; lorong pabrik berdengung mesin; atap kota
 * kena angin terbuka yang datang dan pergi. Itu pula yang membuat peta terasa
 * sebagai tempat, bukan sekadar susunan penghalang yang berbeda — dan
 * semuanya dibangkitkan dari derau serta osilator, tanpa satu pun berkas audio
 * yang harus diunduh pemain.
 *
 * Angkanya ditaruh terpisah dari mesin audio supaya bisa diperiksa tanpa
 * browser, dan supaya menambah peta baru berarti menambah satu baris di sini,
 * bukan menyunting mesin suara.
 */

export interface AmbienceWind {
  gain: number;
  /** Batas bawah dan atas lowpass yang disapu perlahan, hertz. */
  cutoffLow: number;
  cutoffHigh: number;
  /** Lama satu sapuan penuh naik-turun, detik. */
  sweepSeconds: number;
}

export interface AmbienceRumble {
  freq: number;
  /** Selisih nada osilator kedua, hertz; selisih kecil membuatnya berdenyut. */
  detune: number;
  gain: number;
}

export interface AmbienceAccent {
  /** Jeda terpendek dan terpanjang antar bunyi sesekali, detik. */
  minGap: number;
  maxGap: number;
  freq: number;
  gain: number;
  decay: number;
  wave: OscillatorType;
  /** Apa yang digambarkan bunyi ini, untuk keperluan pemeriksaan. */
  label: string;
}

export interface AmbienceProfile {
  label: string;
  wind: AmbienceWind;
  /** Dengung ruang; null untuk tempat terbuka tanpa mesin. */
  rumble: AmbienceRumble | null;
  /** Bunyi sesekali: decitan, denting, atau embusan; null bila tidak ada. */
  accent: AmbienceAccent | null;
}

/**
 * Suasana bawaan, dipakai peta yang belum punya wataknya sendiri. Sengaja yang
 * paling netral: angin tipis dan dengung ruang rendah, tanpa aksen — peta baru
 * lebih baik terdengar polos daripada terdengar seperti peta lain.
 */
export const DEFAULT_AMBIENCE: AmbienceProfile = {
  label: "ruang netral",
  wind: { gain: 0.05, cutoffLow: 220, cutoffHigh: 480, sweepSeconds: 19 },
  rumble: { freq: 52, detune: 0.4, gain: 0.035 },
  accent: null,
};

export const AMBIENCE_PROFILES: Record<string, AmbienceProfile> = {
  // Gudang tua: kayu dan besi yang menyusut di senja hari.
  "map-gudang-senja": {
    label: "gudang berdecit",
    wind: { gain: 0.055, cutoffLow: 200, cutoffHigh: 520, sweepSeconds: 21 },
    rumble: { freq: 48, detune: 0.35, gain: 0.04 },
    accent: {
      minGap: 7,
      maxGap: 16,
      freq: 320,
      gain: 0.05,
      decay: 0.5,
      wave: "triangle",
      label: "decit kayu",
    },
  },
  // Pabrik: mesin yang tidak pernah benar-benar mati, sesekali berdenting.
  "map-lorong-pabrik": {
    label: "mesin pabrik",
    wind: { gain: 0.04, cutoffLow: 300, cutoffHigh: 700, sweepSeconds: 13 },
    rumble: { freq: 62, detune: 1.6, gain: 0.055 },
    accent: {
      minGap: 5,
      maxGap: 11,
      freq: 760,
      gain: 0.045,
      decay: 0.35,
      wave: "square",
      label: "denting logam",
    },
  },
  // Atap kota: angin terbuka yang paling kencang dan paling sering berembus.
  "map-atap-kota": {
    label: "angin atap",
    wind: { gain: 0.085, cutoffLow: 380, cutoffHigh: 1400, sweepSeconds: 8 },
    rumble: { freq: 44, detune: 0.25, gain: 0.03 },
    accent: {
      minGap: 6,
      maxGap: 13,
      freq: 240,
      gain: 0.06,
      decay: 1.1,
      wave: "sine",
      label: "embusan angin",
    },
  },
  // Silo: ruang logam yang menggaung, tetesan yang bergema panjang.
  "map-silo-kembar": {
    label: "silo menggaung",
    wind: { gain: 0.05, cutoffLow: 160, cutoffHigh: 420, sweepSeconds: 24 },
    rumble: { freq: 38, detune: 0.8, gain: 0.05 },
    accent: {
      minGap: 8,
      maxGap: 18,
      freq: 1150,
      gain: 0.04,
      decay: 0.8,
      wave: "sine",
      label: "tetesan bergema",
    },
  },
  // Halaman: ruang terbuka di tengah bangunan, paling tenang dari semuanya.
  "map-halaman-tengah": {
    label: "halaman terbuka",
    wind: { gain: 0.06, cutoffLow: 260, cutoffHigh: 820, sweepSeconds: 16 },
    rumble: { freq: 50, detune: 0.3, gain: 0.028 },
    accent: {
      minGap: 9,
      maxGap: 20,
      freq: 420,
      gain: 0.035,
      decay: 0.6,
      wave: "triangle",
      label: "gema jauh",
    },
  },
};

/** Suasana untuk sebuah peta; peta tak dikenal mendapat yang bawaan. */
export function ambienceFor(mapId: string | null | undefined): AmbienceProfile {
  if (!mapId) return DEFAULT_AMBIENCE;
  return AMBIENCE_PROFILES[mapId] ?? DEFAULT_AMBIENCE;
}

/**
 * Jeda sampai bunyi sesekali berikutnya, dari satu undian 0..1.
 *
 * Undiannya dioper sebagai ANGKA, bukan diambil dari Math.random di dalam
 * sini, supaya jaraknya bisa diperiksa tanpa menebak-nebak: undian nol
 * memberi jeda terpendek, undian satu memberi yang terpanjang.
 */
export function accentDelay(profile: AmbienceProfile, roll: number): number {
  const accent = profile.accent;
  if (!accent) return 0;
  const r = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0.5;
  return accent.minGap + (accent.maxGap - accent.minGap) * r;
}

/** Benar bila sebuah peta punya suasananya sendiri, bukan yang bawaan. */
export function hasOwnAmbience(mapId: string): boolean {
  return mapId in AMBIENCE_PROFILES;
}
