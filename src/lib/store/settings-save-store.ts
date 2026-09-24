import { create } from "zustand";
import { saveSettingsRemote, type RemoteSettingsPayload } from "@/lib/api/settings-remote";

/**
 * Status penyimpanan pengaturan. Pengaturan SELALU langsung berlaku di
 * perangkat ini; yang dilacak di sini hanya apakah salinannya berhasil
 * tersimpan (ke server, dan ke localStorage). Kalau gagal, nilai yang baru
 * dipilih tetap dipakai — tidak pernah dikembalikan — dan pemain diberi tahu
 * lengkap dengan tombol coba lagi.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 700;

interface SaveState {
  status: SaveStatus;
  message: string | null;
  lastSavedAt: number | null;
  /** Browser menolak menulis localStorage (mode privat, kuota penuh). */
  localFailed: boolean;
  /** Pemain sudah menutup notifikasi untuk kegagalan saat ini. */
  dismissed: boolean;
  queueSave: (snapshot: RemoteSettingsPayload) => void;
  retry: () => void;
  dismiss: () => void;
  reportLocal: (ok: boolean) => void;
  /**
   * Mengirim simpanan yang masih tertunda seketika dengan `keepalive`, untuk
   * dipanggil saat halaman ditutup supaya perubahan terakhir tidak hilang.
   */
  flushOnExit: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: RemoteSettingsPayload | null = null;
let latest: RemoteSettingsPayload | null = null;
let attempt = 0;

async function flush(set: (patch: Partial<SaveState>) => void) {
  const snapshot = pending;
  pending = null;
  if (!snapshot) return;
  latest = snapshot;
  const id = ++attempt;
  set({ status: "saving" });
  const result = await saveSettingsRemote(snapshot);
  // Perubahan yang lebih baru sudah berangkat; hasil lama tidak berarti lagi.
  if (id !== attempt) return;
  if (result.ok) set({ status: "saved", message: null, lastSavedAt: result.savedAt, dismissed: false });
  else set({ status: "error", message: result.message, dismissed: false });
}

export const useSettingsSaveStore = create<SaveState>((set) => ({
  status: "idle",
  message: null,
  lastSavedAt: null,
  localFailed: false,
  dismissed: false,
  queueSave: (snapshot) => {
    pending = snapshot;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(set), DEBOUNCE_MS);
  },
  retry: () => {
    if (timer) clearTimeout(timer);
    pending = pending ?? latest;
    void flush(set);
  },
  dismiss: () => set({ dismissed: true }),
  flushOnExit: () => {
    if (!timer || !pending) return;
    clearTimeout(timer);
    timer = undefined;
    const snapshot = pending;
    pending = null;
    latest = snapshot;
    try {
      void fetch("/api/pengaturan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Halaman sedang ditutup; tidak ada yang bisa dilakukan lagi.
    }
  },
  reportLocal: (ok) =>
    set((state) => (state.localFailed === !ok ? state : { localFailed: !ok, dismissed: false })),
}));
