import type { NextRequest } from "next/server";
import { SKIN_RARITIES } from "@/server/db/schema";
import { enumField, handleRead } from "@/server/api/http";
import { RARITY_META, RARITY_ORDER, SKINS } from "@/lib/economy/skin-catalog";
import { getSkinCatalog } from "@/server/services/skin-service";

/**
 * GET /api/skin/katalog?tingkat=epik&negara=1 — katalog skin & camo bertingkat.
 *
 * `tingkat` menyaring satu kelangkaan (umum | langka | epik | gold); `negara=1`
 * hanya mengembalikan camo bertema negara. Hasil terurut dari umum ke gold,
 * lalu harga termurah.
 *
 * Balasan: { skins: Skin[], rarities: [{ id, label, color, count }], degraded }.
 * Cadangan saat database gagal: katalog dari kode.
 */
export const GET = handleRead(
  async (request: NextRequest) => {
    const params = request.nextUrl.searchParams;
    const rarityParam = params.get("tingkat");
    const rarity = rarityParam ? enumField(rarityParam, "tingkat", SKIN_RARITIES) : undefined;
    const countryOnly = params.get("negara") === "1";

    const list = getSkinCatalog({ rarity, countryOnly });
    const all = rarity || countryOnly ? getSkinCatalog() : list;
    return Response.json({
      skins: list,
      rarities: RARITY_ORDER.map((id) => ({
        id,
        label: RARITY_META[id].label,
        color: RARITY_META[id].color,
        count: all.filter((skin) => skin.rarity === id).length,
      })),
      degraded: false,
    });
  },
  () => ({
    skins: SKINS,
    rarities: RARITY_ORDER.map((id) => ({
      id,
      label: RARITY_META[id].label,
      color: RARITY_META[id].color,
      count: SKINS.filter((skin) => skin.rarity === id).length,
    })),
  }),
);
