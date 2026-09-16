import type { Fighter, KillFeedEntry, MatchSnapshot } from "@/types/game";
import { DEFAULT_MAP } from "@/lib/mock/maps";

/**
 * Peserta pertandingan tiruan: satu pemain lokal dan empat musuh otomatis.
 * Posisi sengaja disebar di sekitar panggung tengah supaya arena terlihat
 * ramai saat halaman dibuka.
 */
const MOCK_FIGHTERS: Fighter[] = [
  {
    id: "ftr-lokal",
    name: "Kamu",
    team: "alpha",
    isLocal: true,
    isBot: false,
    health: 78,
    maxHealth: 100,
    armor: 35,
    kills: 7,
    deaths: 4,
    score: 700,
    isAlive: true,
    respawnInSeconds: null,
    weaponId: "wpn-rifle-garuda",
    color: "#38bdf8",
    position: [-18.5, 0, 18.5],
    rotationY: -Math.PI / 4,
  },
  {
    id: "ftr-bot-1",
    name: "Bot Rangga",
    team: "bravo",
    isLocal: false,
    isBot: true,
    health: 100,
    maxHealth: 100,
    armor: 0,
    kills: 6,
    deaths: 5,
    score: 600,
    isAlive: true,
    respawnInSeconds: null,
    weaponId: "wpn-smg-vektor",
    color: "#f97316",
    position: [-7.5, 0, -6],
    rotationY: Math.PI * 0.2,
  },
  {
    id: "ftr-bot-2",
    name: "Bot Ayu",
    team: "bravo",
    isLocal: false,
    isBot: true,
    health: 42,
    maxHealth: 100,
    armor: 20,
    kills: 5,
    deaths: 6,
    score: 500,
    isAlive: true,
    respawnInSeconds: null,
    weaponId: "wpn-shotgun-badai",
    color: "#f43f5e",
    position: [11, 0, -11],
    rotationY: -Math.PI * 0.65,
  },
  {
    id: "ftr-bot-3",
    name: "Bot Dimas",
    team: "bravo",
    isLocal: false,
    isBot: true,
    health: 0,
    maxHealth: 100,
    armor: 0,
    kills: 3,
    deaths: 8,
    score: 300,
    isAlive: false,
    respawnInSeconds: 3,
    weaponId: "wpn-sniper-elang",
    color: "#a855f7",
    position: [-11, 0, -13],
    rotationY: Math.PI * 0.5,
  },
  {
    id: "ftr-bot-4",
    name: "Bot Sari",
    team: "bravo",
    isLocal: false,
    isBot: true,
    health: 91,
    maxHealth: 100,
    armor: 10,
    kills: 4,
    deaths: 5,
    score: 400,
    isAlive: true,
    respawnInSeconds: null,
    weaponId: "wpn-pistol-p9",
    color: "#22c55e",
    position: [4, 2, 2],
    rotationY: -Math.PI * 0.25,
  },
];

const MOCK_KILL_FEED: KillFeedEntry[] = [
  {
    id: "kf-1",
    killerName: "Kamu",
    victimName: "Bot Dimas",
    weaponName: "Garuda AR",
    isHeadshot: true,
    atSecond: 148,
  },
  {
    id: "kf-2",
    killerName: "Bot Rangga",
    victimName: "Bot Sari",
    weaponName: "Vektor Cepat",
    isHeadshot: false,
    atSecond: 141,
  },
  {
    id: "kf-3",
    killerName: "Bot Ayu",
    victimName: "Kamu",
    weaponName: "Badai 12",
    isHeadshot: false,
    atSecond: 133,
  },
  {
    id: "kf-4",
    killerName: "Kamu",
    victimName: "Bot Rangga",
    weaponName: "Garuda AR",
    isHeadshot: false,
    atSecond: 126,
  },
];

/**
 * Potret pertandingan tiruan yang dipakai seluruh HUD arena selama layer
 * frontend. Satu objek ini nanti diganti respons endpoint pertandingan.
 */
export const MOCK_MATCH: MatchSnapshot = {
  matchId: "match-tiruan-001",
  map: DEFAULT_MAP,
  difficulty: "normal",
  botCount: 4,
  round: {
    current: 2,
    total: 5,
    secondsLeft: 154,
    scoreLimit: 15,
    status: "live",
  },
  fighters: MOCK_FIGHTERS,
  killFeed: MOCK_KILL_FEED,
  ammoInMagazine: 19,
  ammoReserve: 90,
  pingMs: 24,
};

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
