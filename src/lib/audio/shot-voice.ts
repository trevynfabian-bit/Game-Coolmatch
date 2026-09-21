import type { WeaponType } from "@/types/game";

/**
 * Watak bunyi tiap senjata, sebagai angka murni.
 *
 * Dipisah dari mesin audio supaya bisa diperiksa tanpa browser — "apakah
 * shotgun benar-benar lebih rendah dan lebih panjang daripada SMG" adalah
 * pertanyaan tentang tabel ini, bukan tentang Web Audio — dan supaya
 * penyetelan rasa suara terbaca di satu tempat.
 *
 * Tiap letupan disusun dari empat lapis, karena itulah yang membedakan senjata
 * di telinga. Mengeraskan volume saja hanya membuat senjata yang sama terdengar
 * lebih dekat:
 *
 * - `crack`  — desis tajam dari derau yang disaring; menentukan "kaliber".
 * - `body`   — dentum rendah yang jatuh cepat; menentukan seberapa berat.
 * - `tail`   — ekor gema pendek di ruang arena; menentukan seberapa besar
 *              ruangnya terasa, dan itulah yang membuat sniper terdengar
 *              menggelegar sementara SMG terdengar kering.
 * - `action` — bunyi mekanik sesudahnya: slide pistol, pompa shotgun, bolt
 *              sniper. Senjata otomatis tidak punya karena mekaniknya tenggelam
 *              di dalam rentetan.
 */

export interface ShotCrack {
  gain: number;
  decay: number;
  /** Titik tengah bandpass, hertz. Makin rendah makin berat. */
  cutoff: number;
  q: number;
}

export interface ShotBody {
  gain: number;
  /** Nada awal dentum, hertz. */
  freq: number;
  /** Bagian nada awal yang tersisa di akhir, 0..1. */
  drop: number;
  decay: number;
}

export interface ShotTail {
  gain: number;
  decay: number;
  /** Batas atas lowpass ekor gema, hertz. */
  cutoff: number;
}

export interface ShotAction {
  /** Jeda sesudah letupan, detik. */
  delay: number;
  gain: number;
  /** Batas bawah highpass ketukan mekanik, hertz. */
  cutoff: number;
  /** Berapa ketukan; pompa shotgun terdengar dua kali: mundur lalu maju. */
  clicks: number;
}

export interface ShotVoice {
  /** Nama watak bunyinya, untuk keperluan pemeriksaan dan keterangan. */
  label: string;
  crack: ShotCrack;
  body: ShotBody;
  tail: ShotTail;
  /** Null untuk senjata otomatis: mekaniknya tenggelam dalam rentetan. */
  action: ShotAction | null;
}

export const SHOT_VOICE: Record<WeaponType, ShotVoice> = {
  pistol: {
    label: "Letupan kering, mid tinggi, ekor pendek",
    crack: { gain: 0.5, decay: 0.12, cutoff: 2600, q: 0.7 },
    body: { gain: 0.35, freq: 190, drop: 0.45, decay: 0.12 },
    tail: { gain: 0.08, decay: 0.22, cutoff: 1800 },
    action: { delay: 0.055, gain: 0.07, cutoff: 3200, clicks: 1 },
  },
  smg: {
    label: "Cepat dan tipis, nyaris tanpa gema",
    crack: { gain: 0.38, decay: 0.085, cutoff: 3000, q: 0.9 },
    body: { gain: 0.24, freq: 230, drop: 0.5, decay: 0.08 },
    tail: { gain: 0.05, decay: 0.16, cutoff: 2200 },
    action: null,
  },
  rifle: {
    label: "Dentum penuh dengan gema sedang",
    crack: { gain: 0.6, decay: 0.16, cutoff: 2200, q: 0.6 },
    body: { gain: 0.42, freq: 150, drop: 0.4, decay: 0.16 },
    tail: { gain: 0.14, decay: 0.34, cutoff: 1400 },
    action: null,
  },
  shotgun: {
    label: "Ledakan lebar dan rendah, disusul pompa",
    crack: { gain: 0.85, decay: 0.3, cutoff: 1200, q: 0.4 },
    body: { gain: 0.6, freq: 90, drop: 0.35, decay: 0.3 },
    tail: { gain: 0.2, decay: 0.5, cutoff: 900 },
    action: { delay: 0.34, gain: 0.1, cutoff: 1600, clicks: 2 },
  },
  sniper: {
    label: "Paling keras dan paling panjang, ekor menggelegar",
    crack: { gain: 0.95, decay: 0.42, cutoff: 1600, q: 0.5 },
    body: { gain: 0.66, freq: 70, drop: 0.3, decay: 0.42 },
    tail: { gain: 0.3, decay: 0.95, cutoff: 700 },
    action: { delay: 0.52, gain: 0.09, cutoff: 2400, clicks: 2 },
  },
};

