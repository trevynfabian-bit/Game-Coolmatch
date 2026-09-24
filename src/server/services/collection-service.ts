import { SKINS } from "@/lib/economy/skin-catalog";
import { evaluateWeaponUnlocks } from "@/server/services/weapon-unlock-service";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { listFavorites } from "@/server/services/favorite-service";
import { getPlayerUpgrades } from "@/server/services/shop-service";
import { getSkinCollection, getSkinCollectionReport } from "@/server/services/skin-service";
import type { SkinCollection, WeaponUpgradeState } from "@/types/economy";

/**
 * Seluruh koleksi pemain dalam satu balasan untuk galeri: senjata (terbuka
 * atau belum, skin terpasang, upgrade, attachment), skin yang dimiliki,
 * attachment per senjata, dan favorit.
 */
export interface CollectionWeapon {
  weaponId: string;
  unlocked: boolean;
  requirement: string | null;
  skinId: string | null;
  upgrades: WeaponUpgradeState;
  isFavorite: boolean;
}

export interface PlayerCollection {
  weapons: CollectionWeapon[];
  skins: SkinCollection;
  ownedSkins: { skinId: string; purchasedAt: number; equippedOn: string[]; isFavorite: boolean }[];
  upgrades: WeaponUpgradeState[];
  favorites: string[];
  totals: {
    weaponsUnlocked: number;
    weaponsTotal: number;
    skinsOwned: number;
    skinsTotal: number;
    attachmentsOwned: number;
  };
}

export function getPlayerCollection(playerId: number): PlayerCollection {
  const upgrades = getPlayerUpgrades(playerId);
  const skins = getSkinCollection(playerId);
  const report = getSkinCollectionReport(playerId);
  const favorites = listFavorites(playerId);
  const fav = new Set(favorites);
  const byWeapon = new Map(upgrades.map((item) => [item.weaponId, item]));
  // Kepemilikan dari evaluasi pembukaan: yang sudah tercatat terbuka tetap terbuka.
  const ownershipById = new Map(evaluateWeaponUnlocks(playerId).weapons.map((item) => [item.id, item.ownership]));

  const weapons = MOCK_WEAPONS.map((weapon) => {
    const ownership = ownershipById.get(weapon.id) ?? { isUnlocked: true, requirement: null };
    return {
      weaponId: weapon.id,
      unlocked: ownership.isUnlocked,
      requirement: ownership.requirement,
      skinId: skins.equipped[weapon.id] ?? null,
      upgrades: byWeapon.get(weapon.id) ?? {
        weaponId: weapon.id,
        levels: { damage: 0, accuracy: 0, reload: 0 },
        ownedAttachmentIds: [],
        equipped: {},
      },
      isFavorite: fav.has(`senjata:${weapon.id}`),
    };
  });

  return {
    weapons,
    skins,
    ownedSkins: report.owned.map((entry) => ({
      skinId: entry.skin.id,
      purchasedAt: entry.purchasedAt,
      equippedOn: entry.equippedOn,
      isFavorite: fav.has(`skin:${entry.skin.id}`),
    })),
    upgrades,
    favorites,
    totals: {
      weaponsUnlocked: weapons.filter((item) => item.unlocked).length,
      weaponsTotal: weapons.length,
      skinsOwned: skins.ownedSkinIds.length,
      skinsTotal: SKINS.length,
      attachmentsOwned: upgrades.reduce((sum, item) => sum + item.ownedAttachmentIds.length, 0),
    },
  };
}
