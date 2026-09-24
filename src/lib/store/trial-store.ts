import { create } from "zustand";
import { MATCH_RULES } from "@/lib/game/match-rules";
import type { Difficulty } from "@/types/game";

/**
 * Pengaturan mode uji coba senjata: simulasi kilat satu ronde untuk merasakan
 * senjata apa pun — termasuk yang belum terbuka — tanpa menyentuh progres.
 */
export const TRIAL_ROUND_SECONDS = MATCH_RULES.uji_coba.roundSeconds;
export const TRIAL_SCORE_LIMIT = MATCH_RULES.uji_coba.scoreLimit;

interface TrialState {
  weaponId: string;
  botCount: number;
  difficulty: Difficulty;
  setWeapon: (weaponId: string) => void;
  setBotCount: (count: number) => void;
  setDifficulty: (difficulty: Difficulty) => void;
}

export const useTrialStore = create<TrialState>((set) => ({
  weaponId: "wpn-sniper-elang",
  botCount: 3,
  difficulty: "santai",
  setWeapon: (weaponId) => set({ weaponId }),
  setBotCount: (count) => set({ botCount: Math.max(1, Math.min(6, Math.round(count))) }),
  setDifficulty: (difficulty) => set({ difficulty }),
}));
