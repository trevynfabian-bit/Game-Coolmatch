import { playerWeapon } from "@/lib/weapons/player-weapon";
import { useCombatStore } from "@/lib/store/combat-store";
import type { MatchSnapshot, Weapon } from "@/types/game";

/**
 * Cadangan bawaan untuk senjata yang baru pertama kali dipegang: tiga magasin
 * penuh. Dihitung dari kapasitas senjatanya sendiri supaya pistol bermagasin
 * kecil tidak mendapat cadangan sebanyak senapan serbu.
 */
export function defaultReserveFor(weapon: Weapon): number {
  return weapon.magazineSize * 3;
}

/**
 * Menyiapkan amunisi pemain dari sebuah potret pertandingan.
 *
 * Isi magasin awal dijepit ke kapasitas senjata yang benar-benar dibawa, sebab
 * angka pada potret mengacu pada senjata bawaan yang magasinnya bisa lebih
 * besar. Dikumpulkan di satu tempat karena dipanggil dari pemuatan arena,
 * tempat latihan, dan tombol "Main lagi".
 */
export function armPlayerFrom(snapshot: MatchSnapshot) {
  const local = snapshot.fighters.find((fighter) => fighter.isLocal);
  const weapon = playerWeapon(local?.weaponId ?? "");

  useCombatStore.getState().arm({
    weaponId: weapon.id,
    ammoInMagazine: Math.min(snapshot.ammoInMagazine, weapon.magazineSize),
    ammoReserve: snapshot.ammoReserve,
    magazineSize: weapon.magazineSize,
  });
}

/**
 * Mengisi penuh senjata yang SEDANG dipegang. Dipakai saat ronde baru dimulai
 * dan saat pemain muncul kembali — memakai potret pertandingan di situ akan
 * memaksa pemain kembali ke senjata bawaan, padahal ia mungkin sudah menukarnya
 * di tengah pertandingan.
 */
export function refillActiveWeapon() {
  const combat = useCombatStore.getState();
  const weapon = playerWeapon(combat.activeWeaponId);

  combat.arm({
    weaponId: weapon.id,
    ammoInMagazine: weapon.magazineSize,
    ammoReserve: defaultReserveFor(weapon),
    magazineSize: weapon.magazineSize,
  });
}
