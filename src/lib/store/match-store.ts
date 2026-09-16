import { create } from "zustand";
import { applyDamageToFighter, killScore } from "@/lib/game/damage";
import type {
  Fighter,
  KillFeedEntry,
  MatchSnapshot,
  RoundState,
} from "@/types/game";

/** Jumlah entri kill feed yang disimpan; sisanya dibuang. */
const KILL_FEED_LIMIT = 8;

export interface DamageReport {
  targetId: string;
  targetName: string;
  /** Kerusakan yang benar-benar mengurangi nyawa. */
  healthLost: number;
  armorLost: number;
  isHeadshot: boolean;
  isLethal: boolean;
}

interface MatchState {
  matchId: string;
  fighters: Fighter[];
  killFeed: KillFeedEntry[];
  round: RoundState;

  /** Mengisi state dari potret pertandingan; dipanggil saat arena dibuka. */
  init: (snapshot: MatchSnapshot) => void;

  /**
   * Menerapkan satu tembakan pada seorang petarung. Mengembalikan laporan bila
   * tembakan itu berarti, atau null bila sasaran sudah tumbang lebih dulu —
   * misalnya butir shotgun kedua yang datang setelah butir pertama mematikan.
   */
  damageFighter: (input: {
    attackerId: string;
    targetId: string;
    damage: number;
    isHeadshot: boolean;
    weaponName: string;
  }) => DamageReport | null;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matchId: "",
  fighters: [],
  killFeed: [],
  round: { current: 1, total: 1, secondsLeft: 0, scoreLimit: 0, status: "warmup" },

  init: (snapshot) =>
    set({
      matchId: snapshot.matchId,
      // Salinan dangkal supaya data tiruan yang diimpor tidak ikut berubah.
      fighters: snapshot.fighters.map((fighter) => ({ ...fighter })),
      killFeed: [...snapshot.killFeed],
      round: { ...snapshot.round },
    }),

  damageFighter: ({ attackerId, targetId, damage, isHeadshot, weaponName }) => {
    const { fighters, killFeed, round } = get();
    const target = fighters.find((fighter) => fighter.id === targetId);
    if (!target || !target.isAlive) return null;

    const outcome = applyDamageToFighter(target, damage);
    if (outcome.healthLost === 0 && outcome.armorLost === 0) return null;

    const attacker = fighters.find((fighter) => fighter.id === attackerId);
    const nextFighters = fighters.map((fighter) => {
      if (fighter.id === targetId) return outcome.fighter;
      if (outcome.isLethal && fighter.id === attackerId) {
        return {
          ...fighter,
          kills: fighter.kills + 1,
          score: fighter.score + killScore(isHeadshot),
        };
      }
      return fighter;
    });

    const nextFeed = outcome.isLethal
      ? [
          {
            id: `kf-${Date.now()}-${targetId}`,
            killerName: attacker?.name ?? "Tidak dikenal",
            victimName: target.name,
            weaponName,
            isHeadshot,
            // Detik sejak ronde dimulai, dipakai kill feed untuk mengurutkan.
            atSecond: Math.max(0, round.secondsLeft),
          },
          ...killFeed,
        ].slice(0, KILL_FEED_LIMIT)
      : killFeed;

    set({ fighters: nextFighters, killFeed: nextFeed });

    return {
      targetId,
      targetName: target.name,
      healthLost: outcome.healthLost,
      armorLost: outcome.armorLost,
      isHeadshot,
      isLethal: outcome.isLethal,
    };
  },
}));

/**
 * Papan skor terurut: skor tertinggi dulu, seri dipecah oleh kematian.
 *
 * Sengaja fungsi biasa, bukan selector zustand: hasilnya array baru tiap
 * panggilan, yang di dalam useStore akan memicu render tanpa henti. Bungkus
 * dengan useMemo atas `fighters`.
 */
export function sortScoreboard(fighters: Fighter[]): Fighter[] {
  return [...fighters].sort((a, b) => b.score - a.score || a.deaths - b.deaths);
}
