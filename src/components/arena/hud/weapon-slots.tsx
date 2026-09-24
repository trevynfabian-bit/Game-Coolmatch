"use client";

import { swapSlotsFor } from "@/components/arena/weapon-swap";
import { useServerMatchStore } from "@/lib/store/server-match-store";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import { useCombatStore } from "@/lib/store/combat-store";
import { usePlayerStore } from "@/lib/store/player-store";
import { WEAPON_SHAPES } from "@/lib/weapons/weapon-shape";

/**
 * Deretan slot senjata di bawah-tengah layar, lengkap dengan nomor tombolnya.
 * Slot yang sedang dipegang disorot; selama tangan masih berpindah senjata,
 * seluruh deret diredupkan supaya jelas pelatuk sedang terkunci.
 */
export function WeaponSlots() {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const activeWeaponId = useCombatStore((state) => state.activeWeaponId);
  const isSwapping = useCombatStore((state) => state.isSwapping);

  const isTrial = useServerMatchStore((state) => state.isTrial);
  const slots = swapSlotsFor(isTrial);

  if (!isLocked || slots.length < 2) return null;

  return (
    <div
      className={`pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 transition-opacity duration-150 sm:bottom-20 ${
        isSwapping ? "opacity-45" : "opacity-100"
      }`}
    >
      <ul className="flex items-end gap-1.5 md:gap-2">
        {slots.map((weapon, index) => {
          const active = weapon.id === activeWeaponId;
          const accent = WEAPON_SHAPES[weapon.type].accent;

          return (
            <li
              key={weapon.id}
              className={`flex w-14 flex-col items-center gap-1 rounded-lg border px-2 py-1.5 backdrop-blur-sm transition-colors lg:w-28 ${
                active
                  ? "border-white/25 bg-slate-900/85"
                  : "border-white/10 bg-slate-950/55"
              }`}
            >
              <span
                className="w-full"
                style={{ color: active ? accent : "#58657a" }}
              >
                <WeaponSilhouette type={weapon.type} className="h-5 w-full" />
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`rounded px-1 font-mono text-[10px] ${
                    active
                      ? "bg-white/15 text-slate-100"
                      : "bg-white/5 text-slate-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`hidden truncate text-[10px] lg:inline ${
                    active ? "text-slate-100" : "text-slate-500"
                  }`}
                >
                  {weapon.name}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {isSwapping ? (
        <p className="mt-1.5 text-center text-[10px] tracking-[0.2em] text-amber-300 uppercase">
          Mengganti senjata
        </p>
      ) : null}
    </div>
  );
}
