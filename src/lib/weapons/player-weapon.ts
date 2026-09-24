import { applyUpgrades } from "@/lib/economy/weapon-modifiers";
import { findWeapon } from "@/lib/mock/weapons";
import { useShopStore } from "@/lib/store/shop-store";
import type { WeaponUpgradeState } from "@/types/economy";
import type { Weapon } from "@/types/game";

/**
 * Senjata milik PEMAIN LOKAL sebagaimana dibawa ke arena: statistik dasar
 * yang sudah dikenai upgrade dan attachment terpasang. Musuh otomatis tetap
 * memakai `findWeapon` apa adanya.
 *
 * Hasilnya di-cache per senjata selama keadaan upgrade-nya sama, supaya
 * komponen yang memanggilnya tiap render mendapat objek yang sama dan tidak
 * memicu efek ulang.
 */
const cache = new Map<string, { state: WeaponUpgradeState | undefined; weapon: Weapon }>();

export function playerWeapon(weaponId: string): Weapon {
  const base = findWeapon(weaponId);
  const state = useShopStore.getState().upgrades[base.id];
  const hit = cache.get(base.id);
  if (hit && hit.state === state) return hit.weapon;
  const weapon = applyUpgrades(base, state);
  cache.set(base.id, { state, weapon });
  return weapon;
}
