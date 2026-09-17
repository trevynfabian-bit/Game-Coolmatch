import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/store/storage";
import {
  BINDABLE_ACTIONS,
  DEFAULT_BINDINGS,
  type BindableAction,
  type KeyBindings,
} from "@/lib/game/keybinds";

/** Kunci penyimpanan; diawali nama game supaya tidak bentrok di domain yang sama. */
const STORAGE_KEY = STORAGE_KEYS.keybinds;
const STORAGE_VERSION = 1;

/**
 * Simpanan dibersihkan per aksi, bukan diterima sebagai satu gumpalan.
 * Simpanan dari versi lama bisa memuat aksi yang sudah tidak ada, atau
 * kehilangan aksi yang baru ditambahkan; keduanya cukup jatuh ke tombol
 * bawaan aksi itu sendiri tanpa membuang tombol lain yang sudah diatur pemain.
 */
function sanitizeBindings(value: unknown): KeyBindings {
  const saved = (value ?? {}) as Partial<Record<string, unknown>>;
  const hasil = { ...DEFAULT_BINDINGS };
  for (const entry of BINDABLE_ACTIONS) {
    const code = saved[entry.action];
    if (typeof code === "string" && code.length > 0) {
      hasil[entry.action] = code;
    }
  }
  return hasil;
}

interface KeybindState {
  bindings: KeyBindings;
  /** Memasang tombol pada sebuah aksi. Kesahihannya diperiksa pemanggil. */
  rebind: (action: BindableAction, code: string) => void;
  /** Mengembalikan satu aksi ke tombol bawaannya. */
  resetAction: (action: BindableAction) => void;
  /** Mengembalikan seluruh tombol ke bawaan. */
  resetAll: () => void;
}

/**
 * Tombol pilihan pemain, tersimpan otomatis ke perangkat.
 *
 * Kesahihan tombol — bentrokan dan tombol yang dipegang browser — diperiksa
 * di `checkRebind`, bukan di sini. Store menyimpan keputusan; aturannya hidup
 * sebagai fungsi murni yang bisa diuji tanpa merender atau menyimpan apa pun,
 * dan yang bisa dipakai layar mana pun yang nanti juga mengatur tombol.
 */
export const useKeybindStore = create<KeybindState>()(
  persist(
    (set) => ({
      bindings: DEFAULT_BINDINGS,

      rebind: (action, code) =>
        set((state) =>
          state.bindings[action] === code
            ? state
            : { bindings: { ...state.bindings, [action]: code } },
        ),

      resetAction: (action) =>
        set((state) =>
          state.bindings[action] === DEFAULT_BINDINGS[action]
            ? state
            : {
                bindings: {
                  ...state.bindings,
                  [action]: DEFAULT_BINDINGS[action],
                },
              },
        ),

      resetAll: () => set({ bindings: DEFAULT_BINDINGS }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ bindings: state.bindings }),
      merge: (persisted, current): KeybindState => ({
        ...current,
        bindings: sanitizeBindings(
          (persisted as { bindings?: unknown } | null)?.bindings,
        ),
      }),
    },
  ),
);
