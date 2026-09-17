import type { Difficulty } from "@/types/game";

/**
 * Sifat musuh otomatis per tingkat kesulitan.
 *
 * Angka-angka di sini adalah KONTRAK yang akan dipakai task AI musuh: berapa
 * lama bot menyadari pemain, seberapa sering ia menembak, seberapa besar
 * peluang tembakannya mengarah tepat, dan seberapa berani ia mendekat. Layar
 * pengaturan menampilkan padanannya dalam bahasa sehari-hari supaya pemain
 * tidak perlu menebak arti angkanya.
 */
export interface DifficultyProfile {
  id: Difficulty;
  label: string;
  /** Satu kalimat yang menjelaskan rasanya bermain melawan tingkat ini. */
  blurb: string;

  /** Lama bot menyadari pemain yang masuk garis pandangnya, dalam detik. */
  reactionSeconds: number;
  /** Peluang satu tembakan bot mengarah tepat, 0..1. */
  accuracy: number;
  /** Rentang jeda antar tembakan bot, dalam detik. */
  fireIntervalSeconds: [min: number, max: number];
  /** Seberapa berani bot mendekat alih-alih bertahan di balik penghalang, 0..1. */
  aggression: number;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  santai: {
    id: "santai",
    label: "Santai",
    blurb:
      "Musuh lambat sadar dan sering meleset. Pas untuk mengenali peta atau mencoba senjata baru.",
    reactionSeconds: 1.1,
    accuracy: 0.25,
    fireIntervalSeconds: [1.6, 3.2],
    aggression: 0.25,
  },
  normal: {
    id: "normal",
    label: "Normal",
    blurb:
      "Musuh membalas dengan wajar dan sesekali mengejar. Pertandingan terasa seimbang.",
    reactionSeconds: 0.6,
    accuracy: 0.45,
    fireIntervalSeconds: [1.0, 2.2],
    aggression: 0.5,
  },
  susah: {
    id: "susah",
    label: "Susah",
    blurb:
      "Musuh cepat sadar, jarang meleset, dan berani menekan. Jangan berdiri di tempat terbuka.",
    reactionSeconds: 0.28,
    accuracy: 0.68,
    fireIntervalSeconds: [0.6, 1.4],
    aggression: 0.8,
  },
};

/** Urutan tampil pada layar pengaturan, dari paling ringan. */
export const DIFFICULTY_ORDER: Difficulty[] = ["santai", "normal", "susah"];

export function difficultyProfile(difficulty: Difficulty): DifficultyProfile {
  return DIFFICULTY_PROFILES[difficulty];
}

/**
 * Batas jumlah musuh. Batas atas mengikuti jumlah titik spawn peta dikurangi
 * satu untuk pemain, supaya tidak ada dua orang muncul berdempetan.
 */
export const MIN_BOTS = 1;
export const MAX_BOTS = 7;

export function clampBotCount(count: number): number {
  if (!Number.isFinite(count)) return MIN_BOTS;
  return Math.min(MAX_BOTS, Math.max(MIN_BOTS, Math.round(count)));
}
