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
   * Arah hadap mendatar pemain dalam radian, konvensi yang sama dengan yaw
   * musuh (nol menghadap +Z). Dibaca penunjuk arah kena tiap frame supaya
   * busurnya terus menunjuk ke penembak saat pemain menoleh.
   */
  facingYaw: number;
} = {
  planarSpeed: 0,
  isAirborne: false,
  position: [0, 0, 0],
  facingYaw: 0,
};
