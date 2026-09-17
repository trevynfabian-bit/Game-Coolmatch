import type { KeyboardControlsEntry } from "@react-three/drei";
import type { MoveAction } from "@/lib/game/controls";

/**
 * Aksi yang tombolnya boleh diubah pemain.
 *
 * Tidak semua aksi masuk daftar ini. Membidik dan menembak memakai mouse;
 * Escape dipegang browser untuk melepas kunci kursor; Tab dipakai browser
 * untuk berpindah fokus, sehingga membebaninya dengan aksi lain membuat
 * halaman sulit dipakai dari papan ketik. Ketiganya tetap disebut di layar
 * Pengaturan sebagai tombol tetap, lengkap dengan alasannya — pemain berhak
 * tahu kenapa satu baris bisa diubah dan baris di sebelahnya tidak.
 */
export type BindableAction = Extract<
  MoveAction,
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "jump"
  | "sprint"
  | "reload"
  | "help"
>;

export interface BindableEntry {
  action: BindableAction;
  label: string;
  defaultCode: string;
  /**
   * Tombol yang SELALU ikut berlaku untuk aksi ini, apa pun yang diatur
   * pemain. Tombol panah dan Shift kanan sudah berlaku sejak awal, dan
   * mencabutnya diam-diam saat pemain mengubah satu tombol lain akan terasa
   * seperti kerusakan.
   */
  alternates: string[];
}

export const BINDABLE_ACTIONS: BindableEntry[] = [
  {
    action: "forward",
    label: "Maju",
    defaultCode: "KeyW",
    alternates: ["ArrowUp"],
  },
  {
    action: "backward",
    label: "Mundur",
    defaultCode: "KeyS",
    alternates: ["ArrowDown"],
  },
  {
    action: "left",
    label: "Serong kiri",
    defaultCode: "KeyA",
    alternates: ["ArrowLeft"],
  },
  {
    action: "right",
    label: "Serong kanan",
    defaultCode: "KeyD",
    alternates: ["ArrowRight"],
  },
  { action: "jump", label: "Lompat", defaultCode: "Space", alternates: [] },
  {
    action: "sprint",
    label: "Lari",
    defaultCode: "ShiftLeft",
    alternates: ["ShiftRight"],
  },
  { action: "reload", label: "Isi ulang", defaultCode: "KeyR", alternates: [] },
  {
    action: "help",
    label: "Petunjuk kontrol",
    defaultCode: "KeyH",
    alternates: [],
  },
];

/** Tombol yang tidak bisa diubah, beserta alasannya. */
export const FIXED_CONTROLS: { label: string; keys: string; reason: string }[] =
  [
    {
      label: "Lihat sekitar",
      keys: "Mouse",
      reason: "Dikendalikan gerakan mouse.",
    },
    {
      label: "Tembak",
      keys: "Klik kiri",
      reason: "Dikendalikan tombol mouse.",
    },
    {
      label: "Tukar senjata",
      keys: "1 – 5",
      reason: "Nomor slot mengikuti urutan senjata.",
    },
    {
      label: "Papan skor",
      keys: "Tab",
      reason: "Tab dipakai browser untuk berpindah fokus.",
    },
    {
      label: "Lepas kursor",
      keys: "Esc",
      reason: "Escape dipegang browser untuk melepas kunci kursor.",
    },
  ];

const BY_ACTION = new Map(
  BINDABLE_ACTIONS.map((entry) => [entry.action, entry]),
);

/** Pemetaan tombol yang sedang berlaku: aksi ke kode tombol pilihan pemain. */
export type KeyBindings = Record<BindableAction, string>;

export const DEFAULT_BINDINGS: KeyBindings = Object.fromEntries(
  BINDABLE_ACTIONS.map((entry) => [entry.action, entry.defaultCode]),
) as KeyBindings;

