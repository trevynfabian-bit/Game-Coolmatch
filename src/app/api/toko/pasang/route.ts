import { ATTACHMENT_SLOTS } from "@/server/db/schema";
import { enumField, handle, readJsonObject, stringField } from "@/server/api/http";
import { currentPlayer } from "@/server/services/player-session";
import { setEquippedAttachment } from "@/server/services/shop-service";

/**
 * POST /api/toko/pasang — memasang attachment milik pemain atau mengosongkan slot.
 *
 * Badan: { weaponId, slot, attachmentId: string | null }. `null` melepas
 * attachment di slot itu. Balasan 200: { weapon: WeaponUpgradeState }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const weaponId = stringField(body.weaponId, "weaponId");
  const slot = enumField(body.slot, "slot", ATTACHMENT_SLOTS);
  const attachmentId = body.attachmentId === null ? null : stringField(body.attachmentId, "attachmentId");

  const player = await currentPlayer();
  return Response.json({ weapon: setEquippedAttachment(player.id, weaponId, slot, attachmentId) });
});
