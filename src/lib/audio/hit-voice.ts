/**
 * Nada "kena" untuk pemain: satu-satunya kabar bahwa tembakan benar-benar
 * mengenai sesuatu, dan bahwa sesuatu mengenai dirinya.
 *
 * Di arena, mata sedang sibuk membidik. Penanda kena di layar hanya terlihat
 * kalau pemain kebetulan menatap tempatnya, sedangkan telinga selalu
 * mendengar. Karena itu nada-nada di sini dibedakan menurut APA yang terjadi,
 * bukan sekadar "ada yang kena": kepala berbeda dari badan, rompi berbeda dari
 * daging, dan kena tembak sendiri berbeda dari menembak orang.
 *
 * Angkanya ditaruh terpisah dari mesin audio supaya urutannya bisa diperiksa
 * tanpa browser — "apakah tembakan kepala benar-benar lebih tinggi daripada
 * badan" adalah pertanyaan tentang tabel ini.
 */

/** Apa yang terkena tembakan pemain. */
export type HitKind = "badan" | "kepala" | "rompi";

export interface HitTone {
  /** Nada dasar, hertz. */
  freq: number;
  /**
   * Nada susulan sepersekian detik kemudian, hertz; null bila nadanya tunggal.
   * Dua nada naik jauh lebih mudah dikenali di tengah keributan daripada satu
   * nada yang sekadar lebih tinggi.
   */
  freq2: number | null;
  /** Jeda nada susulan, detik. */
  gap: number;
  gain: number;
  decay: number;
  wave: OscillatorType;
  label: string;
}

export const HIT_TONE: Record<HitKind, HitTone> = {
  badan: {
    freq: 880,
    freq2: null,
    gap: 0,
    gain: 0.18,
    decay: 0.09,
    wave: "triangle",
    label: "kena badan",
  },
  // Tembakan kepala adalah peristiwa yang pantas dirayakan, jadi ia satu-
  // satunya yang bernada ganda dan naik.
  kepala: {
    freq: 1320,
    freq2: 1760,
    gap: 0.05,
    gain: 0.22,
    decay: 0.1,
    wave: "triangle",
    label: "kena kepala",
  },
  // Rompi berdenting logam dan lebih pendek: pemain perlu tahu tembakannya
  // sedang dimakan pelindung, bukan mengurangi nyawa.
  rompi: {
    freq: 1040,
    freq2: null,
    gap: 0,
    gain: 0.16,
    decay: 0.06,
    wave: "square",
    label: "kena rompi",
  },
};

export interface HitFacts {
  isHeadshot: boolean;
  /** Berapa banyak rompi yang terkikis tembakan ini. */
  armorLost: number;
  /** Berapa banyak nyawa yang hilang tembakan ini. */
  healthLost: number;
}

/**
 * Nada mana yang dibunyikan untuk sebuah tembakan yang kena.
 *
 * Kepala menang atas rompi: kalau keduanya benar, yang ingin didengar pemain
 * adalah bahwa ia mengenai kepala. Rompi menang atas badan hanya bila rompi
 * itulah yang menanggung sebagian besar kerusakannya — tembakan yang menembus
 * rompi tipis lalu melukai tetap terdengar sebagai kena badan.
 */
export function hitKind(facts: HitFacts): HitKind {
  if (facts.isHeadshot) return "kepala";
  if (facts.armorLost > 0 && facts.armorLost >= facts.healthLost) {
    return "rompi";
  }
  return "badan";
}

/**
 * Nada saat PEMAIN yang kena tembak: dentum rendah, bukan denting.
 *
 * Sengaja dibedakan setajam mungkin dari nada mengenai lawan. Keduanya terjadi
 * dalam keributan yang sama, dan pemain yang salah mengira sedang menang
 * padahal sedang ditembaki akan membuat keputusan yang salah pula.
 */
export const TAKEN_TONE = {
  /** Nada awal dentum, hertz. */
  freq: 190,
  /** Bagian nada awal yang tersisa di akhir. */
  drop: 0.45,
  decay: 0.26,
  wave: "sine" as OscillatorType,
  /** Denting logam yang ditambahkan bila rompi yang menanggungnya. */
  armorRing: { freq: 1180, gain: 0.1, decay: 0.07 },
};

/** Batas bawah dan atas kerasnya dentum kena tembak. */
export const TAKEN_GAIN_MIN = 0.14;
export const TAKEN_GAIN_MAX = 0.42;

/**
 * Kerasnya dentum menurut seberapa besar tembakan itu melukai, 0..1 dari nyawa
 * penuh.
 *
 * Tidak pernah nol: tembakan serempet yang tak terdengar sama saja dengan
 * tidak memberi tahu pemain bahwa ia sedang ditembaki. Tidak pernah penuh
 * juga — dentum sekeras letupan senjata sendiri akan menutupi langkah lawan
 * tepat pada saat pemain paling membutuhkannya.
 */
export function takenGain(severity: number): number {
  const s = Number.isFinite(severity) ? Math.min(1, Math.max(0, severity)) : 0;
  return TAKEN_GAIN_MIN + (TAKEN_GAIN_MAX - TAKEN_GAIN_MIN) * s;
}
