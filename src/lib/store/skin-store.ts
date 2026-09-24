import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import { useWalletStore } from "@/lib/store/wallet-store";
import type { ShopResult } from "@/lib/store/shop-store";
import type { CoinTransaction, SkinCollection, Wallet } from "@/types/economy";

/**
 * Koleksi skin pemain di klien, dimuat dari /api/skin saat sesi dibuka.
 * Pembelian dan pemasangan dikirim ke server; state hanya diperbarui dari
 * balasannya.
 */
interface SkinState {
  collection: SkinCollection;
  loaded: boolean;
  /** Kunci aksi yang sedang diproses. */
  pending: string | null;
  load: () => Promise<void>;
  /** Membeli skin; bila `equipOn` diisi, skin langsung dipasang di senjata itu. */
  buySkin: (skinId: string, equipOn?: string) => Promise<ShopResult>;
  /** Memasang skin milik pemain ke satu senjata, menggantikan skin sebelumnya. */
  equipSkin: (weaponId: string, skinId: string) => Promise<ShopResult>;
  /** Mengembalikan senjata ke cat pabrik. */
  unequipSkin: (weaponId: string) => Promise<ShopResult>;
}

interface PurchaseResponse {
  collection: SkinCollection;
  wallet: Wallet;
  transaction: CoinTransaction | null;
}

export const useSkinStore = create<SkinState>((set, get) => {
  async function run(key: string, action: () => Promise<ShopResult>): Promise<ShopResult> {
    if (get().pending) return { ok: false, message: "Tunggu proses sebelumnya selesai." };
    set({ pending: key });
    try {
      return await action();
    } finally {
      set({ pending: null });
    }
  }

  async function setSkin(weaponId: string, skinId: string | null): Promise<ShopResult> {
    const result = await apiFetch<{ collection: SkinCollection }>("/api/skin/pasang", {
      method: "POST",
      body: { weaponId, skinId },
    });
    if (!result.ok) return { ok: false, message: result.message };
    set({ collection: result.data.collection });
    return { ok: true };
  }

  return {
    collection: { ownedSkinIds: [], equipped: {} },
    loaded: false,
    pending: null,

    load: async () => {
      const result = await apiFetch<{ collection: SkinCollection }>("/api/skin");
      if (result.ok) set({ collection: result.data.collection, loaded: true });
    },

    buySkin: (skinId, equipOn) =>
      run(`beli:${skinId}`, async () => {
        const result = await apiFetch<PurchaseResponse>("/api/skin/beli", {
          method: "POST",
          body: { skinId, equipOn: equipOn ?? null },
        });
        if (!result.ok) {
          if (result.code === "saldo_kurang") void useWalletStore.getState().load();
          return { ok: false, message: result.message };
        }
        set({ collection: result.data.collection });
        useWalletStore.getState().applyServerResult(result.data);
        return { ok: true };
      }),

    equipSkin: (weaponId, skinId) => run(`pasang:${weaponId}`, () => setSkin(weaponId, skinId)),
    unequipSkin: (weaponId) => run(`pasang:${weaponId}`, () => setSkin(weaponId, null)),
  };
});
