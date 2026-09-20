import { STARTING_ARMOR } from "@/lib/game/damage";
import { DEFAULT_MATCH_SETUP, clampBotCount } from "@/lib/game/difficulty";
import type {
  MatchSession,
  StartSessionRequest,
} from "@/lib/game/match-session";
import { pickSpawnPoint } from "@/lib/game/spawn";
import {
  botParticipants,
  botWeaponFor,
  buildBotRoster,
  facingCenter,
  maxBotsForMap,
} from "@/lib/mock/bots";
import { DEFAULT_MAP } from "@/lib/mock/maps";
import { DEFAULT_PLAYER_NAME } from "@/lib/game/player-name";
import { findWeapon } from "@/lib/mock/weapons";
import type {
  ArenaMapInfo,
  Difficulty,
  Fighter,
  MatchSnapshot,
  Vec3,
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
  /**
   * Nama pemain lokal. Bawaannya dipakai bila pemanggil belum tahu — layar
   * yang belum terhidrasi tidak boleh menyebut nama tersimpan.
   */
  playerName?: string;
  /**
   * Aturan pertandingan yang menggantikan aturan bawaan.
   *
   * Dibuka supaya pertandingan uji coba bisa jauh lebih singkat daripada
   * pertandingan sungguhan — mencoba rasa sebuah senjata tidak perlu lima ronde
   * berdurasi tiga menit. Yang tidak disebutkan tetap memakai aturan bawaan.
   */
  rules?: Partial<MatchRules>;
}

/** Aturan yang mengatur panjang sebuah pertandingan. */
export interface MatchRules {
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  intermissionSeconds: number;
}

