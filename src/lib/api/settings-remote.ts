import { apiFetch } from "@/lib/api/client";
import type { AudioSettings, ControlSettings, GraphicsSettings } from "@/lib/store/settings-store";

/**
 * Penyimpan pengaturan ke server (/api/pengaturan): audio, grafis, dan
 * kontrol dikirim bersama; hasilnya satu bentuk supaya pemanggil cukup membaca
 * ok/gagal.
 *
 * Di mode pengembangan kegagalan bisa dipaksa lewat
 * `window.__gagalSimpanPengaturan = true` untuk menguji notifikasi gagal simpan.
 */
export type RemoteSaveResult = { ok: true; savedAt: number } | { ok: false; message: string };

/** Potret pengaturan lengkap yang disimpan ke server. */
export interface RemoteSettingsPayload {
  audio: AudioSettings;
  graphics: GraphicsSettings;
  controls: ControlSettings;
}

interface RemoteSettings extends RemoteSettingsPayload {
  updatedAt: { audio: number | null; settings: number | null };
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
  const response = await apiFetch<RemoteSettings>("/api/pengaturan", { method: "POST", body: payload });
  if (!response.ok) return { ok: false, message: response.message };
  const { audio, settings } = response.data.updatedAt;
  return { ok: true, savedAt: Math.max(audio ?? 0, settings ?? 0) };
}

/**
 * Bagian pengaturan yang pernah disimpan di server. Bagian yang masih bawaan
 * tidak dikembalikan, supaya pilihan di perangkat ini tidak tertimpa nilai
 * bawaan. Null bila server tak terjangkau.
 */
export async function loadSettingsRemote(): Promise<(Partial<RemoteSettingsPayload> & { savedAt: number }) | null> {
  const response = await apiFetch<RemoteSettings & { degraded?: boolean }>("/api/pengaturan");
  if (!response.ok || response.data.degraded) return null;
  const { audio, graphics, controls, updatedAt } = response.data;
  return {
    ...(updatedAt.audio != null ? { audio } : {}),
    ...(updatedAt.settings != null ? { graphics, controls } : {}),
    /** Waktu simpan terbaru di server; 0 bila belum pernah menyimpan apa pun. */
    savedAt: Math.max(updatedAt.audio ?? 0, updatedAt.settings ?? 0),
  };
}
