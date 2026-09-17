import { DEFAULT_MAP } from "@/lib/mock/maps";
import type {
  Difficulty,
  MatchRecord,
  MatchResult,
  MatchScoreLine,
} from "@/types/game";

/**
 * Riwayat pertandingan tiruan untuk halaman Skor Pertandingan.
 *
 * Bentuknya mengikuti gabungan tabel `matches` dan `match_scores`, jadi task
 * backend nanti tinggal menukar `MOCK_MATCH_HISTORY` dengan hasil pengambilan
 * dua tabel itu tanpa menyentuh satu pun komponen.
 */

/** Warna penanda tiap peserta, disamakan dengan warnanya di arena. */
const COLORS: Record<string, string> = {
  Kamu: "#38bdf8",
  "Bot Rangga": "#f97316",
  "Bot Ayu": "#f43f5e",
  "Bot Dimas": "#a855f7",
  "Bot Sari": "#22c55e",
  "Bot Bima": "#eab308",
  "Bot Nadia": "#14b8a6",
  "Bot Reza": "#ec4899",
  "Bot Wulan": "#8b5cf6",
};

/**
 * Waktu pertandingan sebagai epoch milidetik, ditulis dalam jam WIB.
 *
 * Sengaja angka TETAP, bukan turunan `Date.now()`: halaman skor dirender di
 * server lebih dulu lalu dihidrasi di browser, dan waktu yang bergerak di
 * antara keduanya membuat teks hasil render server berbeda dari hasil hidrasi.
 */
function wib(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  // WIB adalah UTC+7, jadi jam UTC-nya mundur tujuh jam. Nilai negatif ditangani
  // Date.UTC sendiri dengan menggeser tanggalnya, jadi aman untuk dini hari.
  return Date.UTC(year, month - 1, day, hour - 7, minute);
}

/** Satu baris perolehan peserta; `score` mengikuti 100 per kill + 25 per headshot. */
function line(
  matchId: string,
  participantName: string,
  stats: {
    kills: number;
    deaths: number;
    score: number;
    roundWins: number;
    isWinner?: boolean;
  },
): MatchScoreLine {
  const isLocal = participantName === "Kamu";
  return {
    id: `${matchId}-${participantName.toLowerCase().replace(/\s+/g, "-")}`,
    participantName,
    isBot: !isLocal,
    isLocal,
    kills: stats.kills,
    deaths: stats.deaths,
    score: stats.score,
    roundWins: stats.roundWins,
    isWinner: stats.isWinner ?? false,
    color: COLORS[participantName] ?? "#94a3b8",
  };
}

function record(
  id: string,
  base: {
    difficulty: Difficulty;
    botCount: number;
    roundsPlayed: number;
    result: MatchResult;
    winnerName: string | null;
    startedAt: number;
    endedAt: number;
  },
  scores: MatchScoreLine[],
): MatchRecord {
  return {
    id,
    mapId: DEFAULT_MAP.id,
    mapName: DEFAULT_MAP.name,
    totalRounds: 5,
    scoreLimit: 15,
    ...base,
    scores,
  };
}

/**
 * Enam pertandingan terakhir, terbaru di depan. Sengaja beragam — menang telak
 * yang terkunci sebelum ronde habis, kalah, seri, sampai yang ditinggal di
 * tengah jalan — supaya setiap keadaan yang harus ditangani halaman skor
 * benar-benar punya contohnya.
 */
