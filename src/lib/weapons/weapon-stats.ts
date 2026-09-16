import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import type { Weapon } from "@/types/game";

export interface WeaponStatBar {
  label: string;
  /** 0..1, siap dipakai sebagai lebar bar. */
  value: number;
  /** Angka mentah beserta satuannya, untuk ditampilkan di samping bar. */
  display: string;
}

/** Nilai 0..1 terhadap rentang yang benar-benar ada di daftar senjata. */
function scale(value: number, values: number[], higherIsBetter: boolean): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 1;
  const ratio = (value - min) / (max - min);
  // Dasar 0,12 supaya senjata terlemah pun barnya masih terlihat.
  return 0.12 + 0.88 * (higherIsBetter ? ratio : 1 - ratio);
}

/**
 * Empat batang perbandingan yang menjelaskan "rasa" tiap senjata. Skalanya
 * relatif terhadap seluruh daftar senjata, bukan angka absolut, supaya
 * perbedaan antar senjata langsung terbaca.
 *
 * Sebaran dan sentakan dibalik: makin kecil angkanya, makin panjang barnya,
 * karena keduanya memang makin baik saat makin kecil.
 */
export function weaponStatBars(weapon: Weapon): WeaponStatBar[] {
  const all = MOCK_WEAPONS;
  const perShot = weapon.damage * weapon.pellets;

  return [
    {
      label: "Kerusakan",
      value: scale(
        perShot,
        all.map((w) => w.damage * w.pellets),
        true,
      ),
      display: weapon.pellets > 1 ? `${weapon.damage} x${weapon.pellets}` : `${weapon.damage}`,
    },
    {
      label: "Laju tembak",
      value: scale(
        weapon.fireRate,
        all.map((w) => w.fireRate),
        true,
      ),
      display: `${weapon.fireRate} rpm`,
    },
    {
      label: "Akurasi",
      value: scale(
        weapon.spreadDegrees,
        all.map((w) => w.spreadDegrees),
        false,
      ),
      display: `${weapon.spreadDegrees}°`,
    },
    {
      label: "Kontrol",
      value: scale(
        weapon.recoilDegrees,
        all.map((w) => w.recoilDegrees),
        false,
      ),
      display: `${weapon.recoilDegrees}°`,
    },
  ];
}

/** Kalimat singkat yang menjelaskan karakter senjata. */
export function weaponBlurb(weapon: Weapon): string {
  switch (weapon.type) {
    case "pistol":
      return "Ringan dan selalu siap. Cocok sebagai cadangan saat magasin utama kosong.";
    case "smg":
      return "Muntahan peluru paling cepat, tapi sebarannya lebar. Andalkan di jarak dekat.";
    case "rifle":
      return "Seimbang di segala jarak. Pilihan paling aman untuk menguasai panggung tengah.";
    case "shotgun":
      return `Menyemburkan ${weapon.pellets} butir sekaligus. Mematikan dari dekat, tak berguna dari jauh.`;
    case "sniper":
      return "Nyaris tanpa sebaran dan sekali tembak melumpuhkan, asal kamu sabar membidik.";
  }
}
