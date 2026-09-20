import { create } from "zustand";

/*
  Aturan uji coba TIDAK lagi ditulis di sini. Ia sudah diangkat ke
  `lib/game/trial-rules` karena server ikut menyusun pertandingan uji, dan dua
  salinan aturan yang sama adalah dua angka yang bisa berselisih. Store ini
  kembali mengurus satu hal saja: niat pemain untuk mencoba sebuah senjata.
*/
export {
  TRIAL_BOT_COUNT,
  TRIAL_DIFFICULTY,
  TRIAL_RULES,
} from "@/lib/game/trial-rules";

export interface TrialMatch {
  weaponId: string;
}

interface TrialState {
  /** Uji coba yang sedang menunggu dimulai; null berarti tidak ada. */
  pending: TrialMatch | null;
  /** Menyiapkan uji coba, dipanggil layar Coba di Arena sebelum berpindah. */
  arm: (trial: TrialMatch) => void;
  /**
   * Mengambil uji coba yang menunggu DAN menghapusnya sekaligus.
   *
   * Sekali pakai, dan itu disengaja. Kalau tidak dihapus, pemain yang menekan
   * "Main lagi" atau membuka arena besok akan mendapat aturan uji coba lagi —
   * satu ronde tujuh kill — tanpa pernah memintanya, dan tanpa petunjuk kenapa
   * pertandingannya jadi sependek itu.
   */
  consume: () => TrialMatch | null;
}

/**
 * Uji coba sengaja TIDAK disimpan ke localStorage, berbeda dengan pilihan
 * senjata, peta, dan lawan. Ini bukan preferensi yang ingin diingat pemain,
 * melainkan niat sesaat yang berlaku untuk satu perjalanan ke arena saja.
 */
export const useTrialStore = create<TrialState>((set, get) => ({
  pending: null,
  arm: (trial) => set({ pending: trial }),
  consume: () => {
    const { pending } = get();
    if (pending) set({ pending: null });
    return pending;
  },
}));
