import type { CoinTransaction, Wallet } from "@/types/economy";

/**
 * Dompet dan riwayat koin tiruan untuk fase frontend. Nanti diganti respons
 * /api/koin dan /api/koin/riwayat yang bentuknya sama.
 */
export const MOCK_WALLET: Wallet = {
  balance: 640,
  lifetimeEarned: 1180,
};

const HOUR = 60 * 60 * 1000;
// Jangkar waktu tetap supaya hasil prerender dan hidrasi sama persis.
const ANCHOR = Date.UTC(2026, 8, 20, 12, 0, 0);

export const MOCK_TRANSACTIONS: CoinTransaction[] = [
  { id: 6, kind: "bonus_ronde", amount: 30, balanceAfter: 640, sourceType: "match", sourceId: "12", note: "3 ronde dimenangkan", createdAt: ANCHOR },
  { id: 5, kind: "bonus_kill", amount: 42, balanceAfter: 610, sourceType: "match", sourceId: "12", note: "14 kill", createdAt: ANCHOR },
  { id: 4, kind: "pertandingan", amount: 60, balanceAfter: 568, sourceType: "match", sourceId: "12", note: "Menang pertandingan", createdAt: ANCHOR },
  { id: 3, kind: "beli_attachment", amount: -130, balanceAfter: 508, sourceType: "attachment", sourceId: "att-pegangan-vertikal", note: "Pegangan Vertikal · Garuda AR", createdAt: ANCHOR - 2 * HOUR },
  { id: 2, kind: "beli_upgrade", amount: -200, balanceAfter: 638, sourceType: "upgrade", sourceId: "upg-wpn-rifle-garuda-accuracy:2", note: "Akurasi Tk 2 · Garuda AR", createdAt: ANCHOR - 3 * HOUR },
  { id: 1, kind: "pertandingan", amount: 20, balanceAfter: 838, sourceType: "match", sourceId: "11", note: "Menuntaskan pertandingan", createdAt: ANCHOR - 26 * HOUR },
];
