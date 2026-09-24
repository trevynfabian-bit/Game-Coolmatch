import type { Vec3 } from "@/types/game";

/**
 * Nilai gerak pemain yang berubah tiap frame. Sengaja disimpan sebagai objek
 * biasa di luar React: sistem senjata butuh kecepatan dan posisi terbaru tiap
 * frame untuk menghitung sebaran, dan menyalurkannya lewat state React hanya
 * akan memicu render ulang puluhan kali per detik tanpa guna.
 *
 * PlayerController yang menulis; pembaca lain hanya membaca.
 */
export const playerRuntime: {
  planarSpeed: number;
  isAirborne: boolean;
  position: Vec3;
  /**
   * Arah hadap mendatar dalam radian, atan2(arah.x, arah.z): nol menghadap +Z.
   * Dipakai radar mini untuk memutar peta mengikuti pandangan pemain.
   */
  heading: number;
} = {
  planarSpeed: 0,
  isAirborne: false,
  position: [0, 0, 0],
  heading: 0,
};
