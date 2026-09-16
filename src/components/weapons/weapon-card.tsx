"use client";

import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import type { WeaponOwnership } from "@/lib/mock/player-weapons";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import type { Weapon } from "@/types/game";

/** Gembok kecil untuk menandai senjata yang belum terbuka. */
function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path
        d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Satu baris pada daftar senjata.
 *
 * Senjata yang sudah terbuka bisa dipilih dan kartunya menyorot terang saat
 * terpilih. Senjata terkunci tetap ditampilkan — justru itu yang membuat
 * pemain tahu ada sesuatu untuk dikejar — tetapi tombolnya dimatikan dan
 * diganti syarat membuka beserta kemajuannya.
 */
export function WeaponCard({
  weapon,
  ownership,
  selected,
  onSelect,
}: {
  weapon: Weapon;
  ownership: WeaponOwnership;
  selected: boolean;
  onSelect: () => void;
}) {
  const accent = WEAPON_SHAPES[weapon.type].accent;
  const locked = !ownership.isUnlocked;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-pressed={locked ? undefined : selected}
      aria-label={
        locked ? `${weapon.name} — terkunci, ${ownership.requirement}` : undefined
      }
      className={`relative flex w-full items-center gap-4 overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
        locked
          ? "cursor-not-allowed border-white/5 bg-slate-900/35"
          : selected
            ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]"
            : "border-white/10 bg-slate-900/60 hover:border-white/25 hover:bg-slate-900"
      }`}
    >
      {selected && !locked ? (
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      ) : null}

      <span
        className={`w-20 shrink-0 sm:w-24 ${locked ? "opacity-35" : ""}`}
        style={{ color: selected && !locked ? accent : "#64748b" }}
      >
        <WeaponSilhouette type={weapon.type} className="h-8 w-full" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={`truncate text-sm font-semibold ${
              locked ? "text-slate-500" : "text-slate-100"
            }`}
          >
            {weapon.name}
          </span>
          {locked ? (
            <LockIcon className="h-3 w-3 shrink-0 text-slate-500" />
          ) : selected ? (
            <span className="shrink-0 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
              Terpilih
            </span>
          ) : null}
        </span>

        {locked ? (
          <span className="mt-1 block">
            <span className="block text-[11px] text-amber-300/80">
              {ownership.requirement}
            </span>
            {ownership.progress !== null ? (
              <span className="mt-1 flex items-center gap-2">
                <span className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-amber-400/70"
                    style={{ width: `${ownership.progress * 100}%` }}
                  />
                </span>
                <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                  {ownership.progressLabel}
                </span>
              </span>
            ) : null}
          </span>
        ) : (
          <span className="block text-[11px] text-slate-500">
            {WEAPON_TYPE_LABEL[weapon.type]}
            <span className="text-slate-700"> · </span>
            {weapon.automatic ? "Otomatis" : "Semi"}
          </span>
        )}
      </span>

      <span className={`shrink-0 text-right ${locked ? "opacity-40" : ""}`}>
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

      <span
        className={`hidden shrink-0 text-right sm:block ${locked ? "opacity-40" : ""}`}
      >
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
