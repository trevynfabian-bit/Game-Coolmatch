import type { PlayerBounds } from "@/lib/game/collision";

/** Nama aksi gerak. Dipakai bersama oleh drei KeyboardControls dan controller. */
export type MoveAction =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "jump"
  | "sprint"
  | "reload"
  | "help"
  | "slot1"
  | "slot2"
  | "slot3"
  | "slot4"
  | "slot5";

/*
 * Pemetaan tombol dan daftar petunjuknya TIDAK lagi tinggal di sini. Keduanya
 * sekarang disusun dari tombol pilihan pemain di `keybinds.ts` — daftar tetap
 * di sini akan menyebut tombol bawaan kepada pemain yang sudah mengubahnya.
 */

/** Nama aksi slot senjata, urut dari slot pertama. */
export const SLOT_ACTIONS = [
  "slot1",
  "slot2",
  "slot3",
  "slot4",
  "slot5",
] as const satisfies readonly MoveAction[];

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

/** Lama tangan berpindah senjata; selama itu pelatuk terkunci. */
export const WEAPON_SWAP_SECONDS = 0.55;
