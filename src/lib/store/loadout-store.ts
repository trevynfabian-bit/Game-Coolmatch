import { create } from "zustand";
import {
  firstUnlockedWeaponId,
  isWeaponUnlocked,
} from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { useUnlockStore } from "@/lib/store/unlock-store";

/** Pilihan bawaan: senapan serbu, bila memang sudah terbuka. */
const DEFAULT_WEAPON_ID = isWeaponUnlocked(MOCK_WEAPONS[2]?.id ?? "")
  ? MOCK_WEAPONS[2].id
  : firstUnlockedWeaponId();

/**
 * Pilihan perlengkapan pemain. Untuk sekarang hanya senjata yang dibawa masuk
 * arena; penyimpanan permanen ke profil adalah bagian fase identitas pemain.
 */
interface LoadoutState {
  selectedWeaponId: string;
  /** Mengabaikan senjata yang masih terkunci, jadi pilihan selalu sah. */
  selectWeapon: (weaponId: string) => void;
}

export const useLoadoutStore = create<LoadoutState>((set) => ({
  selectedWeaponId: DEFAULT_WEAPON_ID,
  selectWeapon: (weaponId) =>
    set((state) => {
      if (state.selectedWeaponId === weaponId) return state;
      // Termasuk senjata yang baru terbuka sesi ini. Dibaca di dalam
      // penangan, bukan saat modul dimuat: daftarnya bisa bertambah kapan saja
      // selama pemain bermain.
      if (!isWeaponUnlocked(weaponId, useUnlockStore.getState().unlocked))
        return state;
      return { selectedWeaponId: weaponId };
    }),
}));
