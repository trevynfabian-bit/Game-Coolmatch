import { create } from "zustand";

export interface HitMarker {
  /** Penanda waktu agar HUD bisa memicu ulang animasi tiap kena. */
  id: number;
  isHeadshot: boolean;
}

/**
 * Keadaan tembak-menembak pemain lokal. Hanya menyimpan nilai yang berubah
 * sesekali — peluru, status isi ulang, dan penanda kena. Nilai yang berubah
 * tiap frame seperti sebaran crosshair sengaja TIDAK ditaruh di sini, melainkan
 * ditulis langsung sebagai custom property CSS, supaya HUD tidak render ulang
 * 60 kali per detik.
 */
interface CombatState {
  ammoInMagazine: number;
  ammoReserve: number;
  magazineSize: number;
  isReloading: boolean;
  /** Lama isi ulang yang sedang berjalan, dipakai HUD untuk durasi animasi. */
  reloadSeconds: number;
  hitMarker: HitMarker | null;

  /** Menyiapkan amunisi awal dari potret pertandingan. */
  arm: (config: {
    ammoInMagazine: number;
    ammoReserve: number;
    magazineSize: number;
  }) => void;
  /** Mengurangi satu peluru. Mengembalikan false bila magasin kosong. */
  consumeRound: () => boolean;
  beginReload: (seconds: number) => void;
  finishReload: () => void;
  registerHit: (isHeadshot: boolean) => void;
  clearHitMarker: (id: number) => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  ammoInMagazine: 0,
  ammoReserve: 0,
  magazineSize: 0,
  isReloading: false,
  reloadSeconds: 0,
  hitMarker: null,

  arm: ({ ammoInMagazine, ammoReserve, magazineSize }) =>
    set({
      ammoInMagazine,
      ammoReserve,
      magazineSize,
      isReloading: false,
      reloadSeconds: 0,
      hitMarker: null,
    }),

  consumeRound: () => {
    const { ammoInMagazine, isReloading } = get();
    if (isReloading || ammoInMagazine <= 0) return false;
    set({ ammoInMagazine: ammoInMagazine - 1 });
    return true;
  },

  beginReload: (seconds) => {
    const { ammoInMagazine, ammoReserve, magazineSize, isReloading } = get();
    if (isReloading) return;
    if (ammoReserve <= 0 || ammoInMagazine >= magazineSize) return;
    set({ isReloading: true, reloadSeconds: seconds });
  },

  finishReload: () => {
    const { ammoInMagazine, ammoReserve, magazineSize, isReloading } = get();
    if (!isReloading) return;
    const needed = magazineSize - ammoInMagazine;
    const loaded = Math.min(needed, ammoReserve);
    set({
      ammoInMagazine: ammoInMagazine + loaded,
      ammoReserve: ammoReserve - loaded,
      isReloading: false,
      reloadSeconds: 0,
    });
  },

  registerHit: (isHeadshot) =>
    set({ hitMarker: { id: Date.now() + Math.random(), isHeadshot } }),

  clearHitMarker: (id) =>
    set((state) =>
      state.hitMarker?.id === id ? { hitMarker: null } : state,
    ),
}));
