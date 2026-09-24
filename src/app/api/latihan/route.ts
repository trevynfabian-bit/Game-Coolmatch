import type { NextRequest } from "next/server";
import { ApiError, handle, handleRead, intField, readJsonObject, stringField } from "@/server/api/http";
import { getPracticeOverview, recordPracticeSession } from "@/server/services/practice-service";
import { currentPlayer } from "@/server/services/player-session";

function parsePerTarget(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "isian_tidak_sah", '"perTarget" harus objek { idSasaran: kena }.');
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 20) throw new ApiError(400, "isian_tidak_sah", '"perTarget" terlalu banyak sasaran.');
  return Object.fromEntries(entries.map(([id, count]) => [id, intField(count, `perTarget.${id}`, { max: 100_000 })]));
}

/**
 * GET /api/latihan?weaponId= — catatan latihan sasaran pemain: 20 sesi
 * terakhir dan ketepatan terbaik per senjata.
 * Balasan: { recent: [...], bestByWeapon: { [weaponId]: sesi }, degraded }.
 */
export const GET = handleRead(
  async (request: NextRequest) => {
    const weaponId = request.nextUrl.searchParams.get("weaponId") ?? undefined;
    const player = await currentPlayer();
    return Response.json({ ...getPracticeOverview(player.id, weaponId), degraded: false });
  },
  () => ({ recent: [], bestByWeapon: {} }),
);

/**
 * POST /api/latihan — menyimpan satu sesi latihan sasaran. Terisolasi dari
 * progres: tidak memberi koin dan tidak menambah statistik.
 * Badan: { weaponId, shots, hits, perTarget: { idSasaran: kena }, durationMs }.
 * Balasan 201: { session, best } (best = rekor senjata itu setelah sesi ini).
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const input = {
    weaponId: stringField(body.weaponId, "weaponId"),
    shots: intField(body.shots, "shots", { min: 1, max: 100_000 }),
    hits: intField(body.hits, "hits", { max: 100_000 }),
    perTarget: parsePerTarget(body.perTarget),
    durationMs: intField(body.durationMs, "durationMs", { max: 24 * 60 * 60 * 1000 }),
  };
  const player = await currentPlayer();
  const session = recordPracticeSession(player.id, input);
  const best = getPracticeOverview(player.id, input.weaponId).bestByWeapon[input.weaponId] ?? null;
  return Response.json({ session, best }, { status: 201 });
});
