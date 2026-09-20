import { botTuning, describeTuning } from "@/lib/game/bot-tuning";
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PROFILES,
  MAX_BOTS,
  MIN_BOTS,
} from "@/lib/game/difficulty";
import type { Difficulty } from "@/types/game";

/**
 * Satu tingkat kesulitan sebagaimana disajikan endpoint: sifat mentah profil
 * (reaksi, ketepatan, jeda tembak, keberanian) beserta angka perilaku yang
 * diturunkan darinya oleh peta penyetelan yang sama dengan yang dipakai arena.
 * Klien mana pun — layar pengaturan, arena, atau alat luar — membaca
 * definisi yang satu ini, jadi tidak ada dua versi "apa artinya Susah".
 */
export interface DifficultyLevelPayload {
  id: Difficulty;
  label: string;
  blurb: string;
  reactionSeconds: number;
  accuracy: number;
  fireIntervalSeconds: [number, number];
  aggression: number;
  tuning: {
    memorySeconds: number;
    turnSpeed: number;
    preferredRange: number;
    approachSpeed: number;
  };
  /** Kalimat ringkas yang sama dengan yang tampil di kartu tingkat. */
  facts: string[];
}

export function difficultyCatalogue(): DifficultyLevelPayload[] {
  return DIFFICULTY_ORDER.map((id) => {
    const profile = DIFFICULTY_PROFILES[id];
    const tuning = botTuning(profile);
    return {
      id,
      label: profile.label,
      blurb: profile.blurb,
      reactionSeconds: profile.reactionSeconds,
      accuracy: profile.accuracy,
      fireIntervalSeconds: [...profile.fireIntervalSeconds] as [number, number],
      aggression: profile.aggression,
      tuning: {
        memorySeconds: tuning.memorySeconds,
        turnSpeed: tuning.turnSpeed,
        preferredRange: tuning.preferredRange,
        approachSpeed: tuning.approachSpeed,
      },
      facts: describeTuning(profile),
    };
  });
}

/** Batas jumlah musuh yang berlaku di peta mana pun. */
export const BOT_LIMITS = { minBots: MIN_BOTS, maxBots: MAX_BOTS } as const;
