"use client";

import { useState } from "react";
import { WEAPON_UNLOCK_RULES } from "@/lib/game/weapon-unlock";
import { useWeaponStore } from "@/lib/store/weapon-store";
import { findWeapon } from "@/lib/mock/weapons";

/**
 * Ringkasan pembukaan senjata sesudah pertandingan: untuk tiap senjata yang
 * masih terkunci, kemajuan sebelum pertandingan ini, tambahannya (kill atau
 * kemenangan barusan), dan apakah syaratnya kini terpenuhi.
 *
 * Kemajuan awal adalah statistik pemain dari server yang termuat sebelum
 * pertandingan ini; toko senjata dimuat ulang sesudah hasilnya tersimpan.
 */
export function WeaponProgressSummary({ kills, won }: { kills: number; won: boolean }) {
  // Dipotret sekali saat layar akhir muncul.
  const [before] = useState(() => ({ ...useWeaponStore.getState().progress }));
  const gained = { totalKills: kills, wins: won ? 1 : 0 };

  const rows = WEAPON_UNLOCK_RULES.filter((rule) => before[rule.stat] < rule.target).map((rule) => {
    const was = before[rule.stat];
    const now = was + gained[rule.stat];
    return { rule, was, now, unlocked: now >= rule.target, weapon: findWeapon(rule.weaponId) };
  });
  if (rows.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3" aria-labelledby="judul-kemajuan-senjata">
      <h3 id="judul-kemajuan-senjata" className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
        Kemajuan senjata
      </h3>
      <ul className="mt-2 space-y-2">
        {rows.map(({ rule, was, now, unlocked, weapon }) => (
          <li key={rule.weaponId}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-200">
                {weapon.name}
                <span className="text-slate-500"> · {rule.label}</span>
              </span>
              {unlocked ? (
                <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-slate-950 uppercase">
                  Terbuka!
                </span>
              ) : (
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {Math.min(now, rule.target)}/{rule.target}
                  {now > was ? <span className="text-emerald-300"> +{now - was}</span> : null}
                </span>
              )}
            </div>
            <span className="relative mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/60" style={{ width: `${Math.min(1, now / rule.target) * 100}%` }} />
              <span className="absolute inset-y-0 left-0 rounded-full bg-amber-400" style={{ width: `${Math.min(1, was / rule.target) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
