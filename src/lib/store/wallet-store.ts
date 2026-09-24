import { create } from "zustand";
import { MOCK_TRANSACTIONS, MOCK_WALLET } from "@/lib/mock/wallet";
import type { CoinTransaction, CoinTransactionKind, Wallet } from "@/types/economy";

/**
 * Dompet koin di klien: saldo dan riwayat terbaru.
 *
 * Satu sumber untuk semua tempat yang menampilkan koin — menu utama, toko,
 * HUD, dan layar akhir — jadi belanja di toko langsung terlihat di mana pun.
 * Untuk fase frontend isinya tiruan dan mutasi dihitung di sini; lapisan
 * backend nanti mengisinya dari /api/koin lewat `hydrate`.
 */

/** Jumlah riwayat yang disimpan di klien; sisanya dibaca dari server bila perlu. */
const HISTORY_LIMIT = 50;

export interface Mutation {
  kind: CoinTransactionKind;
  /** Selalu positif; arah ditentukan oleh `spend` atau `credit`. */
  amount: number;
  note: string;
  sourceType?: string;
  sourceId?: string;
}

interface WalletState {
  wallet: Wallet;
  transactions: CoinTransaction[];
  /** Benar bila saldo terakhir berasal dari cadangan karena server gagal dibaca. */
  degraded: boolean;
  hydrate: (input: { wallet?: Wallet; transactions?: CoinTransaction[]; degraded?: boolean }) => void;
  /** Mengurangi saldo; menolak (false) bila saldo tidak cukup, tanpa mengubah apa pun. */
  spend: (mutation: Mutation) => boolean;
  credit: (mutation: Mutation) => void;
}

export const useWalletStore = create<WalletState>((set, get) => {
  function record(signed: number, mutation: Mutation) {
    const { wallet, transactions } = get();
    const balance = wallet.balance + signed;
    const entry: CoinTransaction = {
      id: (transactions[0]?.id ?? 0) + 1,
      kind: mutation.kind,
      amount: signed,
      balanceAfter: balance,
      sourceType: mutation.sourceType ?? null,
      sourceId: mutation.sourceId ?? null,
      note: mutation.note,
      createdAt: Date.now(),
    };
    set({
      wallet: {
        balance,
        lifetimeEarned: wallet.lifetimeEarned + Math.max(0, signed),
      },
      transactions: [entry, ...transactions].slice(0, HISTORY_LIMIT),
    });
  }

  return {
    wallet: { ...MOCK_WALLET },
    transactions: [...MOCK_TRANSACTIONS],
    degraded: false,

    hydrate: ({ wallet, transactions, degraded }) =>
      set((state) => ({
        wallet: wallet ?? state.wallet,
        transactions: transactions ?? state.transactions,
        degraded: degraded ?? state.degraded,
      })),

    spend: (mutation) => {
      const amount = Math.floor(mutation.amount);
      if (amount <= 0 || get().wallet.balance < amount) return false;
      record(-amount, mutation);
      return true;
    },

    credit: (mutation) => {
      const amount = Math.floor(mutation.amount);
      if (amount <= 0) return;
      record(amount, mutation);
    },
  };
});
