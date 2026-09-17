import { create } from "zustand";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";

/** Membuang id yang tidak dikenal katalog, sekaligus menghapus kembaran. */
function sanitizeIds(value: string[]): string[] {
  const dikenal = new Set(MOCK_WEAPONS.map((weapon) => weapon.id));
  return [...new Set(value.filter((id) => dikenal.has(id)))];
}

interface UnlockState {
  /**
   * Senjata yang terbuka DALAM sesi ini, di luar yang sudah terbuka sejak
   * awal. Sengaja tidak disimpan ke localStorage: kemajuan bermain sendiri
   * belum disimpan ke mana pun, jadi menyimpan hasilnya berarti berjanji
   * sesuatu yang tidak ditopang apa-apa — pemain akan kembali besok dengan
   * senjata yang katanya terbuka tetapi statistik yang tidak pernah berubah.
   * Ketika layer backend menyimpan `player_stats` dan `player_weapons`,
   * daftar inilah yang diganti jawabannya dari server.
   */
  unlocked: string[];
  /** Senjata yang notifikasi terbukanya belum ditampilkan, urut kedatangan. */
  pending: string[];
  /**
   * Mencatat senjata yang baru terbuka dan mengantrekan notifikasinya.
   * Senjata yang sudah tercatat dilewati, jadi memeriksanya dua kali untuk
   * pertandingan yang sama tidak menghasilkan dua notifikasi.
   */
  celebrate: (weaponIds: string[]) => void;
  /** Menutup notifikasi terdepan. */
  dismissFirst: () => void;
}

/**
 * Senjata yang terbuka karena pemain memainkannya, beserta antrean
 * notifikasinya.
 *
 * Kepemilikan dicatat saat pertandingan usai, BUKAN saat pemain menutup
 * notifikasinya. Senjata itu dibuka oleh pertandingan yang sudah ia mainkan;
 * menahannya sampai sebuah tombol ditekan berarti pemain yang menutup tab
 * lebih dulu kehilangan sesuatu yang sudah jadi haknya.
 */
export const useUnlockStore = create<UnlockState>((set, get) => ({
  unlocked: [],
  pending: [],
  celebrate: (weaponIds) => {
    const sudah = new Set(get().unlocked);
    const baru = sanitizeIds(weaponIds).filter((id) => !sudah.has(id));
    if (baru.length === 0) return;
    set((state) => ({
      unlocked: [...state.unlocked, ...baru],
      pending: [...state.pending, ...baru],
    }));
  },
  dismissFirst: () =>
    set((state) =>
      state.pending.length === 0 ? state : { pending: state.pending.slice(1) },
    ),
}));

/**
 * Daftar senjata yang terbuka dalam sesi ini, untuk dioper ke `weaponOwnership`.
 *
 * Aman dipanggil saat render: nilainya mulai dari daftar kosong baik di server
 * maupun di browser, jadi hasil prerender dan hasil hidrasi selalu sama. Ia
 * baru terisi sesudah sebuah pertandingan usai, dan pada saat itu tidak ada
 * lagi render server yang perlu dicocokkan.
 */
export function useEarnedWeapons(): string[] {
  return useUnlockStore((state) => state.unlocked);
}
