/**
 * Bentuk terkecil yang dibutuhkan untuk menentukan pemenang satu RONDE.
 *
 * Sengaja bukan `Fighter`. Aturan juara berlaku di dua tempat yang datanya
 * berbeda bentuk — arena yang memegang petarung lengkap, dan server yang hanya
 * punya baris perolehan — dan keduanya harus memakai aturan yang SAMA persis.
 * Dengan bentuk sekecil ini, pemanggil tidak perlu mengarang petarung palsu
 * hanya agar lolos tipe, dan tidak ada godaan menuliskan ulang aturannya.
 */
export interface RoundStanding {
  roundKills: number;
  deaths: number;
}

/** Bentuk terkecil yang dibutuhkan untuk menentukan juara PERTANDINGAN. */
export interface MatchStanding {
  roundWins: number;
  kills: number;
  deaths: number;
}

/**
 * Pemenang satu ronde: kill terbanyak pada ronde itu, seri dipecah oleh jumlah
 * kematian yang lebih sedikit. Mengembalikan null bila benar-benar seri —
 * termasuk saat belum ada satu kill pun — supaya ronde kosong tidak memberi
 * kemenangan kepada siapa pun.
 *
 * Yang dikembalikan adalah peserta ASLI yang dioper, bukan salinan, sehingga
 * pemanggil bisa langsung membaca nama atau id miliknya sendiri.
 */
export function findRoundWinner<T extends RoundStanding>(fighters: T[]): T | null {
  let best: T | null = null;
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
  fighters: RoundStanding[],
  scoreLimit: number,
): boolean {
  if (scoreLimit <= 0) return false;
  return fighters.some((fighter) => fighter.roundKills >= scoreLimit);
}

/**
 * Pemenang pertandingan: ronde menang terbanyak, seri dipecah oleh total kill,
 * lalu oleh kematian yang lebih sedikit. Null bila masih seri sepenuhnya.
 */
export function findMatchWinner<T extends MatchStanding>(fighters: T[]): T | null {
  let best: T | null = null;
  let tied = false;

  const better = (a: MatchStanding, b: MatchStanding) => {
    if (a.roundWins !== b.roundWins) return a.roundWins > b.roundWins;
    if (a.kills !== b.kills) return a.kills > b.kills;
    return a.deaths < b.deaths;
  };
  const equal = (a: MatchStanding, b: MatchStanding) =>
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

/**
 * Benar bila gelar juara sudah tidak bisa berpindah lagi, walau masih ada ronde
 * tersisa: keunggulan pemimpin lebih besar daripada jumlah ronde yang belum
 * dimainkan, sehingga penantang terdekat tetap tidak bisa menyamainya meski
 * memenangi semuanya.
 *
 * Unggulnya harus BENAR-BENAR lebih banyak, bukan sekadar cukup untuk imbang:
 * kedudukan ronde yang sama dipecah oleh jumlah kill, dan kill masih bisa
 * bertambah selama masih ada ronde yang dimainkan — jadi selisih nol belum
 * memutuskan apa pun.
 *
 * `roundsPlayed` adalah jumlah ronde yang SUDAH selesai, termasuk ronde yang
 * baru saja ditutup.
 */
export function hasClinchedMatch(
  fighters: Pick<MatchStanding, "roundWins">[],
  roundsPlayed: number,
  totalRounds: number,
): boolean {
  if (fighters.length === 0) return false;

  const remaining = totalRounds - roundsPlayed;
  if (remaining <= 0) return true;

  // Cukup dua teratas: yang di bawahnya tertinggal lebih jauh lagi.
  let best = -1;
  let runnerUp = -1;
  for (const fighter of fighters) {
    if (fighter.roundWins > best) {
      runnerUp = best;
      best = fighter.roundWins;
    } else if (fighter.roundWins > runnerUp) {
      runnerUp = fighter.roundWins;
    }
  }

  // Bertanding seorang diri: tidak ada yang bisa mengambil gelarnya.
  if (runnerUp < 0) return true;

  return best > runnerUp + remaining;
}
