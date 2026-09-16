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
    automatic: false,
    pellets: 1,
    spreadDegrees: 1.1,
    recoilDegrees: 0.85,
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
    automatic: true,
    pellets: 1,
    spreadDegrees: 2.0,
    recoilDegrees: 0.5,
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
    automatic: true,
    pellets: 1,
    spreadDegrees: 1.3,
    recoilDegrees: 0.75,
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
    automatic: false,
    pellets: 8,
    spreadDegrees: 5.5,
    recoilDegrees: 2.6,
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
    automatic: false,
    pellets: 1,
    spreadDegrees: 0.25,
    recoilDegrees: 3.2,
    imageUrl: null,
  },
];

export function findWeapon(weaponId: string): Weapon {
  const weapon = MOCK_WEAPONS.find((item) => item.id === weaponId);
  // Fallback ke pistol supaya HUD tidak pernah kosong saat id tidak dikenal.
  return weapon ?? MOCK_WEAPONS[0];
}
