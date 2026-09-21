import { RELOAD_STYLES } from "@/lib/game/reload-anim";
import type { ViewmodelClips } from "@/lib/game/viewmodel-anim";
import type { WeaponType } from "@/types/game";

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
 */

const DASAR: ViewmodelClips = {
  idle: { bob: 0.014, sway: 0.01, rate: 1.25 },
  walk: { bob: 0.05, sway: 0.028, rate: 1.65, fullSpeed: 6 },
  recoil: { kick: 0.075, rise: 0.09, seconds: 0.16 },
  reload: { drop: 0.3, tilt: 0.55 },
  reloadStyle: RELOAD_STYLES.rifle,
  swap: { drop: 0.55, tilt: 0.75 },
};

export const MOCK_VIEWMODEL_CLIPS: Record<WeaponType, ViewmodelClips> = {
  pistol: {
    ...DASAR,
    recoil: { kick: 0.06, rise: 0.085, seconds: 0.14 },
    reload: { drop: 0.26, tilt: 0.5 },
    reloadStyle: RELOAD_STYLES.pistol,
  },
  // SMG menembak paling sering: sentakannya paling ringan dan paling singkat,
  // kalau tidak senjatanya tidak pernah sempat kembali ke tempatnya.
  smg: {
    ...DASAR,
    idle: { bob: 0.012, sway: 0.009, rate: 1.35 },
    recoil: { kick: 0.045, rise: 0.055, seconds: 0.09 },
    reload: { drop: 0.28, tilt: 0.52 },
    reloadStyle: RELOAD_STYLES.smg,
  },
  rifle: {
    ...DASAR,
    recoil: { kick: 0.08, rise: 0.095, seconds: 0.15 },
  },
  // Shotgun: sentakan paling besar, dan isi ulangnya paling lama sehingga
  // senjatanya turun paling dalam.
  shotgun: {
    ...DASAR,
    idle: { bob: 0.016, sway: 0.011, rate: 1.1 },
    recoil: { kick: 0.16, rise: 0.19, seconds: 0.3 },
    reload: { drop: 0.42, tilt: 0.7 },
    reloadStyle: RELOAD_STYLES.shotgun,
  },
  sniper: {
    ...DASAR,
    idle: { bob: 0.018, sway: 0.012, rate: 0.95 },
    walk: { bob: 0.058, sway: 0.032, rate: 1.5, fullSpeed: 6 },
    recoil: { kick: 0.18, rise: 0.22, seconds: 0.34 },
    reload: { drop: 0.4, tilt: 0.68 },
    reloadStyle: RELOAD_STYLES.sniper,
  },
};

/** Gerakan untuk sebuah senjata; jenis tak dikenal memakai senapan serbu. */
export function clipsFor(type: WeaponType | null | undefined): ViewmodelClips {
  if (!type) return MOCK_VIEWMODEL_CLIPS.rifle;
  return MOCK_VIEWMODEL_CLIPS[type] ?? MOCK_VIEWMODEL_CLIPS.rifle;
}
