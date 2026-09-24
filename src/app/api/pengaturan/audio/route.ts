import { handle, handleRead, readJsonObject, validationError } from "@/server/api/http";
import { validateSection } from "@/server/services/settings-validation";
import {
  DEFAULT_AUDIO_PREFERENCES,
  getAudioPreferences,
  saveAudioPreferences,
} from "@/server/services/settings-service";
import { currentPlayer } from "@/server/services/player-session";

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
  const checked = validateSection("audio", await readJsonObject(request));
  if (!checked.ok) throw validationError(checked.errors);
  const audio = checked.value;
  const player = await currentPlayer();
  return Response.json(saveAudioPreferences(player.id, audio));
});
