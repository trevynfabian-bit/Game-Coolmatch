import type { HistoryMatch, StandingRow } from "@/types/history";

/**
 * Klasemen gabungan: jumlahkan perolehan tiap peserta (menurut nama) dari
 * seluruh pertandingan, lalu urutkan: kemenangan pertandingan, total kill,
 * rasio K/M. Pertandingan yang ditinggal tidak dihitung.
 */
export function buildStandings(matches: HistoryMatch[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const match of matches) {
    if (match.result === "ditinggal") continue;
    for (const p of match.participants) {
      const row = rows.get(p.name) ?? {
        name: p.name,
        isBot: p.isBot,
        matches: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        score: 0,
        roundWins: 0,
      };
      row.matches += 1;
      row.wins += p.isWinner ? 1 : 0;
      row.kills += p.kills;
      row.deaths += p.deaths;
      row.score += p.score;
      row.roundWins += p.roundWins;
      rows.set(p.name, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.wins - a.wins || b.kills - a.kills || kd(b) - kd(a));
}

export function kd(row: { kills: number; deaths: number }): number {
  return row.kills / Math.max(1, row.deaths);
}
