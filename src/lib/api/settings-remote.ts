import { apiFetch } from "@/lib/api/client";
import type { AudioSettings, ControlSettings, GraphicsSettings } from "@/lib/store/settings-store";

/**
 * Penyimpan pengaturan ke server. Bagian yang sudah punya endpoint dikirim ke
 * sana (audio: /api/pengaturan/audio); hasilnya satu bentuk supaya pemanggil
 * cukup membaca ok/gagal.
 *
 * Di mode pengembangan kegagalan bisa dipaksa lewat
 * `window.__gagalSimpanPengaturan = true` untuk menguji notifikasi gagal simpan.
 */
export type RemoteSaveResult = { ok: true; savedAt: number } | { ok: false; message: string };

/** Potret pengaturan lengkap; bagian yang belum punya endpoint belum ikut terkirim. */
export interface RemoteSettingsPayload {
  audio: AudioSettings;
  graphics: GraphicsSettings;
  controls: ControlSettings;
}

function forcedFailure(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    (window as unknown as { __gagalSimpanPengaturan?: boolean }).__gagalSimpanPengaturan === true
  );
}

export async function saveSettingsRemote(payload: RemoteSettingsPayload): Promise<RemoteSaveResult> {
  if (forcedFailure()) return { ok: false, message: "server tidak menjawab" };
  const response = await apiFetch<{ updatedAt: number }>("/api/pengaturan/audio", {
    method: "POST",
    body: payload.audio,
  });
  return response.ok ? { ok: true, savedAt: response.data.updatedAt } : { ok: false, message: response.message };
}

/** Pengaturan tersimpan di server; null bila pemain belum pernah menyimpan atau server tak terjangkau. */
export async function loadSettingsRemote(): Promise<{ audio: AudioSettings; updatedAt: number } | null> {
  const response = await apiFetch<{ audio: AudioSettings; updatedAt: number | null; degraded?: boolean }>(
    "/api/pengaturan/audio",
  );
  if (!response.ok || response.data.degraded || response.data.updatedAt == null) return null;
  return { audio: response.data.audio, updatedAt: response.data.updatedAt };
}