export const MOCK_MATCH_HISTORY: MatchRecord[] = [
  record(
    "mtc-006",
    {
      difficulty: "normal",
      botCount: 3,
      roundsPlayed: 3,
      result: "menang",
      winnerName: "Kamu",
      startedAt: wib(2026, 9, 17, 14, 12),
      endedAt: wib(2026, 9, 17, 14, 31),
    },
    [
      line("mtc-006", "Kamu", { kills: 24, deaths: 9, score: 2550, roundWins: 3, isWinner: true }),
      line("mtc-006", "Bot Rangga", { kills: 8, deaths: 11, score: 800, roundWins: 0 }),
      line("mtc-006", "Bot Ayu", { kills: 6, deaths: 10, score: 600, roundWins: 0 }),
      line("mtc-006", "Bot Dimas", { kills: 5, deaths: 9, score: 500, roundWins: 0 }),
    ],
  ),
  record(
    "mtc-005",
    {
      difficulty: "susah",
      botCount: 3,
      roundsPlayed: 5,
      result: "kalah",
      winnerName: "Bot Dimas",
      startedAt: wib(2026, 9, 16, 21, 40),
      endedAt: wib(2026, 9, 16, 22, 13),
    },
    [
      line("mtc-005", "Bot Dimas", { kills: 31, deaths: 18, score: 3225, roundWins: 3, isWinner: true }),
      line("mtc-005", "Kamu", { kills: 22, deaths: 24, score: 2300, roundWins: 1 }),
      line("mtc-005", "Bot Bima", { kills: 19, deaths: 21, score: 1950, roundWins: 1 }),
      line("mtc-005", "Bot Sari", { kills: 14, deaths: 23, score: 1400, roundWins: 0 }),
    ],
  ),
  record(
    "mtc-004",
    {
      difficulty: "normal",
      botCount: 2,
      roundsPlayed: 5,
      result: "menang",
      winnerName: "Kamu",
      startedAt: wib(2026, 9, 16, 19, 5),
      endedAt: wib(2026, 9, 16, 19, 36),
    },
    [
      line("mtc-004", "Kamu", { kills: 28, deaths: 19, score: 2925, roundWins: 3, isWinner: true }),
      line("mtc-004", "Bot Ayu", { kills: 25, deaths: 21, score: 2575, roundWins: 2 }),
      line("mtc-004", "Bot Nadia", { kills: 17, deaths: 22, score: 1700, roundWins: 0 }),
    ],
  ),
  record(
    "mtc-003",
    {
      difficulty: "normal",
      botCount: 2,
      roundsPlayed: 5,
      result: "seri",
      winnerName: null,
      startedAt: wib(2026, 9, 15, 20, 18),
      endedAt: wib(2026, 9, 15, 20, 52),
    },
    [
      line("mtc-003", "Kamu", { kills: 20, deaths: 20, score: 2050, roundWins: 2 }),
      line("mtc-003", "Bot Bima", { kills: 20, deaths: 20, score: 2050, roundWins: 2 }),
      line("mtc-003", "Bot Wulan", { kills: 12, deaths: 18, score: 1200, roundWins: 0 }),
    ],
  ),
  record(
    "mtc-002",
    {
      difficulty: "santai",
      botCount: 2,
      roundsPlayed: 2,
      result: "ditinggal",
      winnerName: null,
      startedAt: wib(2026, 9, 14, 16, 2),
      endedAt: wib(2026, 9, 14, 16, 14),
    },
    [
      line("mtc-002", "Bot Reza", { kills: 11, deaths: 9, score: 1125, roundWins: 1 }),
      line("mtc-002", "Kamu", { kills: 9, deaths: 8, score: 950, roundWins: 1 }),
      line("mtc-002", "Bot Sari", { kills: 6, deaths: 9, score: 600, roundWins: 0 }),
    ],
  ),
  record(
    "mtc-001",
    {
      difficulty: "susah",
      botCount: 3,
      roundsPlayed: 5,
      result: "kalah",
      winnerName: "Bot Wulan",
      startedAt: wib(2026, 9, 13, 10, 25),
      endedAt: wib(2026, 9, 13, 11, 1),
    },
    [
      line("mtc-001", "Bot Wulan", { kills: 26, deaths: 20, score: 2700, roundWins: 3, isWinner: true }),
      line("mtc-001", "Bot Rangga", { kills: 22, deaths: 19, score: 2275, roundWins: 1 }),
      line("mtc-001", "Kamu", { kills: 18, deaths: 27, score: 1875, roundWins: 1 }),
      line("mtc-001", "Bot Dimas", { kills: 15, deaths: 22, score: 1500, roundWins: 0 }),
    ],
  ),
];

/** Pertandingan paling akhir, atau undefined bila pemain belum pernah bertanding. */
export const MOCK_LATEST_MATCH: MatchRecord | undefined = MOCK_MATCH_HISTORY[0];
