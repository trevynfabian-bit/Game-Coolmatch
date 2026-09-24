import { create } from "zustand";
import { findSkin } from "@/lib/economy/skin-catalog";
import { MOCK_SKIN_COLLECTION } from "@/lib/mock/skins";
import { useWalletStore } from "@/lib/store/wallet-store";
import type { ShopResult } from "@/lib/store/shop-store";
import type { SkinCollection } from "@/types/economy";

/**
 * Koleksi skin pemain di klien. Fase frontend memakai data tiruan dan
 * pembayaran lewat dompet klien; lapisan backend nanti mengganti isi aksi
 * dengan panggilan /api/skin yang mengembalikan bentuk hasil yang sama.
 */
interface SkinState {
  collection: SkinCollection;
  /** Kunci aksi yang sedang diproses. */
  pending: string | null;
  hydrate: (collection: SkinCollection) => void;
  /** Membeli skin; bila `equipOn` diisi, skin langsung dipasang di senjata itu. */
  buySkin: (skinId: string, equipOn?: string) => Promise<ShopResult>;
  /** Memasang skin milik pemain ke satu senjata, menggantikan skin sebelumnya. */
  equipSkin: (weaponId: string, skinId: string) => Promise<ShopResult>;
  /** Mengembalikan senjata ke cat pabrik. */
  unequipSkin: (weaponId: string) => Promise<ShopResult>;
}

const MOCK_LATENCY_MS = 250;
const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

export const useSkinStore = create<SkinState>((set, get) => ({
  collection: {
    ownedSkinIds: [...MOCK_SKIN_COLLECTION.ownedSkinIds],
    equipped: { ...MOCK_SKIN_COLLECTION.equipped },
  },
  pending: null,
  hydrate: (collection) => set({ collection }),

  buySkin: async (skinId, equipOn) => {
    if (get().pending) return { ok: false, message: "Tunggu proses sebelumnya selesai." };
    set({ pending: `beli:${skinId}` });
    try {
      await wait();
      const skin = findSkin(skinId);
      if (!skin) return { ok: false, message: "Skin ini tidak ada di katalog." };
      const { collection } = get();
      if (collection.ownedSkinIds.includes(skinId)) {
        return { ok: false, message: `${skin.name} sudah kamu miliki.` };
      }
      const paid = useWalletStore.getState().spend({
        kind: "beli_skin",
        amount: skin.price,
        note: `Skin ${skin.name}`,
        sourceType: "skin",
        sourceId: skin.id,
      });
      if (!paid) {
        const balance = useWalletStore.getState().wallet.balance;
        return { ok: false, message: `Koin kurang ${skin.price - balance} untuk membeli ${skin.name}.` };
      }
      set({
        collection: {
          ownedSkinIds: [...collection.ownedSkinIds, skinId],
          equipped: equipOn ? { ...collection.equipped, [equipOn]: skinId } : collection.equipped,
        },
      });
      return { ok: true };
    } finally {
      set({ pending: null });
    }
  },

  equipSkin: async (weaponId, skinId) => {
    if (get().pending) return { ok: false, message: "Tunggu proses sebelumnya selesai." };
    set({ pending: `pasang:${weaponId}` });
    try {
      await wait();
      const { collection } = get();
      if (!findSkin(skinId) || !collection.ownedSkinIds.includes(skinId)) {
        return { ok: false, message: "Beli dulu skin ini sebelum memasangnya." };
      }
      set({ collection: { ...collection, equipped: { ...collection.equipped, [weaponId]: skinId } } });
      return { ok: true };
    } finally {
      set({ pending: null });
    }
  },

  unequipSkin: async (weaponId) => {
    if (get().pending) return { ok: false, message: "Tunggu proses sebelumnya selesai." };
    set({ pending: `pasang:${weaponId}` });
    try {
      await wait();
      const { collection } = get();
      const equipped = { ...collection.equipped };
      delete equipped[weaponId];
      set({ collection: { ...collection, equipped } });
      return { ok: true };
    } finally {
      set({ pending: null });
    }
  },
}));
