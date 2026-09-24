import type { KeyboardControlsEntry } from "@react-three/drei";
import type { MoveAction } from "@/lib/game/controls";

/**
 * Pemetaan tombol yang bisa diatur pemain.
 *
 * Tiap aksi punya satu tombol utama yang bisa diganti, ditambah tombol
 * cadangan tetap (panah untuk gerak, papan angka untuk slot, Shift kanan).
 * Cadangan otomatis gugur bila tombolnya sudah dipakai sebagai tombol utama
 * aksi lain, jadi satu tombol tidak pernah memicu dua aksi.
 */

export type BindingGroup = "gerak" | "senjata" | "hadiah" | "lainnya";

export const BINDING_GROUPS: { id: BindingGroup; label: string }[] = [
  { id: "gerak", label: "Gerak" },
  { id: "senjata", label: "Senjata" },
  { id: "hadiah", label: "Hadiah killstreak" },
  { id: "lainnya", label: "Lainnya" },
];

export const BINDABLE_ACTIONS: { id: MoveAction; label: string; group: BindingGroup }[] = [
  { id: "forward", label: "Maju", group: "gerak" },
  { id: "backward", label: "Mundur", group: "gerak" },
  { id: "left", label: "Geser kiri", group: "gerak" },
  { id: "right", label: "Geser kanan", group: "gerak" },
  { id: "jump", label: "Lompat", group: "gerak" },
  { id: "sprint", label: "Lari", group: "gerak" },
  { id: "reload", label: "Isi ulang", group: "senjata" },
  { id: "slot1", label: "Slot senjata 1", group: "senjata" },
  { id: "slot2", label: "Slot senjata 2", group: "senjata" },
  { id: "slot3", label: "Slot senjata 3", group: "senjata" },
  { id: "slot4", label: "Slot senjata 4", group: "senjata" },
  { id: "slot5", label: "Slot senjata 5", group: "senjata" },
  { id: "streak1", label: "Hadiah pertama", group: "hadiah" },
  { id: "streak2", label: "Hadiah kedua", group: "hadiah" },
  { id: "streak3", label: "Hadiah ketiga", group: "hadiah" },
  { id: "help", label: "Petunjuk kontrol", group: "lainnya" },
];

export type KeyBindings = Record<MoveAction, string>;

export const DEFAULT_BINDINGS: KeyBindings = {
  forward: "KeyW",
  backward: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  sprint: "ShiftLeft",
  reload: "KeyR",
  help: "KeyH",
  slot1: "Digit1",
  slot2: "Digit2",
  slot3: "Digit3",
  slot4: "Digit4",
  slot5: "Digit5",
  streak1: "Digit6",
  streak2: "Digit7",
  streak3: "Digit8",
};

const ALTERNATE_KEYS: Partial<Record<MoveAction, string[]>> = {
  forward: ["ArrowUp"],
  backward: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  sprint: ["ShiftRight"],
  slot1: ["Numpad1"],
  slot2: ["Numpad2"],
  slot3: ["Numpad3"],
  slot4: ["Numpad4"],
  slot5: ["Numpad5"],
  streak1: ["Numpad6"],
  streak2: ["Numpad7"],
  streak3: ["Numpad8"],
};

/** Tombol yang sudah punya tugas tetap di luar pemetaan ini. */
export const RESERVED_KEYS: Record<string, string> = {
  Escape: "melepas kursor",
  Tab: "papan skor",
  KeyM: "bisukan suara",
  MetaLeft: "sistem",
  MetaRight: "sistem",
  F5: "muat ulang halaman",
  F11: "layar penuh",
  F12: "alat pengembang",
};

const ACTION_IDS = BINDABLE_ACTIONS.map((action) => action.id);

function isKeyCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{2,24}$/.test(value);
}

/**
 * Membersihkan pemetaan yang dibaca dari simpanan. Tombol yang tidak sah
 * kembali ke bawaan; bila hasilnya masih ada tombol ganda, seluruh pemetaan
 * kembali ke bawaan supaya tidak ada aksi yang kehilangan tombolnya.
 */
