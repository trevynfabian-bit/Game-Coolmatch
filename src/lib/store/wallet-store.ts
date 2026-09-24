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
  /**
   * Pemotongan saldo di klien untuk aksi yang BELUM punya endpoint (toko skin
   * selama fase frontend). Menolak (false) bila saldo tidak cukup.
   */
  spendLocally: (mutation: {
    kind: CoinTransaction["kind"];
    amount: number;
    note: string;
    sourceType?: string;
    sourceId?: string;
  }) => boolean;
}

export const useWalletStore = create<WalletState>((set, get) => ({
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

  spendLocally: (mutation) => {
    const amount = Math.floor(mutation.amount);
    const { wallet, transactions } = get();
    if (amount <= 0 || wallet.balance < amount) return false;
    const balance = wallet.balance - amount;
    const entry: CoinTransaction = {
      id: -Date.now(),
      kind: mutation.kind,
      amount: -amount,
      balanceAfter: balance,
      sourceType: mutation.sourceType ?? null,
      sourceId: mutation.sourceId ?? null,
      note: mutation.note,
      createdAt: Date.now(),
    };
    set({
      wallet: { ...wallet, balance },
      transactions: [entry, ...transactions].slice(0, HISTORY_LIMIT),
    });
    return true;
  },
}));
