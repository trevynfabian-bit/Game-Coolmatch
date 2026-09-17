import { MAX_BOT_TEMPLATES } from "@/lib/mock/bots";
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

export interface DifficultyTrait {
  label: string;
  /** 0..1 untuk panjang bar; selalu "makin panjang makin berat bagi pemain". */
  value: number;
  /** Kata sehari-hari yang menggantikan angka mentahnya. */
  word: string;
}

/** Ambang yang sama dipakai ketiga tingkat, jadi katanya bisa dibandingkan. */
function traitWord(value: number): string {
  if (value < 0.34) return "Rendah";
  if (value < 0.67) return "Sedang";
  return "Tinggi";
}

/**
 * Tiga sifat yang paling terasa saat bermain, diterjemahkan ke skala 0..1 yang
 * arahnya seragam: makin panjang barnya, makin berat bagi pemain. Reaksi perlu
 * dibalik karena di profil angkanya adalah LAMA menyadari pemain — makin kecil
 * justru makin berbahaya.
 */
export function difficultyTraits(profile: DifficultyProfile): DifficultyTrait[] {
  const slowest = DIFFICULTY_PROFILES.santai.reactionSeconds;
  const fastest = DIFFICULTY_PROFILES.susah.reactionSeconds;
  const alertness = (slowest - profile.reactionSeconds) / (slowest - fastest);

  return [
    { label: "Kesigapan", value: alertness, word: traitWord(alertness) },
    { label: "Ketepatan", value: profile.accuracy, word: traitWord(profile.accuracy) },
    { label: "Keberanian", value: profile.aggression, word: traitWord(profile.aggression) },
  ];
}

/**
 * Batas jumlah musuh yang berlaku di peta MANA PUN — sebanyak template lawan
 * yang tersedia. Batas sesungguhnya untuk satu peta biasanya lebih rapat dan
 * dihitung `maxBotsForMap`, karena titik spawn peta ikut membatasi; pakai itu
 * untuk apa pun yang sudah tahu petanya, dan pakai MAX_BOTS hanya saat petanya
 * belum diketahui.
 */
export const MIN_BOTS = 1;
export const MAX_BOTS = MAX_BOT_TEMPLATES;

export function clampBotCount(count: number): number {
  if (!Number.isFinite(count)) return MIN_BOTS;
  return Math.min(MAX_BOTS, Math.max(MIN_BOTS, Math.round(count)));
}

/**
 * Pengaturan lawan bawaan, dipakai saat pemain belum pernah memilih sendiri.
 *
 * Tinggal di sini, bukan di lib/mock, karena ini ATURAN permainan dan bukan
 * data tiruan: layar pengaturan, penyimpanan lokal, dan endpoint di server
 * sama-sama membacanya, dan tidak satu pun dari ketiganya boleh ikut menarik
 * data tiruan beserta seluruh peta dan roster lawannya.
 */
export const DEFAULT_MATCH_SETUP: { difficulty: Difficulty; botCount: number } = {
  difficulty: "normal",
  botCount: 4,
};
