/**
 * Posisi helikopter dukungan yang sedang terbang, ditulis tiap frame oleh
 * komponen helikopter. Dibaca radar dan AI tembaknya tanpa lewat state React.
 */
export const helicopterRuntime: {
  active: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
} = { active: false, x: 0, y: 0, z: 0, yaw: 0 };
