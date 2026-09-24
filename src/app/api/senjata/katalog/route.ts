import { handleRead } from "@/server/api/http";
import { listWeaponCatalog } from "@/server/services/weapon-service";

/**
 * GET /api/senjata/katalog — katalog senjata dari tabel `weapons`: statistik
 * dasar tiap senjata dan syarat membukanya (`unlock: { stat, target }` atau
 * null). Balasan: { weapons: [...], degraded }.
 */
export const GET = handleRead(
  async () => Response.json({ weapons: listWeaponCatalog(), degraded: false }),
  () => ({ weapons: [] }),
);
