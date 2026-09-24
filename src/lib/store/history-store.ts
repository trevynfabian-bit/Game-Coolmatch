import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import type { HistoryMatch } from "@/types/history";

/**
 * Riwayat pertandingan pemain di klien, beserta status pemuatannya supaya
 * halaman bisa menampilkan keadaan memuat, galat, dan data cadangan.
 *
 * Dimuat dari /api/riwayat (100 pertandingan terakhir). Bila database sedang
 * bermasalah server mengirim daftar kosong bertanda `degraded`, dan halaman
 * menampilkan keadaan cadangannya.
 */
export type HistoryStatus = "idle" | "loading" | "ready" | "degraded" | "error";

interface HistoryState {
  matches: HistoryMatch[];
  status: HistoryStatus;
  error: string | null;
  load: () => Promise<void>;
  hydrate: (matches: HistoryMatch[]) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  matches: [],
  status: "idle",
  error: null,

  load: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    const response = await apiFetch<{ matches: HistoryMatch[]; degraded?: boolean }>("/api/riwayat?limit=100");
    if (!response.ok) {
      set({ status: "error", error: response.message });
      return;
    }
    set({ matches: response.data.matches, status: response.data.degraded ? "degraded" : "ready" });
  },

  hydrate: (matches) => set({ matches, status: "ready", error: null }),
}));
