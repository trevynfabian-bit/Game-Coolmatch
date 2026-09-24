import type { WeaponUpgradeState } from "@/types/economy";

/** Keadaan upgrade senjata yang belum pernah disentuh pemain. */
export function emptyUpgradeState(weaponId: string): WeaponUpgradeState {
  return {
    weaponId,
    levels: { damage: 0, accuracy: 0, reload: 0 },
    ownedAttachmentIds: [],
    equipped: {},
  };
}
