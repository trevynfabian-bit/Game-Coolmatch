import { create } from "zustand";
import { DEFAULT_MATCH_RULES, type MatchRules } from "@/lib/mock/match";
import type { Difficulty } from "@/types/game";

/**
 * Aturan pertandingan uji coba.
 *
 * Jauh lebih singkat daripada pertandingan biasa: satu ronde, batas kill
 * rendah, dan waktu yang cukup untuk merasakan senjata tanpa mengikat pemain
 * selama belasan menit. Mencoba rasa sebuah senjata memang tidak butuh lima
 * ronde penuh.
 */
export const TRIAL_RULES: MatchRules = {
  ...DEFAULT_MATCH_RULES,
  totalRounds: 1,
  scoreLimit: 7,
  roundSeconds: 120,
};

/** Lawan pada pertandingan uji: cukup untuk ada yang ditembak, tidak menyesakkan. */
export const TRIAL_BOT_COUNT = 3;
export const TRIAL_DIFFICULTY: Difficulty = "normal";

export interface TrialMatch {
  weaponId: string;
}

interface TrialState {
  /** Uji coba yang sedang menunggu dimulai; null berarti tidak ada. */
  pending: TrialMatch | null;
  /** Menyiapkan uji coba, dipanggil layar Coba di Arena sebelum berpindah. */
  arm: (trial: TrialMatch) => void;
  /**
   * Mengambil uji coba yang menunggu DAN menghapusnya sekaligus.
   *
   * Sekali pakai, dan itu disengaja. Kalau tidak dihapus, pemain yang menekan
   * "Main lagi" atau membuka arena besok akan mendapat aturan uji coba lagi —
   * satu ronde tujuh kill — tanpa pernah memintanya, dan tanpa petunjuk kenapa
   * pertandingannya jadi sependek itu.
   */
  consume: () => TrialMatch | null;
}

/**
 * Uji coba sengaja TIDAK disimpan ke localStorage, berbeda dengan pilihan
 * senjata, peta, dan lawan. Ini bukan preferensi yang ingin diingat pemain,
 * melainkan niat sesaat yang berlaku untuk satu perjalanan ke arena saja.
 */
export const useTrialStore = create<TrialState>((set, get) => ({
  pending: null,
  arm: (trial) => set({ pending: trial }),
  consume: () => {
    const { pending } = get();
    if (pending) set({ pending: null });
    return pending;
  },
}));
