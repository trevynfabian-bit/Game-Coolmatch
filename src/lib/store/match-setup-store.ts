import { create } from "zustand";
import { clampBotCount } from "@/lib/game/difficulty";
import { DEFAULT_MATCH_SETUP } from "@/lib/mock/match";
import type { Difficulty } from "@/types/game";

/**
 * Pengaturan lawan yang dipilih pemain sebelum bertanding: tingkat kesulitan
 * dan jumlah musuh otomatis. Dibaca arena saat pertandingan disusun.
 */
interface MatchSetupState {
  difficulty: Difficulty;
  botCount: number;
  setDifficulty: (difficulty: Difficulty) => void;
  /** Jumlah musuh selalu dijepit ke rentang yang didukung peta. */
  setBotCount: (count: number) => void;
}

export const useMatchSetupStore = create<MatchSetupState>((set) => ({
  difficulty: DEFAULT_MATCH_SETUP.difficulty,
  botCount: DEFAULT_MATCH_SETUP.botCount,

  setDifficulty: (difficulty) =>
    set((state) => (state.difficulty === difficulty ? state : { difficulty })),

  setBotCount: (count) =>
    set((state) => {
      const botCount = clampBotCount(count);
      return state.botCount === botCount ? state : { botCount };
    }),
}));
