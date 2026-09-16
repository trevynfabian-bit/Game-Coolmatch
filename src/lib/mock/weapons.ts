import type { Weapon } from "@/types/game";

/**
 * Daftar senjata tiruan untuk fase frontend. Nanti digantikan baris tabel
 * `weapons` dari database lewat API.
 */
export const MOCK_WEAPONS: Weapon[] = [
  {
    id: "wpn-pistol-p9",
    name: "P9 Ringkas",
    type: "pistol",
    damage: 24,
    fireRate: 400,
    magazineSize: 12,
    reloadSeconds: 1.4,
    imageUrl: null,
  },
  {
    id: "wpn-smg-vektor",
    name: "Vektor Cepat",
    type: "smg",
    damage: 18,
    fireRate: 900,
    magazineSize: 30,
    reloadSeconds: 1.9,
    imageUrl: null,
  },
  {
    id: "wpn-rifle-garuda",
    name: "Garuda AR",
    type: "rifle",
    damage: 33,
    fireRate: 620,
    magazineSize: 30,
    reloadSeconds: 2.3,
    imageUrl: null,
  },
  {
    id: "wpn-shotgun-badai",
    name: "Badai 12",
    type: "shotgun",
    damage: 82,
    fireRate: 90,
    magazineSize: 8,
    reloadSeconds: 3.1,
    imageUrl: null,
  },
  {
    id: "wpn-sniper-elang",
    name: "Elang Runcing",
    type: "sniper",
    damage: 110,
    fireRate: 45,
    magazineSize: 5,
    reloadSeconds: 3.6,
    imageUrl: null,
  },
];

export function findWeapon(weaponId: string): Weapon {
  const weapon = MOCK_WEAPONS.find((item) => item.id === weaponId);
  // Fallback ke pistol supaya HUD tidak pernah kosong saat id tidak dikenal.
  return weapon ?? MOCK_WEAPONS[0];
}
