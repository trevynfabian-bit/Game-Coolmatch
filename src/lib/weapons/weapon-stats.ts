import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { weaponFeel } from "@/lib/weapons/weapon-feel";
import type { Weapon } from "@/types/game";

export interface WeaponStatBar {
  label: string;
  /** 0..1, siap dipakai sebagai lebar bar. */
  value: number;
  /** Keterangan sehari-hari, bukan angka mentah. */
  display: string;
  /** Angka mentah beserta satuannya, untuk baris rincian teknis. */
  technical: string;
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
 *
 * Label di samping bar memakai kata sehari-hari; angka mentahnya tetap
 * tersimpan di `technical` untuk baris rincian yang bisa dibuka sendiri.
 */
export function weaponStatBars(weapon: Weapon): WeaponStatBar[] {
  const all = MOCK_WEAPONS;
  const feel = weaponFeel(weapon);
  const perShot = weapon.damage * weapon.pellets;

  return [
    {
      label: "Kerusakan",
      value: scale(
        perShot,
        all.map((w) => w.damage * w.pellets),
        true,
      ),
      display:
        feel.shotsToKill === 1
          ? "Sekali tembak"
          : `${feel.shotsToKill} tembakan`,
      technical:
        weapon.pellets > 1
          ? `${weapon.damage} x${weapon.pellets}`
          : `${weapon.damage}`,
    },
    {
      label: "Laju tembak",
      value: scale(
        weapon.fireRate,
        all.map((w) => w.fireRate),
        true,
      ),
      display: feel.fireRateWord,
      technical: `${weapon.fireRate} rpm`,
    },
    {
      label: "Akurasi",
      value: scale(
        weapon.spreadDegrees,
        all.map((w) => w.spreadDegrees),
        false,
      ),
      display: feel.accuracyWord,
      technical: `${weapon.spreadDegrees}°`,
    },
    {
      label: "Kontrol",
      value: scale(
        weapon.recoilDegrees,
        all.map((w) => w.recoilDegrees),
        false,
      ),
      display: feel.controlWord,
      technical: `${weapon.recoilDegrees}°`,
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
