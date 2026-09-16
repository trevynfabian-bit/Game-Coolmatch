import type { KeyboardControlsEntry } from "@react-three/drei";
import type { PlayerBounds } from "@/lib/game/collision";

/** Nama aksi gerak. Dipakai bersama oleh drei KeyboardControls dan controller. */
export type MoveAction =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "jump"
  | "sprint"
  | "help";

/**
 * Pemetaan tombol bawaan. Menyertakan huruf kecil dan besar supaya tetap jalan
 * saat Caps Lock aktif, plus tombol panah sebagai alternatif WASD.
 */
export const KEYBOARD_MAP: KeyboardControlsEntry<MoveAction>[] = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
  { name: "jump", keys: ["Space"] },
  { name: "sprint", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "help", keys: ["KeyH"] },
];

/** Keterangan tombol untuk panel bantuan di HUD. */
export const CONTROL_HINTS: { keys: string; label: string }[] = [
  { keys: "W A S D", label: "Jalan" },
  { keys: "Mouse", label: "Lihat sekitar" },
  { keys: "Spasi", label: "Lompat" },
  { keys: "Shift", label: "Lari" },
  { keys: "H", label: "Petunjuk kontrol" },
  { keys: "Esc", label: "Lepas kursor" },
];

/** Ukuran badan pemain yang dipakai penyelesai tabrakan. */
export const PLAYER_BOUNDS: PlayerBounds = {
  radius: 0.34,
  height: 1.8,
  stepHeight: 0.85,
};

/** Tinggi mata dari telapak kaki. */
export const EYE_HEIGHT = 1.62;

/** Angka penyetel rasa gerak. Semua dalam satuan dunia per detik. */
export const MOVEMENT = {
  walkSpeed: 5.6,
  sprintSpeed: 8.4,
  /** Gravitasi ke bawah; dipasangkan dengan jumpVelocity untuk tinggi lompat. */
  gravity: 24,
  /** 8.8 m/s pada gravitasi 24 memberi apex ~1.6 unit, cukup naik ke atas krat. */
  jumpVelocity: 8.8,
  /** Seberapa cepat kecepatan mendatar mengejar masukan, saat menjejak tanah. */
  groundAccel: 16,
  /** Kendali di udara sengaja jauh lebih kecil agar lompatan terasa berbobot. */
  airAccel: 2.8,
  /** Amplitudo dan laju ayunan kepala saat berjalan. */
  bobAmplitude: 0.045,
  bobFrequency: 9.5,
} as const;

/** Lama petunjuk kontrol tampil otomatis saat pemain pertama kali masuk. */
export const HINT_AUTO_SHOW_MS = 7000;
