import { STARTING_ARMOR } from "@/lib/game/damage";
import { DEFAULT_MATCH_SETUP, clampBotCount } from "@/lib/game/difficulty";
import { buildBotRoster, maxBotsForMap } from "@/lib/mock/bots";
import { DEFAULT_MAP } from "@/lib/mock/maps";
import { findWeapon } from "@/lib/mock/weapons";
import type {
  ArenaMapInfo,
  Difficulty,
  Fighter,
  MatchSnapshot,
} from "@/types/game";

/** Aturan pertandingan bawaan; nanti bisa diatur di layar pengaturan sendiri. */
const ROUND_SECONDS = 180;
const INTERMISSION_SECONDS = 6;
const TOTAL_ROUNDS = 5;
const SCORE_LIMIT = 15;
const DEFAULT_RESERVE_MAGAZINES = 3;

/**
 * Pemain lokal pada pertandingan baru: nyawa penuh, belum punya perolehan apa
 * pun. Titik spawn-nya dipesan lebih dulu supaya lawan tidak mengambilnya.
 */
const LOCAL_FIGHTER: Fighter = {
  id: "ftr-lokal",
  name: "Kamu",
  team: "alpha",
  isLocal: true,
  isBot: false,
  health: 100,
  maxHealth: 100,
  armor: STARTING_ARMOR,
  kills: 0,
  deaths: 0,
  score: 0,
  roundKills: 0,
  roundWins: 0,
  isAlive: true,
  respawnInSeconds: null,
  weaponId: "wpn-rifle-garuda",
  color: "#38bdf8",
  position: [-18.5, 0, 18.5],
  rotationY: -Math.PI / 4,
};

export interface MatchSetup {
  difficulty: Difficulty;
  botCount: number;
  /** Senjata yang dibawa pemain; bawaan mengikuti senjata pemain lokal. */
  weaponId?: string;
  map?: ArenaMapInfo;
}

/**
 * Menyusun potret pertandingan BARU dari pengaturan lawan yang dipilih pemain.
 *
 * Semua perolehan dimulai dari nol dan ronde dimulai dari satu — ini titik awal
 * sebuah pertandingan, bukan potret pertandingan yang sedang berjalan. Selama
 * layer backend belum ada, fungsi inilah yang berperan sebagai "membuat
 * pertandingan"; nanti tinggal diganti pemanggilan API yang mengembalikan
 * bentuk yang sama.
 */
export function buildMatchSnapshot({
  difficulty,
  botCount,
  weaponId,
  map = DEFAULT_MAP,
}: MatchSetup): MatchSnapshot {
  // Dijepit dua kali: ke rentang yang masuk akal, lalu ke apa yang muat di
  // peta ini. Angka kedua yang dilaporkan potret pertandingan, supaya HUD dan
  // papan skor tidak pernah menjanjikan lawan yang tidak muncul.
  const bots = Math.min(clampBotCount(botCount), maxBotsForMap(map));
  const weapon = findWeapon(weaponId ?? LOCAL_FIGHTER.weaponId);

  const local: Fighter = {
    ...LOCAL_FIGHTER,
    weaponId: weapon.id,
    position: map.spawnPoints[0] ?? LOCAL_FIGHTER.position,
  };

  return {
    matchId: `match-${map.id}-${difficulty}-${bots}`,
    map,
    difficulty,
    botCount: bots,
    round: {
      current: 1,
      total: TOTAL_ROUNDS,
      secondsLeft: ROUND_SECONDS,
      durationSeconds: ROUND_SECONDS,
      intermissionSeconds: INTERMISSION_SECONDS,
      scoreLimit: SCORE_LIMIT,
      // Pertandingan baru menunggu di garis start. Browser hanya mau mengunci
      // kursor sesudah gerakan pengguna, jadi selalu ada jeda antara arena
      // tampil dan pemain benar-benar bermain; jam ronde tidak boleh mengalir
      // selama jeda itu.
      status: "warmup",
      lastRoundWinner: null,
      matchWinner: null,
    },
    fighters: [local, ...buildBotRoster(bots, map, [local.position])],
    killFeed: [],
    ammoInMagazine: weapon.magazineSize,
    ammoReserve: weapon.magazineSize * DEFAULT_RESERVE_MAGAZINES,
    pingMs: 0,
  };
}

/** Potret pertandingan bawaan. */
export const MOCK_MATCH: MatchSnapshot = buildMatchSnapshot(DEFAULT_MATCH_SETUP);

/** Pemain lokal dari sebuah potret pertandingan. */
export function getLocalFighter(match: MatchSnapshot): Fighter {
  const local = match.fighters.find((fighter) => fighter.isLocal);
  if (!local) {
    throw new Error("Potret pertandingan tidak punya pemain lokal");
  }
  return local;
}

/** Papan skor terurut: skor tertinggi dulu, seri dipecah oleh kematian. */
export function getScoreboard(match: MatchSnapshot): Fighter[] {
  return [...match.fighters].sort(
    (a, b) => b.score - a.score || a.deaths - b.deaths,
  );
}
