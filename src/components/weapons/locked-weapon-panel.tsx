"use client";

import Link from "next/link";
import type { WeaponOwnership } from "@/lib/mock/player-weapons";
import { useTrialStore } from "@/lib/store/trial-store";
import type { Weapon } from "@/types/game";

/**
 * Panel detail senjata terkunci: syarat membuka dalam bahasa awam, kemajuan
 * menuju syarat itu, sisa yang harus dikejar, dan jalan pintas mencoba
 * senjatanya dulu di mode uji coba.
 */
export function LockedWeaponPanel({ weapon, ownership }: { weapon: Weapon; ownership: WeaponOwnership }) {
  const setTrialWeapon = useTrialStore((state) => state.setWeapon);
  const progress = ownership.progress ?? 0;
  const [current, target] = (ownership.progressLabel ?? "0 / 0").split("/").map((part) => Number(part.trim()));
  const remaining = Math.max(0, (target || 0) - (current || 0));

  return (
    <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3" role="region" aria-label={`Syarat membuka ${weapon.name}`}>
      <p className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-amber-300 uppercase">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
          <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Masih terkunci
      </p>
      <p className="mt-1.5 text-sm font-semibold text-white">{ownership.requirement}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-amber-400" style={{ width: `${progress * 100}%` }} />
        </span>
        <span className="font-mono text-[11px] text-slate-300 tabular-nums">{ownership.progressLabel}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">
        {remaining > 0 ? `Tinggal ${remaining} lagi. Terus bertanding di arena untuk mengejarnya.` : "Syarat hampir terpenuhi."}
        {" "}Latihan dan uji coba tidak dihitung.
      </p>
      <Link
        href="/uji"
        onClick={() => setTrialWeapon(weapon.id)}
        className="mt-3 block rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        Coba dulu di uji coba
      </Link>
    </div>
  );
}