/** Nama tombol slot senjata, yang tidak ikut bisa diubah. */
const SLOT_ENTRIES: KeyboardControlsEntry<MoveAction>[] = [
  { name: "slot1", keys: ["Digit1", "Numpad1"] },
  { name: "slot2", keys: ["Digit2", "Numpad2"] },
  { name: "slot3", keys: ["Digit3", "Numpad3"] },
  { name: "slot4", keys: ["Digit4", "Numpad4"] },
  { name: "slot5", keys: ["Digit5", "Numpad5"] },
];

/**
 * Menyusun pemetaan untuk drei KeyboardControls dari tombol pilihan pemain.
 *
 * Inilah satu-satunya tempat pemetaan itu dibuat, jadi arena dan tempat
 * latihan mustahil berjalan dengan tombol yang berbeda.
 */
export function buildKeyboardMap(
  bindings: KeyBindings,
): KeyboardControlsEntry<MoveAction>[] {
  const bound = BINDABLE_ACTIONS.map((entry) => ({
    name: entry.action as MoveAction,
    // Tanpa kembaran: tombol pilihan pemain bisa saja sama dengan salah satu
    // tombol cadangan, dan drei tidak perlu mendengar kode yang sama dua kali.
    keys: [...new Set([bindings[entry.action], ...entry.alternates])],
  }));
  return [...bound, ...SLOT_ENTRIES];
}

/** Kode tombol yang tidak boleh dipakai, beserta alasan yang bisa dibacakan. */
const RESERVED: Record<string, string> = {
  Escape: "Escape dipakai untuk melepas kunci kursor.",
  Tab: "Tab dipakai browser untuk berpindah fokus.",
  Enter: "Enter dipakai untuk menekan tombol yang sedang terpilih.",
  NumpadEnter: "Enter dipakai untuk menekan tombol yang sedang terpilih.",
  MetaLeft: "Tombol sistem tidak bisa dipakai di dalam halaman.",
  MetaRight: "Tombol sistem tidak bisa dipakai di dalam halaman.",
  ContextMenu: "Tombol sistem tidak bisa dipakai di dalam halaman.",
};

export type RebindProblem =
  | { kind: "terlarang"; reason: string }
  | { kind: "bentrok"; withLabel: string };

/**
 * Memeriksa apakah sebuah tombol boleh dipasang pada aksi tertentu.
 *
 * Bentrokan DITOLAK, bukan ditukar diam-diam. Menukar berarti aksi lain
 * berpindah tombol tanpa diminta, dan pemain baru menyadarinya di tengah
 * pertandingan; penolakan yang menyebut aksi bentrokannya membuat ia bisa
 * memutuskan sendiri.
 */
export function checkRebind(
  bindings: KeyBindings,
  action: BindableAction,
  code: string,
): RebindProblem | null {
  if (!code) return { kind: "terlarang", reason: "Tombol itu tidak terbaca." };
  if (RESERVED[code]) return { kind: "terlarang", reason: RESERVED[code] };
  if (/^F\d{1,2}$/.test(code)) {
    return { kind: "terlarang", reason: "Tombol F1–F12 dipegang browser." };
  }

  for (const entry of BINDABLE_ACTIONS) {
    if (entry.action === action) continue;
    const dipakai = [bindings[entry.action], ...entry.alternates];
    if (dipakai.includes(code)) {
      return { kind: "bentrok", withLabel: entry.label };
    }
  }

  // Tombol cadangan aksi ini sendiri bukan bentrokan: memasang ArrowUp pada
  // Maju hanya membuat tombol yang memang sudah berlaku jadi tombol utamanya.
  return null;
}

/** Nama aksi untuk sebuah kode; dipakai menyusun pesan bentrokan. */
export function actionLabel(action: BindableAction): string {
  return BY_ACTION.get(action)?.label ?? action;
}

