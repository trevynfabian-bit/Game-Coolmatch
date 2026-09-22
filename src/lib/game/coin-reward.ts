import type { CoinEntry, CoinReason } from "@/lib/game/wallet";
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

/**
 * Baris ini datang dari MENYELESAIKAN pertandingan, atau dari cara pemain
 * bermain di dalamnya.
 *
 * Pemisahan ini yang membuat rincian koin mengajarkan sesuatu. Daftar rata
 * berisi lima baris hanya memberi tahu pemain bahwa ia dapat sekian; daftar
 * yang terbagi memberi tahu bahwa sebagian besar koinnya datang karena ia
 * menumbangkan banyak lawan — dan itu yang membuat pertandingan berikutnya
 * terasa layak diperjuangkan alih-alih sekadar diselesaikan.
 */
export type RewardGroup = "dasar" | "performa";

export interface CoinRewardLine {
  reason: CoinReason;
  group: RewardGroup;
  /** Nama baris ini di layar. */
  label: string;
  /** Keterangan singkat: dari apa angkanya dihitung. */
  detail: string;
  amount: number;
}

export interface MatchCoinReward {
  lines: CoinRewardLine[];
  total: number;
  /** Koin yang didapat sekadar karena pertandingannya selesai. */
  baseTotal: number;
  /** Koin yang didapat karena cara pemain bermain. */
  performanceTotal: number;
  /**
   * Bagian total yang datang dari performa, 0..1. Nol bila tidak ada koin
   * sama sekali — bukan NaN, yang akan sampai ke layar sebagai "NaN%".
   */
  performanceShare: number;
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
  if (facts.isTrial) {
    return {
      lines: [],
      total: 0,
      baseTotal: 0,
      performanceTotal: 0,
      performanceShare: 0,
    };
  }

  const kills = bulat(facts.kills);
  const roundWins = bulat(facts.roundWins);
  const streak = bulat(facts.bestStreak);
  const menang = facts.result === "menang";

  const lines: CoinRewardLine[] = [];

  lines.push({
    reason: "hasil-match",
    group: "dasar",
    label: menang ? "Menang bertanding" : "Menyelesaikan pertandingan",
    detail: menang
      ? `Imbalan dasar ${COIN_RATES.finish} + bonus juara ${COIN_RATES.win}`
      : `Imbalan dasar, menang atau kalah`,
    amount: COIN_RATES.finish + (menang ? COIN_RATES.win : 0),
  });

  if (kills > 0) {
    lines.push({
      reason: "bonus-kill",
      group: "performa",
      label: "Bonus kill",
      detail: `${kills} kill × ${COIN_RATES.perKill}`,
      amount: kills * COIN_RATES.perKill,
    });
  }

  if (roundWins > 0) {
    lines.push({
      reason: "bonus-ronde",
      group: "performa",
      label: "Bonus ronde",
      detail: `${roundWins} ronde × ${COIN_RATES.perRoundWin}`,
      amount: roundWins * COIN_RATES.perRoundWin,
    });
  }

  const killDalamRentetan = Math.max(0, streak - (COIN_RATES.streakFrom - 1));
  if (killDalamRentetan > 0) {
    lines.push({
      reason: "bonus-killstreak",
      group: "performa",
      label: "Bonus killstreak",
      detail: `${streak} kill beruntun`,
      amount: killDalamRentetan * COIN_RATES.perStreakKill,
    });
  }

  const jumlahkan = (group: RewardGroup) =>
    lines
      .filter((line) => line.group === group)
      .reduce((jumlah, line) => jumlah + line.amount, 0);

  const baseTotal = jumlahkan("dasar");
  const performanceTotal = jumlahkan("performa");
  const total = baseTotal + performanceTotal;

  return {
    lines,
    total,
    baseTotal,
    performanceTotal,
    performanceShare: total > 0 ? performanceTotal / total : 0,
  };
}

/**
 * Perolehan sebuah pertandingan sebagai BARIS RIWAYAT dompet.
 *
 * Satu baris per sebab, bukan satu baris gabungan. Pemain baru saja membaca
 * rinciannya di layar akhir pertandingan — "Bonus kill 70", "Bonus ronde 60" —
 * dan membuka dompet untuk menemukan satu baris "+250 Hasil pertandingan"
 * berarti rincian yang tadi ditunjukkan kepadanya ternyata tidak disimpan di
 * mana pun. Sebabnya juga sudah memakai kosakata riwayat sejak awal, jadi
 * tidak ada yang perlu diterjemahkan di sini.
 *
 * Seluruh baris memakai waktu yang sama karena memang satu kejadian yang sama,
 * jadi urutannya di dalam riwayat sepenuhnya ditentukan idnya. Nomornya
 * sengaja MENURUN: riwayat dibaca dari yang terbaru, sehingga id yang paling
 * besar muncul paling atas. Yang harus berdiri di atas adalah imbalan dasar —
 * baris itulah yang membawa catatan "Menang di Gudang Tua", dan membacanya
 * sesudah tiga baris bonus tanpa keterangan berarti membaca satu pertandingan
 * secara terbalik.
 */
export function rewardEntries(
  reward: MatchCoinReward,
  meta: {
    /** Kunci pertandingan; menjadi awalan id tiap barisnya. */
    matchKey: string;
    /** Epoch milidetik saat pertandingan ditutup. */
    at: number;
    /** Keterangan pertandingannya, misalnya "Menang di Gudang Tua". */
    note?: string;
  },
): CoinEntry[] {
  return reward.lines.map((line, index) => {
    const nomor = reward.lines.length - index;
    const entry: CoinEntry = {
      id: `${meta.matchKey}-${String(nomor).padStart(2, "0")}`,
      at: meta.at,
      amount: line.amount,
      reason: line.reason,
    };
    /*
      Catatannya hanya di baris pertama. Menempelkan "Menang di Gudang Tua" ke
      keempat barisnya membuat riwayat mengulang kalimat yang sama empat kali
      berturut-turut, dan yang tenggelam justru keterangan tiap baris yang
      benar-benar berbeda.
    */
    if (index === 0 && meta.note) entry.note = meta.note;
    return entry;
  });
}

/**
 * Kalimat pendek tentang dari mana sebagian besar koinnya datang.
 *
 * Angka bagian performa sendiri tidak berarti apa-apa bagi pemain — "0,62"
 * bukan kabar. Yang berarti adalah apa yang angka itu katakan tentang
 * pertandingannya barusan, dan itulah yang membuat pemain tahu apa yang
 * sebaiknya ia kejar di pertandingan berikutnya.
 */
export function performanceSentence(reward: MatchCoinReward): string {
  if (reward.total <= 0) return "";
  if (reward.performanceTotal <= 0) {
    return "Seluruh koin ini datang dari menyelesaikan pertandingan. Kill dan ronde yang dimenangkan membayar tambahan.";
  }

  const persen = Math.round(reward.performanceShare * 100);
  if (persen >= 60) {
    return `${persen} persen koin ini datang dari cara kamu bermain, bukan dari sekadar menyelesaikan pertandingan.`;
  }
  return `${persen} persen koin ini datang dari cara kamu bermain — masih ada ruang untuk menaikkannya.`;
}
