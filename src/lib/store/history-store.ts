import { create } from "zustand";
import { MOCK_HISTORY } from "@/lib/mock/history";
import type { HistoryMatch } from "@/types/history";

/**
 * Riwayat pertandingan pemain di klien. Fase frontend memakai data tiruan;
 * lapisan backend nanti memuatnya dari /api/riwayat lewat `hydrate`.
 */
interface HistoryState {
  matches: HistoryMatch[];
  hydrate: (matches: HistoryMatch[]) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  matches: MOCK_HISTORY,
  hydrate: (matches) => set({ matches }),
}));
