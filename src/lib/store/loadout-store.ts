import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  firstUnlockedWeaponId,
  isWeaponUnlocked,
} from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { STORAGE_KEYS } from "@/lib/store/storage";
import { useUnlockStore } from "@/lib/store/unlock-store";

const STORAGE_KEY = STORAGE_KEYS.loadout;
const STORAGE_VERSION = 1;

/** Pilihan bawaan: senapan serbu, bila memang sudah terbuka. */
const DEFAULT_WEAPON_ID = isWeaponUnlocked(MOCK_WEAPONS[2]?.id ?? "")
  ? MOCK_WEAPONS[2].id
  : firstUnlockedWeaponId();

interface StoredLoadout {
  selectedWeaponId: string;
}

/**
 * Simpanan bisa menyebut senjata yang sudah tidak ada di katalog, atau yang
 * terbuka pada sesi lalu tetapi belum terbuka lagi sekarang — kepemilikan
 * hasil bermain memang belum ikut disimpan. Keduanya dijatuhkan ke senjata
 * bawaan alih-alih dipercaya, supaya pemain tidak pernah masuk arena memegang
 * senjata yang menurut sisa permainan masih terkunci.
 */
function sanitizeWeaponId(value: unknown): string {
  return typeof value === "string" && isWeaponUnlocked(value)
    ? value
    : DEFAULT_WEAPON_ID;
}

/**
 * Pilihan perlengkapan pemain. Untuk sekarang hanya senjata yang dibawa masuk
 * arena.
 */
interface LoadoutState extends StoredLoadout {
  /** Mengabaikan senjata yang masih terkunci, jadi pilihan selalu sah. */
  selectWeapon: (weaponId: string) => void;
}

/**
 * Senjata yang dibawa bertanding, tersimpan otomatis ke perangkat.
 *
 * Sebelumnya ini satu-satunya pilihan yang TIDAK diingat: peta, lawan, dan
 * nama semuanya bertahan, sementara senjata kembali ke bawaan tiap kali
 * halaman dimuat ulang. Akibatnya ringkasan di menu utama — yang menjanjikan
 * "inilah yang akan kamu bawa" — berubah sendiri tanpa pemain menyentuh apa
 * pun.
 */
export const useLoadoutStore = create<LoadoutState>()(
  persist(
    (set) => ({
      selectedWeaponId: DEFAULT_WEAPON_ID,
      selectWeapon: (weaponId) =>
        set((state) => {
          if (state.selectedWeaponId === weaponId) return state;
          // Termasuk senjata yang baru terbuka sesi ini. Dibaca di dalam
          // penangan, bukan saat modul dimuat: daftarnya bisa bertambah kapan
          // saja selama pemain bermain.
          if (!isWeaponUnlocked(weaponId, useUnlockStore.getState().unlocked))
            return state;
          return { selectedWeaponId: weaponId };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): StoredLoadout => ({
        selectedWeaponId: state.selectedWeaponId,
      }),
      merge: (persisted, current): LoadoutState => ({
        ...current,
        selectedWeaponId: sanitizeWeaponId(
          (persisted as Partial<StoredLoadout>)?.selectedWeaponId,
        ),
      }),
    },
  ),
);
