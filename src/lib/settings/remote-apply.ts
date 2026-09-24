import type { RemoteSettingsPayload } from "@/lib/api/settings-remote";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Menerapkan pengaturan dari server ke store klien dengan aturan "yang lebih
 * baru menang". Dipakai saat sesi dibuka dan saat pertandingan dimulai (server
 * mengirim pengaturan bersama payload pertandingan).
 */

const LOCAL_TIME_KEY = "coolmatch:pengaturan-waktu";
let applying = false;

/** Benar selama pengaturan server sedang diterapkan (bukan perubahan pemain). */
export function isApplyingServerSettings(): boolean {
  return applying;
}

/** Kapan pengaturan di perangkat ini terakhir diubah (epoch ms); 0 bila tidak diketahui. */
export function readLocalSettingsTime(): number {
  try {
    const value = Number(localStorage.getItem(LOCAL_TIME_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function writeLocalSettingsTime(at: number) {
  try {
    localStorage.setItem(LOCAL_TIME_KEY, String(at));
  } catch {
    // Tanpa penyimpanan: server dianggap lebih baru pada sesi berikutnya.
  }
}

/**
 * Menerapkan bagian pengaturan server bila tidak lebih lama dari perubahan
 * terakhir di perangkat ini. Mengembalikan true bila diterapkan.
 */
export function applyServerSettings(saved: Partial<RemoteSettingsPayload> & { savedAt: number }): boolean {
  if (saved.savedAt < readLocalSettingsTime()) return false;
  const store = useSettingsStore.getState();
  applying = true;
  try {
    if (saved.audio) store.setAudio(saved.audio);
    if (saved.graphics) store.setGraphics(saved.graphics);
    if (saved.controls) store.setControls(saved.controls);
  } finally {
    applying = false;
  }
  if (saved.savedAt > 0) writeLocalSettingsTime(saved.savedAt);
  return true;
}
