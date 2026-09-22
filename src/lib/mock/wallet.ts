import { walletBalance, type CoinEntry } from "@/lib/game/wallet";

/**
 * Riwayat koin tiruan.
 *
 * Bentuknya meniru tabel transaksi koin yang akan dibangun di sisi server:
 * satu baris per koin masuk atau keluar, dengan sebab dan waktunya. Saldo
 * tidak ikut ditulis di sini — ia dijumlahkan dari baris-baris ini, persis
 * seperti nanti saat datanya datang dari server.
 *
 * Isinya sengaja bukan angka acak melainkan cerita yang masuk akal: beberapa
 * hari bertanding dengan hasil yang naik-turun, satu hari yang habis untuk
 * belanja, dan satu pembelian besar yang membuat saldonya sempat turun jauh.
 * Riwayat yang seluruhnya pemasukan tidak pernah menunjukkan apakah halaman
 * ini benar membacakan pengeluaran.
 */

/** Jam tetap sebagai titik acuan, supaya tampilannya tidak berubah tiap render. */
const HARI = 24 * 60 * 60 * 1000;
const ACUAN = Date.UTC(2026, 8, 21, 12, 0, 0);

function jam(hariLalu: number, jamWib: number, menit = 0): number {
  // WIB adalah UTC+7; ditulis apa adanya supaya tidak bergantung zona mesin.
  return ACUAN - hariLalu * HARI + (jamWib - 19) * 3600_000 + menit * 60_000;
}

export const MOCK_COIN_ENTRIES: CoinEntry[] = [
  {
    id: "koin-01",
    at: jam(6, 20, 5),
    amount: 180,
    reason: "hasil-match",
    note: "Menang di Gudang Tua",
  },
  { id: "koin-02", at: jam(6, 20, 5), amount: 95, reason: "bonus-kill" },
  { id: "koin-03", at: jam(6, 20, 6), amount: 60, reason: "bonus-ronde" },
  {
    id: "koin-04",
    at: jam(5, 21, 40),
    amount: 120,
    reason: "hasil-match",
    note: "Kalah tipis di Lorong Pabrik",
  },
  { id: "koin-05", at: jam(5, 21, 41), amount: 45, reason: "bonus-kill" },
  {
    id: "koin-06",
    at: jam(4, 19, 15),
    amount: -350,
    reason: "belanja-upgrade",
    note: "Magasin besar untuk Garuda AR",
  },
  {
    id: "koin-07",
    at: jam(3, 22, 10),
    amount: 210,
    reason: "hasil-match",
    note: "Menang di Atap Kota",
  },
  { id: "koin-08", at: jam(3, 22, 11), amount: 130, reason: "bonus-kill" },
  { id: "koin-09", at: jam(3, 22, 12), amount: 90, reason: "bonus-ronde" },
  {
    id: "koin-10",
    at: jam(3, 22, 12),
    amount: 75,
    reason: "bonus-killstreak",
    note: "Lima kill beruntun",
  },
  {
    id: "koin-11",
    at: jam(1, 20, 30),
    amount: -600,
    reason: "belanja-skin",
    note: "Camo Garuda untuk Garuda AR",
  },
  {
    id: "koin-12",
    at: jam(0, 21, 5),
    amount: 240,
    reason: "hasil-match",
    note: "Menang di Silo Kembar",
  },
  { id: "koin-13", at: jam(0, 21, 6), amount: 160, reason: "bonus-kill" },
  {
    id: "koin-14",
    at: jam(0, 21, 7),
    amount: 110,
    reason: "bonus-killstreak",
    note: "Tujuh kill beruntun",
  },
];

/**
 * Saldo koin tiruan, DIJUMLAHKAN dari riwayat di atas — bukan ditulis sebagai
 * angka tersendiri.
 *
 * Menu utama, HUD arena, dan halaman dompet membaca satu angka yang sama dari
 * sini. Kalau masing-masing menulis angkanya sendiri, cepat atau lambat menu
 * akan menjanjikan saldo yang berbeda dari yang tertulis di dompet, dan pemain
 * tidak punya cara tahu yang mana yang benar.
 */
export const MOCK_COIN_BALANCE = walletBalance(MOCK_COIN_ENTRIES);