/**
 * Sejauh mana tembakan masih terdengar, dalam satuan arena. Di luar ini
 * bunyinya tidak dibangkitkan sama sekali: arena terbesar pun lebih kecil dari
 * ini, jadi batasnya hanya pengaman agar tidak ada node yang dibangun untuk
 * sesuatu yang tak terdengar.
 */
export const SHOT_EARSHOT = 70;

/**
 * Jarak saat tembakan sudah terdengar setengah keras.
 *
 * Jauh lebih longgar daripada peluruhan sebenarnya, dengan sengaja. Yang
 * penting bukan kesetiaan fisika melainkan kegunaannya: baku tembak di seberang
 * arena harus tetap TERDENGAR — itulah yang memberi tahu pemain ke mana harus
 * pergi atau justru dihindari — sambil tetap jelas lebih jauh daripada tembakan
 * di depan hidung.
 */
const HALF_GAIN_DISTANCE = 14;

/** Kecepatan bunyi, satuan arena per detik. */
const SPEED_OF_SOUND = 340;

export interface ShotDistanceMix {
  /** Pengali volume, 0..1. */
  gain: number;
  /** Batas atas lowpass; jarak menelan frekuensi tinggi lebih dulu. */
  cutoff: number;
  /** Jeda sampai bunyinya tiba, detik. */
  delay: number;
}

/**
 * Bagaimana sebuah tembakan berubah karena jaraknya.
 *
 * Tiga hal sekaligus, karena ketiganya yang dipakai telinga untuk menaksir
 * jarak: makin jauh makin pelan, makin tumpul (udara menelan desisnya lebih
 * dulu daripada dentumnya), dan makin telat tiba. Mengembalikan null bila
 * sudah di luar jangkauan dengar.
 */
export function shotDistanceMix(distance: number): ShotDistanceMix | null {
  const jarak = Number.isFinite(distance) ? Math.max(0, distance) : 0;
  if (jarak > SHOT_EARSHOT) return null;

  // Peluruhan kuadrat terbalik yang dijinakkan: tanpa penyebut 1 + … bunyi di
  // jarak nol menjadi tak hingga, dan dengan jarak paruh yang kecil peluruhan
  // murni membuat tembakan seberang arena praktis senyap.
  const gain = 1 / (1 + (jarak / HALF_GAIN_DISTANCE) ** 2);
  const cutoff = 18000 * Math.exp(-jarak / 22);
  return {
    gain,
    cutoff: Math.max(500, cutoff),
    delay: jarak / SPEED_OF_SOUND,
  };
}

/**
 * Posisi kiri-kanan sebuah bunyi, -1..1, dari sudutnya relatif arah pandang
 * (konvensi yang sama dengan penunjuk arah kena: nol berarti tepat di depan,
 * positif berarti ke kiri).
 *
 * Tidak pernah mentok di -1 atau 1: bunyi yang sepenuhnya berada di satu
 * telinga terdengar seperti cacat pemutaran, bukan seperti arah.
 */
export const MAX_PAN = 0.85;

export function shotPan(angleRad: number): number {
  if (!Number.isFinite(angleRad)) return 0;
  return -Math.sin(angleRad) * MAX_PAN;
}
