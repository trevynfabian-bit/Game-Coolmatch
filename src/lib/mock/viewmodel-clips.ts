import { recoilClipFor, recoilStyleFor } from "@/lib/game/recoil-scale";
import { RELOAD_STYLES } from "@/lib/game/reload-anim";
import type { ViewmodelClips } from "@/lib/game/viewmodel-anim";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import type { Weapon, WeaponType } from "@/types/game";

/**
 * Data tiruan gerakan senjata per jenis.
 *
 * Bentuknya meniru katalog animasi yang nanti bisa datang dari server atau
 * berkas aset: satu kelompok angka untuk tiap senjata, dibaca kontroler
 * animasi apa adanya. Sampai katalog itu ada, angka-angka di sini yang
 * dipakai — dan karena bentuknya sudah sama, yang perlu diganti nanti hanya
 * sumber datanya, bukan kontrolernya.
 *
 * Angkanya mengikuti watak yang sudah ditetapkan di tempat lain: shotgun dan
 * sniper menyentak paling keras, SMG paling ringan, dan senjata yang isi
 * ulangnya lama diturunkan lebih dalam dari pandangan.
 *
 * Bagian SENTAKAN tidak ditulis di sini sama sekali. Ia diturunkan dari data
 * senjatanya — sentakan kamera, kecepatan tembak, dan isi magasin — supaya
 * menyeimbangkan sebuah senjata lewat datanya ikut terbawa ke tampilannya,
 * dan urutan "senjata mana yang paling menyentak" tidak mungkin berbeda
 * antara kamera dan senjatanya.
 */

type GerakanDasar = Omit<ViewmodelClips, "recoil" | "recoilStyle">;

const DASAR: GerakanDasar = {
  idle: { bob: 0.014, sway: 0.01, rate: 1.25 },
  walk: { bob: 0.05, sway: 0.028, rate: 1.65, fullSpeed: 6 },
  reload: { drop: 0.3, tilt: 0.55 },
  reloadStyle: RELOAD_STYLES.rifle,
  swap: { drop: 0.55, tilt: 0.75 },
};

/** Gerakan selain sentakan, yang memang masih ditulis tangan per jenis. */
const GERAKAN: Record<WeaponType, GerakanDasar> = {
  pistol: {
    ...DASAR,
    reload: { drop: 0.26, tilt: 0.5 },
    reloadStyle: RELOAD_STYLES.pistol,
  },
  smg: {
    ...DASAR,
    idle: { bob: 0.012, sway: 0.009, rate: 1.35 },
    reload: { drop: 0.28, tilt: 0.52 },
    reloadStyle: RELOAD_STYLES.smg,
  },
  rifle: DASAR,
  // Shotgun: isi ulangnya paling lama sehingga senjatanya turun paling dalam.
  shotgun: {
    ...DASAR,
    idle: { bob: 0.016, sway: 0.011, rate: 1.1 },
    reload: { drop: 0.42, tilt: 0.7 },
    reloadStyle: RELOAD_STYLES.shotgun,
  },
  sniper: {
    ...DASAR,
    idle: { bob: 0.018, sway: 0.012, rate: 0.95 },
    walk: { bob: 0.058, sway: 0.032, rate: 1.5, fullSpeed: 6 },
    reload: { drop: 0.4, tilt: 0.68 },
    reloadStyle: RELOAD_STYLES.sniper,
  },
};

/** Gerakan lengkap sebuah senjata: yang ditulis tangan, plus sentakan dari datanya. */
export function clipsForWeapon(weapon: Weapon): ViewmodelClips {
  return {
    ...(GERAKAN[weapon.type] ?? DASAR),
    recoil: recoilClipFor(weapon),
    recoilStyle: recoilStyleFor(weapon),
  };
}

export const MOCK_VIEWMODEL_CLIPS: Record<WeaponType, ViewmodelClips> =
  MOCK_WEAPONS.reduce(
    (kumpulan, weapon) => {
      kumpulan[weapon.type] = clipsForWeapon(weapon);
      return kumpulan;
    },
    {} as Record<WeaponType, ViewmodelClips>,
  );

/** Gerakan untuk sebuah senjata; jenis tak dikenal memakai senapan serbu. */
export function clipsFor(type: WeaponType | null | undefined): ViewmodelClips {
  if (!type) return MOCK_VIEWMODEL_CLIPS.rifle;
  return MOCK_VIEWMODEL_CLIPS[type] ?? MOCK_VIEWMODEL_CLIPS.rifle;
}
