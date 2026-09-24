import { create } from "zustand";
import { MOCK_WALLET, MOCK_WEAPON_UPGRADES, emptyUpgradeState } from "@/lib/mock/shop";
import type { Wallet, WeaponUpgradeState } from "@/types/economy";

/**
 * State toko di klien: saldo koin dan kepemilikan upgrade per senjata.
 *
 * Untuk fase frontend isinya data tiruan; lapisan backend nanti mengisinya
 * dari /api/koin dan /api/toko lewat `hydrate`, jadi komponen tidak berubah.
 */
interface ShopState {
  wallet: Wallet;
  upgrades: Record<string, WeaponUpgradeState>;
  hydrate: (input: { wallet?: Wallet; upgrades?: WeaponUpgradeState[] }) => void;
}

function indexUpgrades(list: WeaponUpgradeState[]): Record<string, WeaponUpgradeState> {
  return Object.fromEntries(list.map((item) => [item.weaponId, item]));
}

export const useShopStore = create<ShopState>((set) => ({
  wallet: { ...MOCK_WALLET },
  upgrades: indexUpgrades(MOCK_WEAPON_UPGRADES),
  hydrate: ({ wallet, upgrades }) =>
    set((state) => ({
      wallet: wallet ?? state.wallet,
      upgrades: upgrades ? indexUpgrades(upgrades) : state.upgrades,
    })),
}));

/** Kepemilikan upgrade satu senjata; senjata yang belum pernah di-upgrade dapat keadaan kosong. */
export function upgradeStateOf(
  upgrades: Record<string, WeaponUpgradeState>,
  weaponId: string,
): WeaponUpgradeState {
  return upgrades[weaponId] ?? emptyUpgradeState(weaponId);
}
