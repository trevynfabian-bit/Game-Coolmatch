import { handle, handleRead, readJsonObject, validationError } from "@/server/api/http";
import { validateSettings } from "@/server/services/settings-validation";
import {
  DEFAULT_AUDIO_PREFERENCES,
  DEFAULT_CONTROL_VALUES,
  DEFAULT_GRAPHICS_VALUES,
  getAllSettings,
  saveSettings,
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

/**
 * POST /api/pengaturan — memperbarui pengaturan pemain. Badan: { audio?,
 * graphics?, controls? } (minimal satu); hanya bagian yang dikirim yang
 * berubah. Nilai di luar aturan ditolak 400 isian_tidak_sah dengan rincian
 * per isian di `error.fields`. `controls.bindings` boleh sebagian — aksi yang
 * tidak dikirim memakai tombol bawaan. Balasan: seluruh pengaturan terbaru.
 */
export const POST = handle(async (request: Request) => {
  const checked = validateSettings(await readJsonObject(request));
  if (!checked.ok) throw validationError(checked.errors);
  const player = await currentPlayer();
  return Response.json(saveSettings(player.id, checked.value));
});
