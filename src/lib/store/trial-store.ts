import { create } from "zustand";
import type { Difficulty } from "@/types/game";

/**
 * Pengaturan mode uji coba senjata: simulasi kilat satu ronde untuk merasakan
 * senjata apa pun — termasuk yang belum terbuka — tanpa menyentuh progres.
 */
export const TRIAL_ROUND_SECONDS = 60;
export const TRIAL_SCORE_LIMIT = 10;

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
