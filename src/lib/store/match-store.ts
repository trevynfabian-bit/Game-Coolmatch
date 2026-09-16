import { create } from "zustand";
import { applyDamageToFighter, killScore } from "@/lib/game/damage";
import {
  findMatchWinner,
  findRoundWinner,
  hasReachedScoreLimit,
} from "@/lib/game/round";
import type {
  Fighter,
  KillFeedEntry,
  MatchSnapshot,
  RoundState,
  Vec3,
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

  /**
   * Memperbarui detik bulat yang ditampilkan HUD. Hitung mundur pecahan yang
   * sebenarnya hidup di respawn-runtime supaya HUD cukup render sekali per
   * detik, bukan tiap frame.
   */
  setRespawnCountdown: (fighterId: string, seconds: number) => void;

  /** Menghidupkan kembali petarung di titik spawn yang diberikan. */
  respawnFighter: (fighterId: string, position: Vec3) => void;

  /** Memperbarui detik bulat pada jam ronde. */
  setRoundClock: (seconds: number) => void;

  /**
   * Benar bila ronde sekarang sudah harus berakhir: waktu habis atau ada yang
   * mencapai batas kill.
   */
  shouldEndRound: () => boolean;

  /**
   * Menutup ronde berjalan: menetapkan pemenangnya, menambah roundWins, lalu
   * masuk jeda antar ronde. Bila ini ronde terakhir, pertandingan diakhiri.
   */
  finishRound: () => void;

  /**
   * Memulai ronde berikutnya: semua petarung hidup penuh di titik spawn yang
   * diberikan, kill ronde dinolkan, dan jam ronde disetel ulang.
   */
  beginNextRound: (spawns: Record<string, Vec3>) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matchId: "",
  fighters: [],
  killFeed: [],
  round: {
    current: 1,
    total: 1,
    secondsLeft: 0,
    durationSeconds: 0,
    intermissionSeconds: 0,
    scoreLimit: 0,
    status: "warmup",
    lastRoundWinner: null,
    matchWinner: null,
  },

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
          roundKills: fighter.roundKills + 1,
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

  setRespawnCountdown: (fighterId, seconds) =>
    set((state) => {
      const current = state.fighters.find((f) => f.id === fighterId);
      if (!current || current.respawnInSeconds === seconds) return state;
      return {
        fighters: state.fighters.map((fighter) =>
          fighter.id === fighterId
            ? { ...fighter, respawnInSeconds: seconds }
            : fighter,
        ),
      };
    }),

  setRoundClock: (seconds) =>
    set((state) =>
      state.round.secondsLeft === seconds
        ? state
        : { round: { ...state.round, secondsLeft: seconds } },
    ),

  shouldEndRound: () => {
    const { round, fighters } = get();
    if (round.status !== "live") return false;
    return (
      round.secondsLeft <= 0 || hasReachedScoreLimit(fighters, round.scoreLimit)
    );
  },

  finishRound: () =>
    set((state) => {
      if (state.round.status !== "live") return state;

      const winner = findRoundWinner(state.fighters);
      const fighters = winner
        ? state.fighters.map((fighter) =>
            fighter.id === winner.id
              ? { ...fighter, roundWins: fighter.roundWins + 1 }
              : fighter,
          )
        : state.fighters;

      const isLastRound = state.round.current >= state.round.total;

      return {
        fighters,
        round: {
          ...state.round,
          secondsLeft: isLastRound ? 0 : state.round.intermissionSeconds,
          status: isLastRound ? "ended" : "intermission",
          lastRoundWinner: winner?.name ?? null,
          matchWinner: isLastRound ? (findMatchWinner(fighters)?.name ?? null) : null,
        },
      };
    }),

  beginNextRound: (spawns) =>
    set((state) => {
      if (state.round.status !== "intermission") return state;
      return {
        fighters: state.fighters.map((fighter) => ({
          ...fighter,
          health: fighter.maxHealth,
          armor: 0,
          isAlive: true,
          respawnInSeconds: null,
          roundKills: 0,
          position: spawns[fighter.id] ?? fighter.position,
        })),
        round: {
          ...state.round,
          current: state.round.current + 1,
          secondsLeft: state.round.durationSeconds,
          status: "live",
          lastRoundWinner: null,
        },
      };
    }),

  respawnFighter: (fighterId, position) =>
    set((state) => {
      const current = state.fighters.find((f) => f.id === fighterId);
      if (!current || current.isAlive) return state;
      return {
        fighters: state.fighters.map((fighter) =>
          fighter.id === fighterId
            ? {
                ...fighter,
                health: fighter.maxHealth,
                // Rompi tidak ikut pulih: pemain harus menjaganya.
                armor: 0,
                isAlive: true,
                respawnInSeconds: null,
                position: [...position] as Vec3,
              }
            : fighter,
        ),
      };
    }),
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
