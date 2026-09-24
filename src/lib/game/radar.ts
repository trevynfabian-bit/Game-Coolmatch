/**
 * Hitungan radar mini: mengubah posisi dunia menjadi titik di layar radar
 * yang berpusat pada pemain dan berputar mengikuti arah pandangnya (arah
 * pandang selalu ke atas radar).
 */

export interface RadarBlip {
  id: string;
  x: number;
  z: number;
  color: string;
  /** Musuh yang sedang menembak berkedip lebih terang. */
  isFiring?: boolean;
}

/** Jangkauan radar dalam satuan dunia, dari pusat ke tepi. */
export const RADAR_RANGE = 28;

/**
 * Titik radar untuk posisi dunia (x, z), dalam koordinat -1..1 (bisa di luar
 * rentang bila di luar jangkauan). y negatif berarti di depan pemain.
 */
export function toRadar(
  dx: number,
  dz: number,
  heading: number,
  range = RADAR_RANGE,
): { x: number; y: number; distance: number } {
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  // Proyeksi ke sumbu kanan dan depan pemain.
  const right = -dx * cos + dz * sin;
  const forward = dx * sin + dz * cos;
  return { x: right / range, y: -forward / range, distance: Math.hypot(dx, dz) };
}