/** Aturan pertandingan biasa. */
export const DEFAULT_MATCH_RULES: MatchRules = {
  totalRounds: TOTAL_ROUNDS,
  scoreLimit: SCORE_LIMIT,
  roundSeconds: ROUND_SECONDS,
  intermissionSeconds: INTERMISSION_SECONDS,
};

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
  rules,
  playerName = DEFAULT_PLAYER_NAME,
}: MatchSetup): MatchSnapshot {
  // Dijepit dua kali: ke rentang yang masuk akal, lalu ke apa yang muat di
  // peta ini. Angka kedua yang dilaporkan potret pertandingan, supaya HUD dan
  // papan skor tidak pernah menjanjikan lawan yang tidak muncul.
  const bots = Math.min(clampBotCount(botCount), maxBotsForMap(map));
  const weapon = findWeapon(weaponId ?? LOCAL_FIGHTER.weaponId);
  const aturan: MatchRules = { ...DEFAULT_MATCH_RULES, ...rules };

  const local: Fighter = {
    ...LOCAL_FIGHTER,
    // Namanya ikut ke seluruh potret: HUD, kill feed, dan papan skor semuanya
    // membacanya dari sini, jadi satu penggantian di sini sudah cukup.
    name: playerName,
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
      total: aturan.totalRounds,
      secondsLeft: aturan.roundSeconds,
      durationSeconds: aturan.roundSeconds,
      intermissionSeconds: aturan.intermissionSeconds,
      scoreLimit: aturan.scoreLimit,
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

/**
 * Permintaan membuka sesi untuk pengaturan ini: peserta pertama pemain lokal,
 * sisanya lawan otomatis dari template. Jumlah lawan dijepit ke yang muat di
 * peta, sama seperti potret pertandingan, supaya sesi dan arena tidak pernah
 * berselisih soal berapa lawan yang ada.
 */
export function buildStartRequest({
  difficulty,
  botCount,
  map = DEFAULT_MAP,
  rules,
  playerName = DEFAULT_PLAYER_NAME,
  isTrial = false,
}: MatchSetup & { isTrial?: boolean }): StartSessionRequest {
  const bots = Math.min(clampBotCount(botCount), maxBotsForMap(map));
  const aturan: MatchRules = { ...DEFAULT_MATCH_RULES, ...rules };
  return {
    mapId: map.id,
    difficulty,
    botCount: bots,
    totalRounds: aturan.totalRounds,
    scoreLimit: aturan.scoreLimit,
    roundSeconds: aturan.roundSeconds,
    participants: [
      { name: playerName, isBot: false, color: LOCAL_FIGHTER.color },
      ...botParticipants(bots, map),
    ],
    isTrial,
  };
}

/**
 * Potret pertandingan dari sebuah SESI: petarungnya dibangun dari daftar
 * pesaing sesi, bukan dari template lawan langsung.
 *
 * Sesi hanya tahu siapa yang bertanding dan berapa perolehannya; tempat
 * mereka berdiri, senjata bot, nyawa, dan rompi adalah urusan arena. Pemain
 * lokal mengambil titik spawn pertama, lawan menyebar ke titik terjauh dari
 * yang sudah terisi, dan semuanya menghadap ke tengah arena. Perolehan
 * (kill, kematian, skor, kemenangan ronde) disalin dari sesi, jadi sesi yang
 * sudah berjalan menghasilkan potret yang melanjutkannya, bukan mengulang
 * dari nol.
 */
export function snapshotFromSession(
  session: MatchSession,
  {
    map,
    weaponId,
    rules,
  }: {
    map: ArenaMapInfo;
    /** Senjata pemain lokal; bawaan mengikuti pemain lokal. */
    weaponId?: string;
    rules?: Partial<MatchRules>;
  },
): MatchSnapshot {
  const weapon = findWeapon(weaponId ?? LOCAL_FIGHTER.weaponId);
  const aturan: MatchRules = {
    ...DEFAULT_MATCH_RULES,
    ...rules,
    totalRounds: session.totalRounds,
    scoreLimit: session.scoreLimit,
    roundSeconds: session.roundSeconds,
  };

  const taken: Vec3[] = [];
  let botIndex = 0;
  const fighters: Fighter[] = session.competitors.map((competitor) => {
    const position: Vec3 = competitor.isLocal
      ? (map.spawnPoints[0] ?? LOCAL_FIGHTER.position)
      : pickSpawnPoint(map.spawnPoints, taken);
    taken.push(position);
    if (!competitor.isLocal) botIndex += 1;

    return {
      id: competitor.isLocal ? LOCAL_FIGHTER.id : `ftr-bot-${botIndex}`,
      name: competitor.name,
      team: competitor.isLocal ? "alpha" : "bravo",
      isLocal: competitor.isLocal,
      isBot: competitor.isBot,
      health: 100,
      maxHealth: 100,
      armor: STARTING_ARMOR,
      kills: competitor.kills,
      deaths: competitor.deaths,
      score: competitor.score,
      roundKills: 0,
      roundWins: competitor.roundWins,
      isAlive: true,
      respawnInSeconds: null,
      weaponId: competitor.isLocal ? weapon.id : botWeaponFor(competitor.name),
      color: competitor.color,
      position,
      rotationY: competitor.isLocal
        ? LOCAL_FIGHTER.rotationY
        : facingCenter(position),
    };
  });

  return {
    matchId: session.matchId,
    map,
    difficulty: session.difficulty,
    botCount: fighters.filter((fighter) => fighter.isBot).length,
    round: {
      current: 1,
      total: aturan.totalRounds,
      secondsLeft: aturan.roundSeconds,
      durationSeconds: aturan.roundSeconds,
      intermissionSeconds: aturan.intermissionSeconds,
      scoreLimit: aturan.scoreLimit,
      status: "warmup",
      lastRoundWinner: null,
      matchWinner: null,
    },
    fighters,
    killFeed: [],
    ammoInMagazine: weapon.magazineSize,
    ammoReserve: weapon.magazineSize * DEFAULT_RESERVE_MAGAZINES,
    pingMs: 0,
  };
}

/** Potret pertandingan bawaan. */
export const MOCK_MATCH: MatchSnapshot =
  buildMatchSnapshot(DEFAULT_MATCH_SETUP);

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
