import { handleRead } from "@/server/api/http";
import {
  DEFAULT_AUDIO_PREFERENCES,
  DEFAULT_CONTROL_VALUES,
  DEFAULT_GRAPHICS_VALUES,
  getAllSettings,
} from "@/server/services/settings-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/pengaturan — seluruh pengaturan pemain:
 * { audio: { master, sfx, music, ui, muted }, graphics: { quality,
 * resolutionScale, fov, showFps }, controls: { sensitivity, bindings },
 * updatedAt: { audio, settings }, degraded }. `updatedAt` null berarti bagian
 * itu belum pernah disimpan dan yang dikirim adalah nilai bawaan.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ ...getAllSettings(player.id), degraded: false });
  },
  () => ({
    audio: DEFAULT_AUDIO_PREFERENCES,
    graphics: DEFAULT_GRAPHICS_VALUES,
    controls: DEFAULT_CONTROL_VALUES,
    updatedAt: { audio: null, settings: null },
  }),
);
