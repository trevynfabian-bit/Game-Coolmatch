import type { CoinReason } from "@/lib/game/wallet";
import type { MatchResult } from "@/types/game";

/**
 * Berapa koin yang didapat pemain dari satu pertandingan, dan dari mana
 * masing-masing datang.
 *
 * Dua keputusan menentukan isi berkas ini.
 *
 * PERTAMA, kalah tetap dibayar. Pertandingan yang tidak menghasilkan apa-apa
 * saat kalah mengajari pemain hal yang salah: begitu ketinggalan jauh, cara
 * paling menguntungkan adalah keluar dan memulai pertandingan baru melawan
 * lawan yang lebih mudah. Imbalan dasarnya karena itu dibayar untuk
 * MENYELESAIKAN pertandingan, dan kemenangan menambah di atasnya.
 *
 * KEDUA, perolehannya selalu dirinci, tidak pernah hanya totalnya. Angka
 * tanpa rincian tidak bisa diperiksa pemain — ia hanya bisa menerima atau
 * curiga — dan yang lebih penting, pemain yang tidak tahu apa yang dibayar
 * tidak akan pernah mengejarnya. Rincian inilah yang mengubah koin dari
 * hadiah menjadi sasaran.
 *
 * Sebabnya memakai kosakata yang sama dengan riwayat dompet, bukan daftar
 * tersendiri. Layar akhir pertandingan dan baris di dompet menceritakan
 * kejadian yang sama; dua kosakata untuk satu kejadian berarti pemain membaca
 * "Bonus kill" di satu layar dan sesuatu yang lain di layar berikutnya.
 */

/**
 * Tarif koin. Bilangan bulat semua — koin adalah benda yang dihitung, dan
 * tarif pecahan hanya melahirkan pembulatan yang harus dijelaskan.
 */
export const COIN_RATES = {
  /** Menyelesaikan pertandingan, menang atau kalah. */
  finish: 60,
  /** Tambahan bila pemain keluar sebagai juara. */
  win: 120,
  /** Tiap lawan yang ditumbangkan. */
  perKill: 10,
  /** Tiap ronde yang dimenangkan. */
  perRoundWin: 30,
  /** Rentetan kill mulai dihitung dari kill ke berapa. */
  streakFrom: 3,
  /** Tiap kill di dalam rentetan, terhitung dari ambang di atas. */
  perStreakKill: 20,
} as const;

export interface MatchCoinFacts {
  /** Hasil akhir dari sudut pandang pemain; null bila belum tersimpul. */
  result: MatchResult | null;
  kills: number;
  roundWins: number;
  /**
   * Rentetan kill terbaik tanpa mati sepanjang pertandingan.
   *
   * Nol berarti tidak ada yang dilaporkan — dan itu keadaan yang wajar hari
   * ini, sebab rentetan kill baru dihitung pada fase killstreak. Tarifnya
   * sudah berdiri di sini supaya keduanya tidak nanti ditulis dua kali
   * dengan angka yang berbeda.
   */
  bestStreak?: number;
  /**
   * Pertandingan uji coba tidak menghasilkan koin sama sekali. Uji coba
   * memang tidak mengubah progres apa pun; membayarinya berarti membuka jalan
   * mengumpulkan koin tanpa pernah benar-benar bertanding.
   */
  isTrial?: boolean;
}

export interface CoinRewardLine {
  reason: CoinReason;
  /** Nama baris ini di layar. */
  label: string;
  /** Keterangan singkat: dari apa angkanya dihitung. */
  detail: string;
  amount: number;
}

export interface MatchCoinReward {
  lines: CoinRewardLine[];
  total: number;
}

function bulat(nilai: number | undefined): number {
  if (typeof nilai !== "number" || !Number.isFinite(nilai)) return 0;
  return Math.max(0, Math.floor(nilai));
}

/**
 * Perolehan koin sebuah pertandingan, lengkap dengan rinciannya.
 *
 * Baris yang bernilai nol TIDAK ikut ditulis. Pemain yang tidak memenangkan
 * satu ronde pun tidak perlu membaca "Bonus ronde 0"; baris kosong hanya
 * memanjangkan daftar dan mengaburkan baris yang benar-benar berisi.
 */
export function matchCoinReward(facts: MatchCoinFacts): MatchCoinReward {
  if (facts.isTrial) return { lines: [], total: 0 };

  const kills = bulat(facts.kills);
  const roundWins = bulat(facts.roundWins);
  const streak = bulat(facts.bestStreak);
  const menang = facts.result === "menang";

  const lines: CoinRewardLine[] = [];

  lines.push({
    reason: "hasil-match",
    label: menang ? "Menang bertanding" : "Menyelesaikan pertandingan",
    detail: menang
      ? `Imbalan dasar ${COIN_RATES.finish} + bonus juara ${COIN_RATES.win}`
      : `Imbalan dasar, menang atau kalah`,
    amount: COIN_RATES.finish + (menang ? COIN_RATES.win : 0),
  });

  if (kills > 0) {
    lines.push({
      reason: "bonus-kill",
      label: "Bonus kill",
      detail: `${kills} kill × ${COIN_RATES.perKill}`,
      amount: kills * COIN_RATES.perKill,
    });
  }

  if (roundWins > 0) {
    lines.push({
      reason: "bonus-ronde",
      label: "Bonus ronde",
      detail: `${roundWins} ronde × ${COIN_RATES.perRoundWin}`,
      amount: roundWins * COIN_RATES.perRoundWin,
    });
  }

  const killDalamRentetan = Math.max(0, streak - (COIN_RATES.streakFrom - 1));
  if (killDalamRentetan > 0) {
    lines.push({
      reason: "bonus-killstreak",
      label: "Bonus killstreak",
      detail: `${streak} kill beruntun`,
      amount: killDalamRentetan * COIN_RATES.perStreakKill,
    });
  }

  return {
    lines,
    total: lines.reduce((jumlah, line) => jumlah + line.amount, 0),
  };
}