const NAMED_KEYS: Record<string, string> = {
  Space: "Spasi",
  ShiftLeft: "Shift kiri",
  ShiftRight: "Shift kanan",
  ControlLeft: "Ctrl kiri",
  ControlRight: "Ctrl kanan",
  AltLeft: "Alt kiri",
  AltRight: "Alt kanan",
  ArrowUp: "Panah atas",
  ArrowDown: "Panah bawah",
  ArrowLeft: "Panah kiri",
  ArrowRight: "Panah kanan",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  CapsLock: "Caps Lock",
  Backspace: "Backspace",
};

/**
 * Nama tombol yang bisa dibaca pemain.
 *
 * Bekerja dari `event.code`, bukan `event.key`, karena itulah yang dipakai
 * drei — dan karena kode tidak berubah saat Caps Lock menyala atau tata letak
 * papan ketiknya berbeda. Harganya: kode menyebut posisi fisik, jadi ia
 * diterjemahkan di sini agar pemain tidak pernah membaca "KeyW".
 */
export function keyLabel(code: string): string {
  if (NAMED_KEYS[code]) return NAMED_KEYS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}

/** Ringkasan tombol sebuah aksi, termasuk cadangan tetapnya. */
export function bindingLabel(
  bindings: KeyBindings,
  action: BindableAction,
): string {
  const entry = BY_ACTION.get(action);
  if (!entry) return "";
  const keys = [...new Set([bindings[action], ...entry.alternates])];
  return keys.map(keyLabel).join(" / ");
}

/** Urutan tombol gerak seperti dibaca pemain: maju, kiri, mundur, kanan. */
const MOVEMENT_ORDER: BindableAction[] = [
  "forward",
  "left",
  "backward",
  "right",
];

/**
 * Keempat tombol gerak sebagai satu baris, mis. "W A S D".
 *
 * Digabung karena begitulah pemain memikirkannya — satu gugus untuk berjalan,
 * bukan empat aksi terpisah. Memecahnya jadi empat baris membuat panel
 * petunjuk di arena hampir dua kali lebih panjang tanpa menjelaskan apa pun
 * yang belum jelas.
 */
export function movementKeysLabel(bindings: KeyBindings): string {
  return MOVEMENT_ORDER.map((action) => keyLabel(bindings[action])).join(" ");
}

/** Aksi selain gerak yang tombolnya bisa diubah, urut tampil di panel bantuan. */
const HINT_ORDER: BindableAction[] = ["jump", "sprint", "reload", "help"];

/**
 * Petunjuk kontrol yang mengikuti tombol pilihan pemain.
 *
 * Menggantikan daftar tetap yang dulu ditulis tangan. Begitu tombol bisa
 * diubah, daftar tetap berubah dari ringkasan menjadi kebohongan: pemain yang
 * memindahkan Lompat ke tombol lain tetap dibacakan "Spasi" oleh panel di
 * tengah pertandingan, tepat saat ia paling butuh jawaban yang benar.
 */
export function controlHints(
  bindings: KeyBindings,
): { keys: string; label: string }[] {
  const gerak = { keys: movementKeysLabel(bindings), label: "Jalan" };
  const mouse = FIXED_CONTROLS.filter((item) =>
    ["Lihat sekitar", "Tembak"].includes(item.label),
  ).map((item) => ({ keys: item.keys, label: item.label }));
  const diubah = HINT_ORDER.map((action) => ({
    keys: keyLabel(bindings[action]),
    label: actionLabel(action),
  }));
  const tetap = FIXED_CONTROLS.filter(
    (item) => !["Lihat sekitar", "Tembak"].includes(item.label),
  ).map((item) => ({ keys: item.keys, label: item.label }));

  return [gerak, ...mouse, ...diubah, ...tetap];
}

/** Benar bila seluruh tombol masih sama dengan bawaannya. */
export function isDefaultBindings(bindings: KeyBindings): boolean {
  return BINDABLE_ACTIONS.every(
    (entry) => bindings[entry.action] === entry.defaultCode,
  );
}
