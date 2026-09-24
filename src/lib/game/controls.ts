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
  | "reload"
  | "help"
  | "slot1"
  | "slot2"
  | "slot3"
  | "slot4"
  | "slot5"
  | "streak1"
  | "streak2"
  | "streak3";

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
  { name: "reload", keys: ["KeyR"] },
  { name: "help", keys: ["KeyH"] },
  // Slot senjata. Angka baris atas maupun papan angka sama-sama diterima.
  { name: "slot1", keys: ["Digit1", "Numpad1"] },
  { name: "slot2", keys: ["Digit2", "Numpad2"] },
  { name: "slot3", keys: ["Digit3", "Numpad3"] },
  { name: "slot4", keys: ["Digit4", "Numpad4"] },
  { name: "slot5", keys: ["Digit5", "Numpad5"] },
  // Hadiah killstreak, urut sesuai loadout: 6, 7, 8.
  { name: "streak1", keys: ["Digit6", "Numpad6"] },
  { name: "streak2", keys: ["Digit7", "Numpad7"] },
  { name: "streak3", keys: ["Digit8", "Numpad8"] },
];

/** Nama aksi hadiah killstreak, urut sesuai posisinya di loadout. */
export const STREAK_ACTIONS = ["streak1", "streak2", "streak3"] as const satisfies readonly MoveAction[];

/** Nama aksi slot senjata, urut dari slot pertama. */
export const SLOT_ACTIONS = [
  "slot1",
  "slot2",
  "slot3",
  "slot4",
  "slot5",
] as const satisfies readonly MoveAction[];

/** Keterangan tombol untuk panel bantuan di HUD. */
export const CONTROL_HINTS: { keys: string; label: string }[] = [
  { keys: "W A S D", label: "Jalan" },
  { keys: "Mouse", label: "Lihat sekitar" },
  { keys: "Spasi", label: "Lompat" },
  { keys: "Shift", label: "Lari" },
  { keys: "Klik", label: "Tembak" },
  { keys: "R", label: "Isi ulang" },
  { keys: "1-5", label: "Tukar senjata" },
  { keys: "6-8", label: "Panggil hadiah killstreak" },
  { keys: "Tab", label: "Papan skor" },
  { keys: "H", label: "Petunjuk kontrol" },
  { keys: "M", label: "Bisukan suara" },
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

/** Lama tangan berpindah senjata; selama itu pelatuk terkunci. */
export const WEAPON_SWAP_SECONDS = 0.55;
