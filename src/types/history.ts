/**
 * Tipe riwayat pertandingan, mengikuti tabel `matches`, `match_scores`, dan
 * `match_rounds` supaya data tiruan bisa ditukar respons /api/riwayat.
 */
export interface HistoryParticipant {
  name: string;
  isBot: boolean;
  kills: number;
  deaths: number;
  score: number;
  roundWins: number;
  isWinner: boolean;
}

export interface HistoryRound {
  roundNumber: number;
  winnerName: string | null;
  endedReason: "batas_kill" | "waktu_habis" | "ditinggal";
  playerKills: number;
}

export interface HistoryMatch {
  id: number;
  mapId: string;
  mapName: string;
  difficulty: "santai" | "normal" | "susah";
  botCount: number;
  totalRounds: number;
  result: "menang" | "kalah" | "seri" | "ditinggal";
  winnerName: string | null;
  bestStreak: number;
  coinsEarned: number;
  startedAt: number;
  endedAt: number;
  participants: HistoryParticipant[];
  rounds: HistoryRound[];
}

/** Satu baris klasemen gabungan lintas pertandingan. */
export interface StandingRow {
  name: string;
  isBot: boolean;
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
  score: number;
  roundWins: number;
}
