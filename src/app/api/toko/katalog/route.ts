import { handleRead } from "@/server/api/http";
import { ATTACHMENTS, UPGRADE_TRACKS } from "@/lib/economy/upgrade-catalog";
import { getCatalog } from "@/server/services/shop-service";

/**
 * GET /api/toko/katalog — katalog toko upgrade: jalur tingkat per senjata
 * beserta harganya, dan daftar attachment.
 *
 * Balasan: { tracks: UpgradeTrack[], attachments: Attachment[], degraded }.
 * Bila database gagal dibaca, katalog dari kode dikirim sebagai cadangan —
 * isinya sama, hanya belum dipastikan tersalin ke database.
 */
export const GET = handleRead(
  async () => Response.json({ ...getCatalog(), degraded: false }),
  () => ({ tracks: UPGRADE_TRACKS, attachments: ATTACHMENTS }),
);
