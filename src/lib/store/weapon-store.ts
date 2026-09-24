import { useCallback } from "react";
import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import {
  EMPTY_PROGRESS,
  computeOwnership,
  type WeaponOwnership,
  type WeaponProgress,
} from "@/lib/game/weapon-unlock";

/**
 * Kemajuan membuka senjata milik pemain, dimuat dari /api/senjata. Selama
 * belum termuat, kemajuan dianggap nol: senjata bersyarat tampil terkunci,
 * tidak pernah sebaliknya.
 */
interface WeaponState {
  progress: WeaponProgress;
  /**
   * Kepemilikan per senjata menurut server — termasuk senjata yang sudah
   * tercatat terbuka walau syaratnya kelak berubah. Null sebelum termuat.
   */
  ownership: Record<string, WeaponOwnership> | null;
  status: "idle" | "loading" | "ready" | "error";
  load: () => Promise<void>;
}

export const useWeaponStore = create<WeaponState>((set, get) => ({
  progress: EMPTY_PROGRESS,
  ownership: null,
  status: "idle",
  load: async () => {
    if (get().status === "idle") set({ status: "loading" });
    const response = await apiFetch<{
      progress: WeaponProgress;
      weapons: { id: string; ownership: WeaponOwnership }[];
      degraded?: boolean;
    }>("/api/senjata");
    if (!response.ok || response.data.degraded) {
      set({ status: get().status === "ready" ? "ready" : "error" });
      return;
    }
    set({
      progress: response.data.progress,
      ownership: Object.fromEntries(response.data.weapons.map((weapon) => [weapon.id, weapon.ownership])),
      status: "ready",
    });
  },
}));

/** Kepemilikan satu senjata saat ini (tidak berlangganan; pakai hook di komponen). */
export function weaponOwnership(weaponId: string): WeaponOwnership {
  const { ownership, progress } = useWeaponStore.getState();
  return ownership?.[weaponId] ?? computeOwnership(weaponId, progress);
}

export function isWeaponUnlocked(weaponId: string): boolean {
  return weaponOwnership(weaponId).isUnlocked;
}

/** Senjata terbuka pertama, dipakai sebagai cadangan pilihan yang sah. */
export function firstUnlockedWeaponId(): string {
  const unlocked = MOCK_WEAPONS.find((weapon) => isWeaponUnlocked(weapon.id));
  return unlocked?.id ?? MOCK_WEAPONS[0].id;
}

/** Fungsi kepemilikan yang ikut memperbarui komponen begitu kemajuan termuat. */
export function useWeaponOwnership(): (weaponId: string) => WeaponOwnership {
  const progress = useWeaponStore((state) => state.progress);
  const ownership = useWeaponStore((state) => state.ownership);
  return useCallback(
    (weaponId: string) => ownership?.[weaponId] ?? computeOwnership(weaponId, progress),
    [ownership, progress],
  );
}
