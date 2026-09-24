import type { HistoryMatch, HistoryParticipant, HistoryRound } from "@/types/history";

/**
 * Riwayat pertandingan tiruan untuk fase frontend; nanti diganti respons
 * /api/riwayat. Dibangkitkan deterministik supaya prerender dan hidrasi sama.
 */
const BOTS = ["Bot Rangga", "Bot Ayu", "Bot Dimas", "Bot Sari", "Bot Bima"];
const ANCHOR = Date.UTC(2026, 8, 24, 9, 0, 0);
const HOUR = 60 * 60 * 1000;

function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function makeMatch(id: number): HistoryMatch {
  const random = seeded(id * 7919);
  const botCount = 3 + Math.floor(random() * 3);
  const names = ["Kamu", ...BOTS.slice(0, botCount)];
  const participants: HistoryParticipant[] = names.map((name) => {
    const kills = Math.floor(random() * (name === "Kamu" ? 22 : 14));
    return {
      name,
      isBot: name !== "Kamu",
      kills,
      deaths: Math.floor(random() * 12),
      score: kills * 100 + Math.floor(random() * 4) * 25,
      roundWins: 0,
      isWinner: false,
    };
  });
  const rounds: HistoryRound[] = Array.from({ length: 5 }, (_, index) => {
    const winner = participants[Math.floor(random() * participants.length)];
    winner.roundWins += 1;
    return {
      roundNumber: index + 1,
      winnerName: winner.name,
      endedReason: random() < 0.6 ? "batas_kill" : "waktu_habis",
      playerKills: Math.floor(random() * 6),
    };
  });
  const ranked = [...participants].sort((a, b) => b.roundWins - a.roundWins || b.kills - a.kills);
  ranked[0].isWinner = true;
  const local = participants[0];
  const result = ranked[0].name === "Kamu" ? "menang" : "kalah";
  const startedAt = ANCHOR - id * 5 * HOUR;
  return {
    id,
    mapId: id % 3 === 0 ? "map-pelabuhan-kabut" : "map-gudang-senja",
    mapName: id % 3 === 0 ? "Pelabuhan Kabut" : "Gudang Senja",
    difficulty: (["santai", "normal", "susah"] as const)[id % 3],
    botCount,
    totalRounds: 5,
    result,
    winnerName: ranked[0].name,
    bestStreak: Math.min(local.kills, 2 + Math.floor(random() * 6)),
    coinsEarned: 20 + (result === "menang" ? 40 : 0) + local.kills * 3 + local.roundWins * 10,
    startedAt,
    endedAt: startedAt + 11 * 60 * 1000,
    participants,
    rounds,
  };
}

export const MOCK_HISTORY: HistoryMatch[] = Array.from({ length: 9 }, (_, index) => makeMatch(index + 1));
