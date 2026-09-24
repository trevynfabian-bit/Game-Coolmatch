import type { Difficulty } from "@/types/game";

/**
 * Aturan perolehan koin dari satu pertandingan.
 *
 * Modul ini murni (tanpa database, tanpa React) supaya dipakai dua pihak
 * sekaligus: server memakainya untuk menghitung koin yang BENAR-BENAR masuk ke
 * dompet, dan layar akhir pertandingan memakainya untuk menampilkan rincian
 * yang sama persis. Angkanya tinggal diubah di sini tanpa menyentuh keduanya.
 */

/** Hasil pertandingan dari sudut pandang pemain; sama dengan kolom `matches.result`. */
export type MatchOutcome = "menang" | "kalah" | "seri" | "ditinggal";

/** Koin dasar sekadar karena menuntaskan pertandingan. */
export const COINS_FOR_FINISHING = 20;
/** Tambahan bila pemain juara pertandingan. */
export const COINS_FOR_WINNING = 40;
/** Tambahan untuk hasil seri. */
export const COINS_FOR_DRAW = 15;
/** Per kill pemain. */
export const COINS_PER_KILL = 3;
/** Per ronde yang dimenangkan. */
export const COINS_PER_ROUND_WIN = 10;

/**
 * Bonus kill beruntun: tiap ambang yang pernah dicapai dalam satu nyawa
 * memberi koin sekali. Ambangnya disamakan dengan hadiah killstreak (UAV 3,
 * serangan udara 5, helikopter 7) supaya pemain merasakan keduanya bersamaan.
 */
export const KILLSTREAK_BONUSES: ReadonlyArray<{ streak: number; coins: number }> = [
  { streak: 3, coins: 10 },
  { streak: 5, coins: 20 },
  { streak: 7, coins: 35 },
];

/** Pengali total menurut tingkat kesulitan lawan. */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  santai: 0.75,
  normal: 1,
  susah: 1.5,
};

/**
 * Batas atas koin satu pertandingan. Jaring pengaman terhadap fakta mentah
 * yang tidak masuk akal; pertandingan wajar tidak pernah menyentuhnya.
 */
export const MAX_COINS_PER_MATCH = 600;

export type CoinLineKind =
  | "pertandingan"
  | "bonus_kill"
  | "bonus_ronde"
  | "bonus_killstreak";

export interface CoinLine {
  kind: CoinLineKind;
  label: string;
  amount: number;
}

export interface MatchCoinFacts {
  outcome: MatchOutcome;
  difficulty: Difficulty;
  kills: number;
  roundWins: number;
  /** Kill beruntun terpanjang pemain dalam satu nyawa. */
  bestStreak: number;
}

export interface MatchCoinReward {
  lines: CoinLine[];
  /** Pengali kesulitan yang sudah diterapkan ke tiap baris. */
  multiplier: number;
  total: number;
}

function wholeNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Menghitung koin pertandingan beserta rinciannya.
 *
 * Pertandingan yang ditinggal tidak memberi apa-apa, supaya keluar di tengah
 * tidak bisa dipakai memanen koin. Pengali kesulitan diterapkan per baris lalu
 * dibulatkan, sehingga jumlah baris selalu sama dengan `total` yang tercatat.
 */
export function calculateMatchCoins(facts: MatchCoinFacts): MatchCoinReward {
  const multiplier = DIFFICULTY_MULTIPLIER[facts.difficulty] ?? 1;
  if (facts.outcome === "ditinggal") {
    return { lines: [], multiplier, total: 0 };
  }

  const kills = wholeNonNegative(facts.kills);
  const roundWins = wholeNonNegative(facts.roundWins);
  // Kill beruntun tidak mungkin melebihi total kill.
  const bestStreak = Math.min(wholeNonNegative(facts.bestStreak), kills);

  const raw: CoinLine[] = [];

  const resultBonus =
    facts.outcome === "menang"
      ? COINS_FOR_WINNING
      : facts.outcome === "seri"
        ? COINS_FOR_DRAW
        : 0;
  raw.push({
    kind: "pertandingan",
    label:
      facts.outcome === "menang"
        ? "Menang pertandingan"
        : facts.outcome === "seri"
          ? "Pertandingan seri"
          : "Menuntaskan pertandingan",
    amount: COINS_FOR_FINISHING + resultBonus,
  });

  if (kills > 0) {
    raw.push({
      kind: "bonus_kill",
      label: `${kills} kill`,
      amount: kills * COINS_PER_KILL,
    });
  }

  if (roundWins > 0) {
    raw.push({
      kind: "bonus_ronde",
      label: `${roundWins} ronde dimenangkan`,
      amount: roundWins * COINS_PER_ROUND_WIN,
    });
  }

  const streakCoins = KILLSTREAK_BONUSES.filter(
    (tier) => bestStreak >= tier.streak,
  ).reduce((sum, tier) => sum + tier.coins, 0);
  if (streakCoins > 0) {
    raw.push({
      kind: "bonus_killstreak",
      label: `Killstreak ${bestStreak}`,
      amount: streakCoins,
    });
  }

  let remaining = MAX_COINS_PER_MATCH;
  const lines: CoinLine[] = [];
  for (const line of raw) {
    const amount = Math.min(remaining, Math.round(line.amount * multiplier));
    if (amount <= 0) continue;
    lines.push({ ...line, amount });
    remaining -= amount;
  }

  return {
    lines,
    multiplier,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}
