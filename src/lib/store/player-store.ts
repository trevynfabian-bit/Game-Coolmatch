import { create } from "zustand";

/**
 * State pemain yang perlu dibaca komponen React di luar loop render. Sengaja
 * hanya menampung nilai diskrit (berubah sesekali), bukan posisi per frame,
 * supaya HUD tidak ikut render ulang 60 kali per detik.
 */
interface PlayerState {
  /** Benar saat kursor terkunci dan kontrol gerak aktif. */
  isLocked: boolean;
  /** Benar setelah pemain pernah mengunci kursor minimal sekali. */
  hasEngaged: boolean;
  isSprinting: boolean;
  isAirborne: boolean;
  /** Panel petunjuk kontrol sedang tampil di dalam permainan. */
  hintsVisible: boolean;
  /** Papan skor penuh sedang dibuka (tombol Tab ditahan). */
  scoreboardOpen: boolean;
  /** Frame per detik terakhir yang terukur; nol berarti belum ada ukuran. */
  fps: number;
  setLocked: (locked: boolean) => void;
  setMotion: (motion: { isSprinting: boolean; isAirborne: boolean }) => void;
  setHintsVisible: (visible: boolean) => void;
  toggleHints: () => void;
  setScoreboardOpen: (open: boolean) => void;
  /** Disetel sekali per detik oleh penghitung di dalam kanvas. */
  setFps: (fps: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isLocked: false,
  hasEngaged: false,
  isSprinting: false,
  isAirborne: false,
  hintsVisible: false,
  scoreboardOpen: false,
  fps: 0,
  setLocked: (locked) =>
    set((state) => ({
      isLocked: locked,
      hasEngaged: state.hasEngaged || locked,
      // Saat kursor lepas, hentikan indikator gerak supaya HUD tidak bohong
      // dan tutup papan skor agar tidak tertinggal terbuka.
      isSprinting: locked ? state.isSprinting : false,
      scoreboardOpen: locked ? state.scoreboardOpen : false,
    })),
  setMotion: ({ isSprinting, isAirborne }) =>
    set((state) =>
      state.isSprinting === isSprinting && state.isAirborne === isAirborne
        ? state
        : { isSprinting, isAirborne },
    ),
  setHintsVisible: (visible) =>
    set((state) =>
      state.hintsVisible === visible ? state : { hintsVisible: visible },
    ),
  toggleHints: () => set((state) => ({ hintsVisible: !state.hintsVisible })),
  setScoreboardOpen: (open) =>
    set((state) =>
      state.scoreboardOpen === open ? state : { scoreboardOpen: open },
    ),
  setFps: (fps) => set((state) => (state.fps === fps ? state : { fps })),
}));
