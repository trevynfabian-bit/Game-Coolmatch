import { create } from "zustand";
import { MOCK_SKIN_COLLECTION } from "@/lib/mock/skins";
import type { SkinCollection } from "@/types/economy";

/**
 * Koleksi skin pemain di klien. Fase frontend memakai data tiruan; lapisan
 * backend nanti mengisinya dari /api/skin lewat `hydrate`.
 */
interface SkinState {
  collection: SkinCollection;
  hydrate: (collection: SkinCollection) => void;
}

export const useSkinStore = create<SkinState>((set) => ({
  collection: {
    ownedSkinIds: [...MOCK_SKIN_COLLECTION.ownedSkinIds],
    equipped: { ...MOCK_SKIN_COLLECTION.equipped },
  },
  hydrate: (collection) => set({ collection }),
}));
