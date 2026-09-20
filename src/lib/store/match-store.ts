import { create } from "zustand";
import type { RoundOutcome } from "@/lib/game/match-session";
import {
  STARTING_ARMOR,
  applyDamageToFighter,
  killScore,
} from "@/lib/game/damage";
import {
  findMatchWinner,
  findRoundWinner,
  hasClinchedMatch,
  hasReachedScoreLimit,
} from "@/lib/game/round";
import type {
  Fighter,
  KillFeedEntry,
  MatchResult,
  MatchRoundResult,
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
  /**
   * Naik tiap kali pertandingan disiapkan ulang. Dipakai RoundTicker untuk
   * tahu bahwa jam ronde harus disetel ulang, sebab matchId sendiri tidak
   * berubah saat pemain menekan "Main lagi".
   */
  generation: number;
  fighters: Fighter[];
  killFeed: KillFeedEntry[];
  round: RoundState;

  /**
   * Hasil tiap ronde yang sudah selesai, urut dari ronde pertama. Dikumpulkan
   * selama pertandingan berjalan karena `round` hanya menyimpan ronde yang
   * SEDANG berlangsung — tanpa catatan ini, ringkasan akhir tidak punya cara
   * menunjukkan jalannya pertandingan, hanya angka akhirnya.
   */
  roundResults: MatchRoundResult[];
  /**
   * Hasil akhir dari sudut pandang pemain, sebagaimana disimpulkan sesi saat
   * pertandingan ditutup; null selama pertandingan masih berjalan. Bila sesi
   * tidak menjawab, disimpulkan sendiri dengan aturan yang sama.
   */
  matchResult: MatchResult | null;

  /** Epoch milidetik saat pertandingan disiapkan; dipakai menghitung durasinya. */
  startedAt: number;
  /** Terisi saat pertandingan ditutup; null selama masih berjalan. */
  endedAt: number | null;

  /** Mengisi state dari potret pertandingan; dipanggil saat arena dibuka. */
  init: (snapshot: MatchSnapshot) => void;

  /**
   * Memulai pertandingan baru dari nol: semua perolehan dinolkan, ronde kembali
   * ke satu, dan semua petarung hidup penuh di titik spawn yang diberikan.
   * Berbeda dengan `init` yang memuat potret apa adanya, termasuk ronde yang
   * sedang berjalan.
   */
  startFreshMatch: (
    snapshot: MatchSnapshot,
    spawns: Record<string, Vec3>,
  ) => void;

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

  /** Mengganti senjata yang dipegang seorang petarung. */
  setFighterWeapon: (fighterId: string, weaponId: string) => void;

  /**
   * Menyalakan pertandingan yang masih menunggu di `warmup`, dipanggil saat
   * pemain benar-benar masuk arena. Jam ronde disetel penuh di sini supaya
   * detik yang dihitung adalah detik pemain bermain, bukan detik ia membaca
   * petunjuk kontrol.
   */
  beginMatch: () => void;

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
  /**
   * Menutup ronde yang berjalan. Bila sesi sudah menyimpulkannya, kesimpulan
   * itu yang dipakai: pemenang ronde, roster (kill, kematian, skor,
   * kemenangan ronde), dan apakah pertandingan selesai. Tanpa kesimpulan sesi,
   * arena menyimpulkan sendiri dengan aturan yang sama.
   */
  finishRound: (outcome?: RoundOutcome) => void;

  /**
   * Memulai ronde berikutnya: semua petarung hidup penuh di titik spawn yang
   * diberikan, kill ronde dinolkan, dan jam ronde disetel ulang.
   */
  beginNextRound: (spawns: Record<string, Vec3>) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matchId: "",
  generation: 0,
  fighters: [],
  killFeed: [],
  roundResults: [],
  matchResult: null,
  startedAt: 0,
  endedAt: null,
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
    set((state) => ({
      generation: state.generation + 1,
      matchId: snapshot.matchId,
      // Salinan dangkal supaya data tiruan yang diimpor tidak ikut berubah.
      fighters: snapshot.fighters.map((fighter) => ({ ...fighter })),
      killFeed: [...snapshot.killFeed],
      round: { ...snapshot.round },
      roundResults: [],
      matchResult: null,
      startedAt: Date.now(),
      endedAt: null,
    })),

  startFreshMatch: (snapshot, spawns) =>
    set((state) => ({
      generation: state.generation + 1,
      matchId: snapshot.matchId,
      killFeed: [],
      roundResults: [],
      matchResult: null,
      startedAt: Date.now(),
      endedAt: null,
      fighters: snapshot.fighters.map((fighter) => ({
        ...fighter,
        health: fighter.maxHealth,
        armor: STARTING_ARMOR,
        isAlive: true,
        respawnInSeconds: null,
        kills: 0,
        deaths: 0,
        score: 0,
        roundKills: 0,
        roundWins: 0,
        position: spawns[fighter.id] ?? fighter.position,
      })),
      round: {
        ...snapshot.round,
        current: 1,
        secondsLeft: snapshot.round.durationSeconds,
        // "Main lagi" melewati pintu masuk yang sama dengan pertandingan
        // pertama: kursor sudah dilepas saat layar akhir muncul, jadi jam
        // ronde menunggu sampai pemain menguncinya kembali.
        status: "warmup",
        lastRoundWinner: null,
        matchWinner: null,
      },
    })),

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

  setFighterWeapon: (fighterId, weaponId) =>
    set((state) => {
      const current = state.fighters.find((f) => f.id === fighterId);
      if (!current || current.weaponId === weaponId) return state;
      return {
        fighters: state.fighters.map((fighter) =>
          fighter.id === fighterId ? { ...fighter, weaponId } : fighter,
        ),
      };
    }),

  beginMatch: () =>
    set((state) => {
      if (state.round.status !== "warmup") return state;
      return {
        round: {
          ...state.round,
          secondsLeft: state.round.durationSeconds,
          status: "live",
        },
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

  finishRound: (outcome) =>
    set((state) => {
      if (state.round.status !== "live") return state;

      let winnerName: string | null;
      let fighters: Fighter[];
      let isDecided: boolean;
      let matchWinnerName: string | null;
      let matchResult: MatchResult | null;
      const localName = state.fighters.find((f) => f.isLocal)?.name ?? null;

      if (outcome) {
        /*
          Roster dari sesi: perolehan tiap petarung disalin dari baris
          bernama sama. Sesilah yang memegang kebenaran perolehan; arena
          hanya menampilkan dan melaporkan fakta.
        */
        winnerName = outcome.roundWinner;
        fighters = state.fighters.map((fighter) => {
          const line = outcome.scoreboard.find(
            (c) => c.participantName === fighter.name,
          );
          return line
            ? {
                ...fighter,
                kills: line.kills,
                deaths: line.deaths,
                score: line.score,
                roundWins: line.roundWins,
              }
            : fighter;
        });
        isDecided = outcome.matchEnded;
        matchWinnerName = outcome.matchWinner;
        matchResult = outcome.result;
      } else {
        const winner = findRoundWinner(state.fighters);
        winnerName = winner?.name ?? null;
        fighters = winner
          ? state.fighters.map((fighter) =>
              fighter.id === winner.id
                ? { ...fighter, roundWins: fighter.roundWins + 1 }
                : fighter,
            )
          : state.fighters;

        /**
         * Pertandingan selesai bukan hanya saat ronde habis, tetapi juga
         * begitu gelar tidak bisa berpindah lagi. Memainkan sisa ronde yang
         * sudah tidak mengubah apa pun cuma menahan pemain di arena yang
         * hasilnya sudah ditentukan.
         */
        const isLastRound = state.round.current >= state.round.total;
        isDecided =
          isLastRound ||
          hasClinchedMatch(fighters, state.round.current, state.round.total);
        matchWinnerName = isDecided
          ? (findMatchWinner(fighters)?.name ?? null)
          : null;
        matchResult = !isDecided
          ? null
          : !matchWinnerName
            ? "seri"
            : matchWinnerName === localName
              ? "menang"
              : "kalah";
      }

      /**
       * Sebab ronde ini berakhir. Diperiksa pada keadaan SEBELUM ronde ditutup
       * — `fighters` di atas sudah menerima kemenangan rondenya, tetapi kill
       * rondenya belum dinolkan, jadi batas kill masih terbaca apa adanya.
       */
      const roundResult: MatchRoundResult = {
        roundNumber: state.round.current,
        winnerName,
        endedReason: hasReachedScoreLimit(
          state.fighters,
          state.round.scoreLimit,
        )
          ? "batas_kill"
          : "waktu_habis",
        playerKills:
          state.fighters.find((fighter) => fighter.isLocal)?.roundKills ?? 0,
      };

      return {
        fighters,
        roundResults: [...state.roundResults, roundResult],
        matchResult: isDecided ? matchResult : null,
        endedAt: isDecided ? Date.now() : state.endedAt,
        round: {
          ...state.round,
          secondsLeft: isDecided ? 0 : state.round.intermissionSeconds,
          status: isDecided ? "ended" : "intermission",
          lastRoundWinner: winnerName,
          matchWinner: matchWinnerName,
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
          armor: STARTING_ARMOR,
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
                // Menghadap ke tengah arena, bukan ke arah terakhirnya yang
                // di titik spawn baru bisa saja menghadap tembok.
                rotationY: Math.atan2(-position[0], -position[2]),
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
