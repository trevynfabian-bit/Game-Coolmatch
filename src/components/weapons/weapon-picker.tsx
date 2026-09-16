"use client";

import Link from "next/link";
import { useMemo } from "react";
import { WeaponCard } from "@/components/weapons/weapon-card";
import { WeaponPreview } from "@/components/weapons/weapon-preview";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import { weaponBlurb, weaponStatBars } from "@/lib/weapons/weapon-stats";

function StatRow({
  label,
  value,
  display,
  accent,
}: {
  label: string;
  value: number;
  display: string;
  accent: string;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-3">
      <span className="text-[11px] tracking-wider text-slate-400 uppercase">
        {label}
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full transition-[width] duration-300"
          style={{ width: `${value * 100}%`, backgroundColor: accent }}
        />
      </span>
      <span className="text-right font-mono text-[11px] text-slate-300 tabular-nums">
        {display}
      </span>
    </div>
  );
}

/**
 * Halaman pilih senjata: daftar seluruh senjata di kiri, rincian senjata
 * terpilih beserta pratinjau 3D-nya di kanan. Sumber datanya masih daftar
 * tiruan; ketika backend siap, `MOCK_WEAPONS` tinggal diganti hasil
 * pengambilan tabel `weapons`.
 */
export function WeaponPicker() {
  const selectedWeaponId = useLoadoutStore((state) => state.selectedWeaponId);
  const selectWeapon = useLoadoutStore((state) => state.selectWeapon);

  const selected = useMemo(() => findWeapon(selectedWeaponId), [selectedWeaponId]);
  const bars = useMemo(() => weaponStatBars(selected), [selected]);
  const accent = WEAPON_SHAPES[selected.type].accent;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Persiapan bertanding
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Pilih Senjata
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Tiap senjata punya rasa tembakan berbeda. Bandingkan kerusakan, laju
          tembak, akurasi, dan kontrolnya sebelum masuk arena.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-2">
          {MOCK_WEAPONS.map((weapon) => (
            <li key={weapon.id}>
              <WeaponCard
                weapon={weapon}
                selected={weapon.id === selectedWeaponId}
                onSelect={() => selectWeapon(weapon.id)}
              />
            </li>
          ))}
        </ul>

        <aside className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <div className="rounded-lg bg-slate-950/50">
            <WeaponPreview weapon={selected} />
          </div>

          <p className="mt-4 text-[10px] tracking-[0.2em] uppercase" style={{ color: accent }}>
            {WEAPON_TYPE_LABEL[selected.type]}
            <span className="text-slate-600"> · </span>
            <span className="text-slate-500">
              {selected.automatic ? "Otomatis" : "Semi otomatis"}
            </span>
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">{selected.name}</h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {weaponBlurb(selected)}
          </p>

          <div className="mt-5 space-y-2.5">
            {bars.map((bar) => (
              <StatRow key={bar.label} {...bar} accent={accent} />
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
            <div>
              <dt className="text-[10px] tracking-wider text-slate-500 uppercase">
                Magasin
              </dt>
              <dd className="font-mono text-slate-200">
                {selected.magazineSize} peluru
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-wider text-slate-500 uppercase">
                Isi ulang
              </dt>
              <dd className="font-mono text-slate-200">
                {selected.reloadSeconds.toFixed(1)} detik
              </dd>
            </div>
          </dl>

          <Link
            href="/arena"
            className="mt-6 block rounded-lg bg-emerald-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Bawa {selected.name} ke arena
          </Link>
          <Link
            href="/"
            className="mt-2 block rounded-lg border border-white/15 px-5 py-2.5 text-center text-xs font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Kembali ke menu
          </Link>
        </aside>
      </div>
    </div>
  );
}
