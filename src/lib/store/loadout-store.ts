import { create } from "zustand";
import {
  firstUnlockedWeaponId,
  isWeaponUnlocked,
} from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";

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
      if (!isWeaponUnlocked(weaponId)) return state;
      return { selectedWeaponId: weaponId };
    }),
}));
