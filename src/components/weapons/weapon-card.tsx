"use client";

import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import type { Weapon } from "@/types/game";

/**
 * Satu baris pada daftar senjata: siluet, nama, jenis, dan dua angka yang
 * paling cepat membedakan senjata. Rincian lengkapnya muncul di panel kanan
 * begitu kartu ini dipilih.
 */
export function WeaponCard({
  weapon,
  selected,
  onSelect,
}: {
  weapon: Weapon;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = WEAPON_SHAPES[weapon.type].accent;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
        selected
          ? "border-emerald-400/60 bg-emerald-500/10"
          : "border-white/10 bg-slate-900/60 hover:border-white/25 hover:bg-slate-900"
      }`}
    >
      <span
        className="w-20 shrink-0 sm:w-24"
        style={{ color: selected ? accent : "#64748b" }}
      >
        <WeaponSilhouette type={weapon.type} className="h-8 w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-100">
          {weapon.name}
        </span>
        <span className="block text-[11px] text-slate-500">
          {WEAPON_TYPE_LABEL[weapon.type]}
          <span className="text-slate-700"> · </span>
          {weapon.automatic ? "Otomatis" : "Semi"}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm text-slate-200 tabular-nums">
          {weapon.damage}
          {weapon.pellets > 1 ? (
            <span className="text-[10px] text-slate-500"> x{weapon.pellets}</span>
          ) : null}
        </span>
        <span className="block text-[10px] tracking-wider text-slate-500 uppercase">
          Damage
        </span>
      </span>

      <span className="hidden shrink-0 text-right sm:block">
        <span className="block font-mono text-sm text-slate-200 tabular-nums">
          {weapon.magazineSize}
        </span>
        <span className="block text-[10px] tracking-wider text-slate-500 uppercase">
          Magasin
        </span>
      </span>
    </button>
  );
}
