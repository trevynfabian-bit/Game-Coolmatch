import { DEFAULT_MATCH_RULES, type MatchRules } from "@/lib/mock/match";
import type { Difficulty } from "@/types/game";

/**
 * Aturan pertandingan uji coba senjata — satu-satunya tempat angkanya ditulis.
 *
 * Jauh lebih singkat daripada pertandingan biasa: satu ronde, batas kill
 * rendah, dan waktu yang cukup untuk merasakan senjata tanpa mengikat pemain
 * selama belasan menit. Mencoba rasa sebuah senjata memang tidak butuh lima
 * ronde penuh.
 *
 * Diangkat dari store klien ke sini karena server kini ikut menyusun
 * pertandingan uji. Dua salinan aturan yang sama adalah dua angka yang bisa
 * berselisih, dan yang kalah adalah pemain yang dijanjikan satu ronde oleh
 * layar uji lalu menemukan pertandingan lima ronde saat masuk arena.
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
