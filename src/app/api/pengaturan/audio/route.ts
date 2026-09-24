import { ApiError, handle, handleRead, readJsonObject } from "@/server/api/http";
import {
  DEFAULT_AUDIO_PREFERENCES,
  getAudioPreferences,
  saveAudioPreferences,
  type AudioPreferences,
} from "@/server/services/settings-service";
import { currentPlayer } from "@/server/services/player-session";

function volume(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ApiError(400, "isian_tidak_sah", `"${name}" harus angka 0..1.`);
  }
  return value;
}

function parseAudio(body: Record<string, unknown>): AudioPreferences {
  if (typeof body.muted !== "boolean") throw new ApiError(400, "isian_tidak_sah", '"muted" harus true atau false.');
  return {
    master: volume(body.master, "master"),
    sfx: volume(body.sfx, "sfx"),
    music: volume(body.music, "music"),
    ui: volume(body.ui, "ui"),
    muted: body.muted,
  };
}

/**
 * GET /api/pengaturan/audio — preferensi audio pemain:
 * { audio: { master, sfx, music, ui, muted }, updatedAt | null, degraded }.
 * `updatedAt` null berarti belum pernah disimpan (nilai bawaan).
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ ...getAudioPreferences(player.id), degraded: false });
  },
  () => ({ audio: DEFAULT_AUDIO_PREFERENCES, updatedAt: null }),
);

/**
 * POST /api/pengaturan/audio — menyimpan seluruh preferensi audio.
 * Badan: { master, sfx, music, ui (0..1), muted }. Balasan: { audio, updatedAt }.
 */
export const POST = handle(async (request: Request) => {
  const audio = parseAudio(await readJsonObject(request));
  const player = await currentPlayer();
  return Response.json(saveAudioPreferences(player.id, audio));
});
