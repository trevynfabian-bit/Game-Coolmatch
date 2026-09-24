import type { Fighter } from "@/types/game";

/**
 * Pemenang satu ronde: kill terbanyak pada ronde itu, seri dipecah oleh jumlah
 * kematian yang lebih sedikit. Mengembalikan null bila benar-benar seri —
 * termasuk saat belum ada satu kill pun — supaya ronde kosong tidak memberi
 * kemenangan kepada siapa pun.
 */
export function findRoundWinner(fighters: Fighter[]): Fighter | null {
  let best: Fighter | null = null;
  let tied = false;

  for (const fighter of fighters) {
    if (!best) {
      best = fighter;
      continue;
    }
    if (fighter.roundKills > best.roundKills) {
      best = fighter;
      tied = false;
    } else if (fighter.roundKills === best.roundKills) {
      if (fighter.deaths < best.deaths) {
        best = fighter;
        tied = false;
      } else if (fighter.deaths === best.deaths) {
        tied = true;
      }
    }
  }

  if (!best || tied || best.roundKills === 0) return null;
  return best;
}

/** Benar bila ada yang sudah mencapai batas kill ronde ini. */
export function hasReachedScoreLimit(
  fighters: Fighter[],
  scoreLimit: number,
): boolean {
  if (scoreLimit <= 0) return false;
  return fighters.some((fighter) => fighter.roundKills >= scoreLimit);
}

/**
 * Pemenang pertandingan: ronde menang terbanyak, seri dipecah oleh total kill,
 * lalu oleh kematian yang lebih sedikit. Null bila masih seri sepenuhnya.
 *
 * Hanya membaca tiga angka perolehan, jadi dipakai juga oleh server untuk
 * menentukan juara dari fakta mentah yang dikirim klien.
 */
type MatchStanding = Pick<Fighter, "roundWins" | "kills" | "deaths">;

export function findMatchWinner<T extends MatchStanding>(fighters: T[]): T | null {
  let best: T | null = null;
  let tied = false;

  const better = (a: T, b: T) => {
    if (a.roundWins !== b.roundWins) return a.roundWins > b.roundWins;
    if (a.kills !== b.kills) return a.kills > b.kills;
    return a.deaths < b.deaths;
  };
  const equal = (a: T, b: T) =>
    a.roundWins === b.roundWins && a.kills === b.kills && a.deaths === b.deaths;

  for (const fighter of fighters) {
    if (!best) {
      best = fighter;
      continue;
    }
    if (better(fighter, best)) {
      best = fighter;
      tied = false;
    } else if (equal(fighter, best)) {
      tied = true;
    }
  }

  return !best || tied ? null : best;
}
