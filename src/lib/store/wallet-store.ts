import { useMemo } from "react";
import { create } from "zustand";
import { walletBalance, type CoinEntry } from "@/lib/game/wallet";
import { MOCK_COIN_BALANCE, MOCK_COIN_ENTRIES } from "@/lib/mock/wallet";

/**
 * Koin yang diperoleh DALAM sesi ini, di atas riwayat tiruan yang sudah ada.
 *
 * Sengaja tidak disimpan ke localStorage, dengan alasan yang sama persis
 * seperti senjata yang terbuka: kemajuan bermain sendiri belum tersimpan ke
 * mana pun, jadi menyimpan hasilnya berarti menjanjikan sesuatu yang tidak
 * ditopang apa-apa — pemain kembali besok dengan saldo yang katanya naik
 * tetapi tanpa satu pun pertandingan yang tercatat menghasilkannya. Ketika
 * layer backend menyimpan tabel dompet dan transaksi koin, DAFTAR INILAH yang
 * diganti jawabannya dari server; bentuk yang dibaca layar tidak berubah.
 *
 * Efek sampingnya menguntungkan: daftarnya mulai kosong baik di server maupun
 * di browser, sehingga hasil prerender dan hasil hidrasi selalu sama dan tidak
 * ada layar yang perlu menunda menyebut saldonya.
 */
interface WalletState {
  /** Baris riwayat yang lahir di sesi ini, urut kejadian. */
  earned: CoinEntry[];
  /**
   * Kunci pertandingan yang koinnya SUDAH dibayarkan.
   *
   * Tanpa daftar ini, layar akhir yang dirender ulang — karena papan skor
   * bergeser, karena React memasang ulang efeknya — akan membayar pertandingan
   * yang sama dua kali, dan saldo pemain naik hanya karena ia menatap layar
   * lebih lama.
   */
  paid: string[];
  /**
   * Membayarkan koin satu pertandingan. Pertandingan yang sudah dibayar dan
   * perolehan kosong sama-sama dilewati, jadi memanggilnya berulang aman.
   */
  creditMatch: (matchKey: string, entries: readonly CoinEntry[]) => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  earned: [],
  paid: [],
  creditMatch: (matchKey, entries) => {
    if (entries.length === 0 || get().paid.includes(matchKey)) return;
    set((state) => ({
      earned: [...state.earned, ...entries],
      paid: [...state.paid, matchKey],
    }));
  },
}));

/**
 * Seluruh riwayat koin: yang tiruan ditambah yang diperoleh sesi ini.
 *
 * Dibungkus `useMemo` supaya referensinya tetap selama tidak ada koin baru.
 * Tanpa itu tiap render menghasilkan array baru, dan daftar riwayat yang
 * menyimpan keadaan sendiri — saringan dan potongan harinya — ikut dihitung
 * ulang tanpa ada yang benar-benar berubah.
 */
export function useCoinEntries(): CoinEntry[] {
  const earned = useWalletStore((state) => state.earned);
  return useMemo(
    () =>
      earned.length === 0
        ? MOCK_COIN_ENTRIES
        : [...MOCK_COIN_ENTRIES, ...earned],
    [earned],
  );
}

/**
 * Saldo koin sekarang.
 *
 * Dijumlahkan dari riwayat, bukan disimpan sebagai angka tersendiri — aturan
 * yang sama yang berlaku di seluruh dompet. Yang dijumlahkan di sini hanya
 * bagian yang baru; saldo tiruannya sudah dihitung sekali saat modul dimuat.
 */
export function useCoinBalance(): number {
  const earned = useWalletStore((state) => state.earned);
  return MOCK_COIN_BALANCE + walletBalance(earned);
}

/** Benar bila koin pertandingan ini sudah masuk ke dompet. */
export function useMatchPaid(matchKey: string): boolean {
  return useWalletStore((state) => state.paid.includes(matchKey));
}
