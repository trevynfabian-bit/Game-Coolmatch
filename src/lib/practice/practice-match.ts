import { RANGE_MAP, RANGE_SPAWN } from "@/lib/practice/range-map";
import type { MatchSnapshot, Weapon } from "@/types/game";

/** Cadangan peluru besar supaya latihan tidak terputus kehabisan amunisi. */
const PRACTICE_RESERVE = 999;

/**
 * Potret "pertandingan" untuk tempat latihan: hanya pemain lokal, tanpa lawan,
 * dengan ronde yang berstatus berjalan dan tanpa batas kill.
 *
 * Bentuknya sengaja tetap `MatchSnapshot` supaya sistem senjata yang sama
 * dengan arena bisa dipakai apa adanya — tanpa lawan, tidak ada sasaran
 * petarung dan tidak ada kerusakan yang diterapkan; tanpa RoundTicker, jam
 * rondenya tidak pernah berjalan.
 */
export function practiceMatch(weapon: Weapon): MatchSnapshot {
  return {
    matchId: "latihan",
    map: RANGE_MAP,
    difficulty: "santai",
    botCount: 0,
    round: {
      current: 1,
      total: 1,
      secondsLeft: 0,
      durationSeconds: 0,
      intermissionSeconds: 0,
      // Nol mematikan pengakhiran ronde karena batas kill.
      scoreLimit: 0,
      status: "live",
      lastRoundWinner: null,
      matchWinner: null,
    },
    fighters: [
      {
        id: "ftr-lokal",
        name: "Kamu",
        team: "alpha",
        isLocal: true,
        isBot: false,
        health: 100,
        maxHealth: 100,
        armor: 0,
        kills: 0,
        deaths: 0,
        score: 0,
        roundKills: 0,
        roundWins: 0,
        isAlive: true,
        respawnInSeconds: null,
        weaponId: weapon.id,
        color: "#38bdf8",
        position: RANGE_SPAWN,
        rotationY: Math.PI,
      },
    ],
    killFeed: [],
    ammoInMagazine: weapon.magazineSize,
    ammoReserve: PRACTICE_RESERVE,
    pingMs: 0,
  };
}
