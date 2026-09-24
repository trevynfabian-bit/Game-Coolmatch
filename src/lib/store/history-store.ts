import { create } from "zustand";
import { MOCK_HISTORY } from "@/lib/mock/history";
import type { HistoryMatch } from "@/types/history";

/**
 * Riwayat pertandingan pemain di klien, beserta status pemuatannya supaya
 * halaman bisa menampilkan keadaan memuat, galat, dan data cadangan.
 *
 * Fase frontend memuat data tiruan; lapisan backend mengganti isi `load`
 * dengan pengambilan /api/riwayat.
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
    await new Promise((resolve) => setTimeout(resolve, 150));
    set({ matches: MOCK_HISTORY, status: "ready" });
  },

  hydrate: (matches) => set({ matches, status: "ready", error: null }),
}));
