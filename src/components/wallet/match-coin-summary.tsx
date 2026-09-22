"use client";

import { useEffect, useMemo } from "react";
import { CoinRewardPanel } from "@/components/wallet/coin-reward-panel";
import { matchCoinReward, rewardEntries } from "@/lib/game/coin-reward";
import {
  useCoinBalance,
  useMatchPaid,
  useWalletStore,
} from "@/lib/store/wallet-store";
import type { MatchResult } from "@/types/game";

/**
 * Perolehan koin sebuah pertandingan: dihitung, DIMASUKKAN ke dompet, lalu
 * ditampilkan — ketiganya di satu tempat.
 *
 * Disatukan dengan sengaja. Kalau yang menghitung dan yang membayarkan adalah
 * dua komponen berbeda, keduanya harus menghitung ulang perolehan yang sama
 * dari fakta yang sama, dan satu perbedaan kecil di antaranya melahirkan
 * keluhan yang paling sulit dijawab: layar menjanjikan 250 koin, dompet
 * mencatat 230, dan tidak ada yang bisa menunjukkan mana yang salah.
 *
 * Koinnya masuk saat layar ini MUNCUL, bukan saat pemain menekan tombol.
 * Pertandingannya sudah selesai; menahan koinnya sampai sebuah tombol ditekan
 * berarti pemain yang menutup tab lebih dulu kehilangan sesuatu yang sudah
 * jadi haknya. Layar ini hanya dipasang ketika pertandingan benar-benar
 * berakhir, jadi tidak ada koin yang dibayar terlalu awal.
 */
export function MatchCoinSummary({
  matchKey,
  result,
  kills,
  roundWins,
  bestStreak = 0,
  endedAt,
  note,
}: {
  /**
   * Kunci pertandingan ini. Satu pertandingan hanya dibayar sekali, dan
   * kuncinya harus berganti tiap pertandingan baru — termasuk saat pemain
   * menekan "Main lagi", yang memakai id pertandingan yang sama.
   */
  matchKey: string;
  result: MatchResult | null;
  kills: number;
  roundWins: number;
  /** Rentetan kill terbaik; nol selama fase killstreak belum menghitungnya. */
  bestStreak?: number;
  /** Epoch milidetik saat pertandingan ditutup; null bila jamnya tidak terisi. */
  endedAt: number | null;
  /** Keterangan untuk baris riwayatnya, misalnya "Menang di Gudang Tua". */
  note?: string;
}) {
  const reward = useMemo(
    () => matchCoinReward({ result, kills, roundWins, bestStreak }),
    [result, kills, roundWins, bestStreak],
  );

  useEffect(() => {
    const entries = rewardEntries(reward, {
      matchKey,
      // Jam pertandingan bisa kosong pada potret siap pakai; yang penting
      // barisnya punya waktu yang masuk akal, bukan nol di tahun 1970.
      at: endedAt ?? Date.now(),
      note,
    });
    useWalletStore.getState().creditMatch(matchKey, entries);
  }, [reward, matchKey, endedAt, note]);

  const balance = useCoinBalance();
  const paid = useMatchPaid(matchKey);

  /*
    Saldo SEBELUM pertandingan ini, dibaca dari satu angka yang sama dengan
    yang dipakai menu dan dompet.

    Sebelum koinnya masuk, saldo sekarang memang saldo sebelumnya; sesudahnya,
    mengurangi totalnya mengembalikan angka yang sama. Karena itu tidak ada
    satu frame pun yang menampilkan angka yang salah — dan layar ini tidak
    perlu menyimpan potret saldo sendiri yang bisa basi.
  */
  const balanceBefore = paid ? balance - reward.total : balance;

  return <CoinRewardPanel reward={reward} balanceBefore={balanceBefore} />;
}
