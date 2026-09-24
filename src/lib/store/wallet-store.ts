import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import type { CoinTransaction, Wallet } from "@/types/economy";

/**
 * Dompet koin di klien: saldo dan riwayat terbaru.
 *
 * Satu sumber untuk semua tempat yang menampilkan koin — menu utama, toko,
 * HUD, dan layar akhir. Server adalah pemilik saldo: store ini hanya memuat
 * dari /api/koin dan menerima saldo baru yang dikembalikan tiap pembelian.
 */

/** Jumlah riwayat yang disimpan di klien. */
const HISTORY_LIMIT = 50;

interface WalletResponse {
  wallet: Wallet & { updatedAt: number };
  degraded: boolean;
}
interface HistoryResponse {
  transactions: CoinTransaction[];
  degraded: boolean;
}

interface WalletState {
  wallet: Wallet;
  transactions: CoinTransaction[];
  /** Benar setelah saldo pertama kali berhasil dimuat dari server. */
  loaded: boolean;
  /** Benar bila saldo terakhir berasal dari cadangan karena server gagal dibaca. */
  degraded: boolean;
  /** Memuat saldo dan riwayat dari server. */
  load: () => Promise<void>;
  /** Menerapkan hasil mutasi dari server: saldo baru dan (bila ada) transaksi barunya. */
  applyServerResult: (input: { wallet: Wallet; transaction?: CoinTransaction | null }) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: { balance: 0, lifetimeEarned: 0 },
  transactions: [],
  loaded: false,
  degraded: false,

  load: async () => {
    const [wallet, history] = await Promise.all([
      apiFetch<WalletResponse>("/api/koin"),
      apiFetch<HistoryResponse>("/api/koin/riwayat?limit=20"),
    ]);
    set((state) => ({
      wallet: wallet.ok
        ? { balance: wallet.data.wallet.balance, lifetimeEarned: wallet.data.wallet.lifetimeEarned }
        : state.wallet,
      transactions: history.ok ? history.data.transactions : state.transactions,
      loaded: state.loaded || wallet.ok,
      degraded: !wallet.ok || wallet.data.degraded,
    }));
  },

  applyServerResult: ({ wallet, transaction }) =>
    set((state) => ({
      wallet: { balance: wallet.balance, lifetimeEarned: wallet.lifetimeEarned },
      transactions: transaction
        ? [transaction, ...state.transactions.filter((t) => t.id !== transaction.id)].slice(0, HISTORY_LIMIT)
        : state.transactions,
      degraded: false,
    })),
}));
