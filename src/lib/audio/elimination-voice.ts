/**
 * Nada eliminasi: kabar bahwa seseorang baru saja tumbang.
 *
 * Inilah satu-satunya bunyi yang menandai hasil, bukan sekadar peristiwa.
 * Denting kena berkata "pelurumu sampai"; nada di sini berkata "urusannya
 * selesai" — dan perbedaan itu penting justru di saat paling ribut, ketika
 * pemain sedang menembak dua lawan sekaligus dan perlu tahu apakah boleh
 * berpindah sasaran.
 *
 * Arah nadanya membawa seluruh maknanya. Lawan yang tumbang bernada NAIK,
 * pemain yang tumbang bernada TURUN. Telinga menangkap arah lebih cepat
 * daripada mata membaca umpan kill, dan pemain yang baru saja saling tembak
 * dalam jarak dekat kerap tidak tahu siapa yang lebih dulu jatuh.
 */

export type EliminationKind = "lawan" | "kepala" | "sendiri";

export interface EliminationTone {
  /** Deret nada berurutan, hertz. */
  notes: readonly number[];
  /** Jeda antar nada, detik. */
  gap: number;
  gain: number;
  decay: number;
  wave: OscillatorType;
  /** Dentum badan yang jatuh; null bila tidak ada. */
  thud: { freq: number; drop: number; gain: number; decay: number } | null;
  label: string;
}

export const ELIMINATION_TONE: Record<EliminationKind, EliminationTone> = {
  lawan: {
    notes: [520, 780],
    gap: 0.11,
    gain: 0.14,
    decay: 0.16,
    wave: "square",
    thud: { freq: 120, drop: 0.38, gain: 0.3, decay: 0.35 },
    label: "lawan tumbang",
  },
  // Eliminasi lewat tembakan kepala dapat satu nada tambahan di puncaknya.
  // Bukan sekadar hadiah: ia memberi tahu pemain bahwa bidikannya tadi benar,
  // pada saat yang tepat untuk mengulanginya.
  kepala: {
    notes: [520, 780, 1170],
    gap: 0.1,
    gain: 0.16,
    decay: 0.16,
    wave: "square",
    thud: { freq: 120, drop: 0.38, gain: 0.3, decay: 0.35 },
    label: "lawan tumbang lewat kepala",
  },
  // Kematian sendiri: tiga nada yang jatuh, lebih panjang dan lebih rendah,
  // ditutup dentum yang paling berat. Tidak ada yang perlu dirayakan.
  sendiri: {
    notes: [660, 440, 330],
    gap: 0.13,
    gain: 0.15,
    decay: 0.26,
    wave: "sawtooth",
    thud: { freq: 90, drop: 0.35, gain: 0.34, decay: 0.55 },
    label: "kamu tumbang",
  },
};

export interface EliminationFacts {
  /** Benar bila yang tumbang adalah pemain sendiri. */
  isOwnDeath: boolean;
  isHeadshot: boolean;
}

/**
 * Nada mana yang dibunyikan untuk sebuah eliminasi.
 *
 * Kematian sendiri mengalahkan apa pun: tumbang oleh tembakan kepala tetap
 * kabar buruk, dan merayakannya dengan nada naik adalah kebalikan dari
 * memberi tahu pemain apa yang baru terjadi.
 */
export function eliminationKind(facts: EliminationFacts): EliminationKind {
  if (facts.isOwnDeath) return "sendiri";
  return facts.isHeadshot ? "kepala" : "lawan";
}

/** Lama seluruh rangkaian sebuah nada eliminasi, detik. */
export function eliminationLength(kind: EliminationKind): number {
  const tone = ELIMINATION_TONE[kind];
  const nada = (tone.notes.length - 1) * tone.gap + tone.decay;
  return Math.max(nada, tone.thud?.decay ?? 0);
}
