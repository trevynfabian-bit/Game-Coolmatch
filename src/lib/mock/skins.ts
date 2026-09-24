import type { SkinCollection } from "@/types/economy";

/** Koleksi skin tiruan untuk fase frontend; nanti diganti respons /api/skin. */
export const MOCK_SKIN_COLLECTION: SkinCollection = {
  ownedSkinIds: ["skin-arang", "skin-loreng-hutan"],
  equipped: { "wpn-rifle-garuda": "skin-loreng-hutan" },
};
