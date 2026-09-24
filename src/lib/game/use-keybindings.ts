"use client";

import { useMemo } from "react";
import type { MoveAction } from "@/lib/game/controls";
import { buildKeyboardMap, controlHints, keyLabel } from "@/lib/game/keybindings";
import { useSettingsStore } from "@/lib/store/settings-store";

/** Pemetaan KeyboardControls dari tata tombol pemain; stabil selama tata tombolnya sama. */
export function useKeyboardMap() {
  const bindings = useSettingsStore((state) => state.controls.bindings);
  return useMemo(() => buildKeyboardMap(bindings), [bindings]);
}

/** Keterangan tombol untuk panel bantuan, mengikuti tata tombol pemain. */
export function useControlHints() {
  const bindings = useSettingsStore((state) => state.controls.bindings);
  return useMemo(() => controlHints(bindings), [bindings]);
}

/** Nama tombol yang sedang dipasang untuk satu aksi, mis. "R". */
export function useActionKey(action: MoveAction): string {
  return keyLabel(useSettingsStore((state) => state.controls.bindings[action]));
}
