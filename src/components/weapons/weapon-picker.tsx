"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LockedWeaponPanel } from "@/components/weapons/locked-weapon-panel";
import { WeaponCard } from "@/components/weapons/weapon-card";
import { WeaponPreview } from "@/components/weapons/weapon-preview";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import { killSummary, weaponFeel } from "@/lib/weapons/weapon-feel";
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
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1">
      <span className="text-[11px] tracking-wider text-slate-400 uppercase">
        {label}
      </span>
      <span className="text-[11px] font-medium text-slate-200">{display}</span>
      <span className="col-start-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full transition-[width] duration-300"
          style={{ width: `${value * 100}%`, backgroundColor: accent }}
        />
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
  /** Senjata terkunci yang sedang dilihat rinciannya; null = lihat pilihan aktif. */
  const [viewingLockedId, setViewingLockedId] = useState<string | null>(null);

  const selected = useMemo(
    () => findWeapon(viewingLockedId ?? selectedWeaponId),
    [viewingLockedId, selectedWeaponId],
  );
  const selectedOwnership = weaponOwnership(selected.id);
  const viewingLocked = !selectedOwnership.isUnlocked;
  const bars = useMemo(() => weaponStatBars(selected), [selected]);
  const feel = useMemo(() => weaponFeel(selected), [selected]);
  const accent = WEAPON_SHAPES[selected.type].accent;
  const unlockedCount = useMemo(
    () => MOCK_WEAPONS.filter((weapon) => weaponOwnership(weapon.id).isUnlocked)
      .length,
    [],
  );

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
        <div>
          <p className="mb-3 text-[11px] text-slate-500">
            {unlockedCount} dari {MOCK_WEAPONS.length} senjata terbuka
            {unlockedCount < MOCK_WEAPONS.length ? (
              <span className="text-slate-600">
                {" "}
                · sisanya terbuka seiring kamu main
              </span>
            ) : null}
          </p>
          <ul className="space-y-2">
          {MOCK_WEAPONS.map((weapon) => (
            <li key={weapon.id}>
              <WeaponCard
                weapon={weapon}
                ownership={weaponOwnership(weapon.id)}
                selected={weapon.id === selected.id}
                onSelect={() => {
                  if (weaponOwnership(weapon.id).isUnlocked) {
                    setViewingLockedId(null);
                    selectWeapon(weapon.id);
                  } else {
                    setViewingLockedId(weapon.id);
                  }
                }}
              />
            </li>
            ))}
          </ul>
        </div>

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

          <p
            className="mt-4 rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              borderColor: `${accent}55`,
              backgroundColor: `${accent}14`,
              color: accent,
            }}
          >
            {killSummary(feel)}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {/* Baris kepala dilewati saat sekali tembak badan pun sudah cukup. */}
            {feel.shotsToKill > 1 ? (
              <>
                Kena kepala: {feel.shotsToKillHeadshot} tembakan
                <span className="text-slate-700"> · </span>
              </>
            ) : null}
            {feel.rangeWord}
          </p>

          <div className="mt-5 space-y-3">
            {bars.map((bar) => (
              <StatRow key={bar.label} {...bar} accent={accent} />
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
            <div>
              <dt className="text-[10px] tracking-wider text-slate-500 uppercase">
                Muat peluru
              </dt>
              <dd className="text-slate-200">
                {selected.magazineSize} butir per magasin
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-wider text-slate-500 uppercase">
                Isi ulang
              </dt>
              <dd className="text-slate-200">
                {feel.reloadWord}
                <span className="text-slate-500">
                  {" "}
                  ({selected.reloadSeconds.toFixed(1)} dtk)
                </span>
              </dd>
            </div>
          </dl>

          <details className="mt-4 border-t border-white/10 pt-3">
            <summary className="cursor-pointer list-none text-[11px] text-slate-500 transition-colors hover:text-slate-300">
              Rincian teknis
            </summary>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400">
              {bars.map((bar) => (
                <div key={bar.label} className="contents">
                  <dt className="text-slate-500">{bar.label}</dt>
                  <dd className="text-right text-slate-300 tabular-nums">
                    {bar.technical}
                  </dd>
                </div>
              ))}
              <dt className="text-slate-500">Mode</dt>
              <dd className="text-right text-slate-300">
                {selected.automatic ? "otomatis" : "semi"}
              </dd>
            </dl>
          </details>

          {viewingLocked ? (
            <LockedWeaponPanel weapon={selected} ownership={selectedOwnership} />
          ) : (
            <Link
              href="/arena"
              className="mt-6 block rounded-lg bg-emerald-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Bawa {selected.name} ke arena
            </Link>
          )}
          <Link
            href="/latihan"
            className="mt-2 block rounded-lg border border-white/20 px-5 py-2.5 text-center text-sm font-semibold text-slate-100 transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Coba dulu di tempat latihan
          </Link>
          <Link
            href="/"
            className="mt-2 block rounded-lg px-5 py-2 text-center text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Kembali ke menu
          </Link>
        </aside>
      </div>
    </div>
  );
}
