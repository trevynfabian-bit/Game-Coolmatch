import type { WeaponUpgradeState } from "@/types/economy";

/**
 * Data tiruan toko untuk fase frontend: kepemilikan upgrade pemain. Saldonya
 * ada di mock/wallet. Nanti diganti respons /api/toko.
 */

export const MOCK_WEAPON_UPGRADES: WeaponUpgradeState[] = [
  {
    weaponId: "wpn-rifle-garuda",
    levels: { damage: 1, accuracy: 2, reload: 0 },
    ownedAttachmentIds: ["att-pegangan-vertikal"],
    equipped: { pegangan: "att-pegangan-vertikal" },
  },
  {
    weaponId: "wpn-smg-vektor",
    levels: { damage: 0, accuracy: 1, reload: 1 },
    ownedAttachmentIds: [],
    equipped: {},
  },
];

export function emptyUpgradeState(weaponId: string): WeaponUpgradeState {
  return {
    weaponId,
    levels: { damage: 0, accuracy: 0, reload: 0 },
    ownedAttachmentIds: [],
    equipped: {},
  };
}
