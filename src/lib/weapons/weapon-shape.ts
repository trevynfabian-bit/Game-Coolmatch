import type { WeaponType } from "@/types/game";

/**
 * Proporsi bentuk senjata per jenis, dalam satuan relatif.
 *
 * Satu sumber dipakai bersama oleh siluet SVG di kartu dan pratinjau 3D, jadi
 * gambar kecil dan gambar besarnya tidak pernah menggambarkan senjata berbeda.
 */
export interface WeaponShape {
  /** Panjang badan senjata. */
  bodyLength: number;
  bodyHeight: number;
  barrelLength: number;
  barrelThickness: number;
  /** Punya popor di belakang. */
  hasStock: boolean;
  /** Punya teropong di atas. */
  hasScope: boolean;
  /** Tinggi magasin; nol berarti tanpa magasin menonjol. */
  magazineDepth: number;
  accent: string;
}

export const WEAPON_SHAPES: Record<WeaponType, WeaponShape> = {
  pistol: {
    bodyLength: 0.42,
    bodyHeight: 0.15,
    barrelLength: 0.18,
    barrelThickness: 0.055,
    hasStock: false,
    hasScope: false,
    magazineDepth: 0.2,
    accent: "#94a3b8",
  },
  smg: {
    bodyLength: 0.62,
    bodyHeight: 0.15,
    barrelLength: 0.3,
    barrelThickness: 0.055,
    hasStock: true,
    hasScope: false,
    magazineDepth: 0.32,
    accent: "#38bdf8",
  },
  rifle: {
    bodyLength: 0.78,
    bodyHeight: 0.16,
    barrelLength: 0.5,
    barrelThickness: 0.06,
    hasStock: true,
    hasScope: false,
    magazineDepth: 0.3,
    accent: "#34d399",
  },
  shotgun: {
    bodyLength: 0.72,
    bodyHeight: 0.2,
    barrelLength: 0.56,
    barrelThickness: 0.095,
    hasStock: true,
    hasScope: false,
    magazineDepth: 0.12,
    accent: "#fb923c",
  },
  sniper: {
    bodyLength: 0.9,
    bodyHeight: 0.15,
    barrelLength: 0.78,
    barrelThickness: 0.05,
    hasStock: true,
    hasScope: true,
    magazineDepth: 0.22,
    accent: "#c084fc",
  },
};

/** Label jenis senjata dalam bahasa Indonesia. */
export const WEAPON_TYPE_LABEL: Record<WeaponType, string> = {
  pistol: "Pistol",
  smg: "SMG",
  rifle: "Senapan serbu",
  shotgun: "Shotgun",
  sniper: "Penembak jitu",
};
