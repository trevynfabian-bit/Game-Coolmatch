import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_MAP, MOCK_MAPS } from "@/lib/mock/maps";

/** Kunci penyimpanan; diawali nama game supaya tidak bentrok di domain yang sama. */
const STORAGE_KEY = "coolmatch:peta-terpilih";
const STORAGE_VERSION = 1;

interface StoredMap {
  selectedMapId: string;
}

/**
 * Isi localStorage bisa berasal dari versi lama atau disunting tangan, jadi id
 * yang tidak dikenal katalog dijatuhkan ke peta bawaan alih-alih dipercaya.
 * Tanpa ini, peta yang dihapus dari katalog akan membuat arena gagal dimuat.
 */
function sanitizeMapId(value: unknown): string {
  return typeof value === "string" && MOCK_MAPS.some((map) => map.id === value)
    ? value
    : DEFAULT_MAP.id;
}

interface MapState extends StoredMap {
  selectMap: (mapId: string) => void;
}

/**
 * Peta yang dipilih pemain, tersimpan otomatis ke localStorage.
 *
 * Polanya sama dengan pengaturan lawan: `persist` memulihkan simpanan secara
 * sinkron saat modul dimuat, sehingga arena yang membaca `getState()` sekali
 * pada render pertama sudah mendapat nilai yang benar.
 */
export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      selectedMapId: DEFAULT_MAP.id,
      selectMap: (mapId) =>
        set((state) => {
          const next = sanitizeMapId(mapId);
          return state.selectedMapId === next ? state : { selectedMapId: next };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): StoredMap => ({ selectedMapId: state.selectedMapId }),
      merge: (persisted, current): MapState => ({
        ...current,
        selectedMapId: sanitizeMapId((persisted as Partial<StoredMap>)?.selectedMapId),
      }),
    },
  ),
);
