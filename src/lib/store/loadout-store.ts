import { create } from "zustand";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";

/**
 * Pilihan perlengkapan pemain. Untuk sekarang hanya senjata yang dibawa masuk
 * arena; penyimpanan permanen ke profil adalah bagian fase identitas pemain.
 */
interface LoadoutState {
  selectedWeaponId: string;
  selectWeapon: (weaponId: string) => void;
}

export const useLoadoutStore = create<LoadoutState>((set) => ({
  selectedWeaponId: MOCK_WEAPONS[2]?.id ?? MOCK_WEAPONS[0].id,
  selectWeapon: (weaponId) =>
    set((state) =>
      state.selectedWeaponId === weaponId ? state : { selectedWeaponId: weaponId },
    ),
}));