export function sanitizeBindings(value: unknown): KeyBindings {
  const raw = (value && typeof value === "object" ? value : {}) as Partial<Record<MoveAction, unknown>>;
  const result = { ...DEFAULT_BINDINGS };
  for (const id of ACTION_IDS) {
    const code = raw[id];
    if (isKeyCode(code) && !(code in RESERVED_KEYS)) result[id] = code;
  }
  const used = new Set(Object.values(result));
  return used.size === ACTION_IDS.length ? result : { ...DEFAULT_BINDINGS };
}

export type RebindResult =
  | { ok: true; bindings: KeyBindings; swappedWith: MoveAction | null }
  | { ok: false; reason: string };

/**
 * Memasang tombol baru untuk satu aksi. Bila tombol itu sudah dipakai aksi
 * lain, keduanya bertukar tombol sehingga tidak ada yang tertinggal kosong.
 */
export function rebind(bindings: KeyBindings, action: MoveAction, code: string): RebindResult {
  if (code in RESERVED_KEYS) {
    return { ok: false, reason: `${keyLabel(code)} sudah dipakai untuk ${RESERVED_KEYS[code]}.` };
  }
  if (!isKeyCode(code)) return { ok: false, reason: "Tombol ini tidak bisa dipakai." };
  const owner = ACTION_IDS.find((id) => id !== action && bindings[id] === code) ?? null;
  const next = { ...bindings, [action]: code };
  if (owner) next[owner] = bindings[action];
  return { ok: true, bindings: next, swappedWith: owner };
}

/** Pemetaan untuk drei KeyboardControls: tombol utama plus cadangan yang masih bebas. */
export function buildKeyboardMap(bindings: KeyBindings): KeyboardControlsEntry<MoveAction>[] {
  const primaries = new Set(Object.values(bindings));
  return ACTION_IDS.map((id) => ({
    name: id,
    keys: [bindings[id], ...(ALTERNATE_KEYS[id] ?? []).filter((code) => !primaries.has(code))],
  }));
}

const SPECIAL_LABELS: Record<string, string> = {
  Space: "Spasi",
  ShiftLeft: "Shift",
  ShiftRight: "Shift Kanan",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl Kanan",
  AltLeft: "Alt",
  AltRight: "Alt Kanan",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Enter: "Enter",
  Backspace: "Backspace",
  CapsLock: "Caps",
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
  Escape: "Esc",
  Tab: "Tab",
};

/** Nama tombol yang ramah dibaca, mis. "KeyW" → "W", "Digit6" → "6". */
export function keyLabel(code: string): string {
  if (code in SPECIAL_LABELS) return SPECIAL_LABELS[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}

export interface ControlHint {
  id: string;
  keys: string;
  label: string;
}

/** Keterangan tombol untuk panel bantuan, mengikuti pemetaan pemain. */
export function controlHints(bindings: KeyBindings): ControlHint[] {
  const join = (...ids: MoveAction[]) => ids.map((id) => keyLabel(bindings[id])).join(" ");
  const range = (ids: MoveAction[]) => {
    const labels = ids.map((id) => keyLabel(bindings[id]));
    const numeric = labels.every((label, index) => index === 0 || Number(label) === Number(labels[index - 1]) + 1);
    return numeric ? `${labels[0]}-${labels[labels.length - 1]}` : labels.join(" ");
  };
  return [
    { id: "move", keys: join("forward", "left", "backward", "right"), label: "Jalan" },
    { id: "look", keys: "Mouse", label: "Lihat sekitar" },
    { id: "jump", keys: keyLabel(bindings.jump), label: "Lompat" },
    { id: "sprint", keys: keyLabel(bindings.sprint), label: "Lari" },
    { id: "fire", keys: "Klik", label: "Tembak" },
    { id: "reload", keys: keyLabel(bindings.reload), label: "Isi ulang" },
    { id: "slots", keys: range(["slot1", "slot2", "slot3", "slot4", "slot5"]), label: "Tukar senjata" },
    { id: "streaks", keys: range(["streak1", "streak2", "streak3"]), label: "Panggil hadiah killstreak" },
    { id: "scoreboard", keys: "Tab", label: "Papan skor" },
    { id: "help", keys: keyLabel(bindings.help), label: "Petunjuk kontrol" },
    { id: "mute", keys: "M", label: "Bisukan suara" },
    { id: "escape", keys: "Esc", label: "Lepas kursor" },
  ];
}
