"use client";

import Link from "next/link";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { DIFFICULTY_ORDER, difficultyProfile } from "@/lib/game/difficulty";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { WeaponPreview } from "@/components/weapons/weapon-preview";
import { weaponBlurb, weaponStatBars } from "@/lib/weapons/weapon-stats";
import {
  TRIAL_ROUND_SECONDS,
  TRIAL_SCORE_LIMIT,
  useTrialStore,
} from "@/lib/store/trial-store";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";

/**
 * Menu utama mode uji coba: pilih senjata mana saja (yang terkunci pun boleh
 * dicoba), jumlah dan tingkat lawan, lalu masuk simulasi kilat satu ronde.
 * Hasilnya tidak dihitung ke statistik, pembukaan senjata, maupun koin.
 */
export function TrialMenu() {
  const {
    weaponId,
    botCount,
    difficulty,
    setWeapon,
    setBotCount,
    setDifficulty,
  } = useTrialStore();
  const selected = findWeapon(weaponId);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-[10px] tracking-[0.3em] text-sky-300 uppercase">
        Mode uji coba
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
        Uji Coba Senjata
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
        Simulasi kilat {TRIAL_ROUND_SECONDS} detik melawan musuh sungguhan. Coba
        senjata apa saja — termasuk yang belum terbuka — sebelum memutuskan
        mengejarnya. Hasilnya tidak mengubah progres.
      </p>
      <p className="mt-3 inline-block rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] text-sky-200">
        Tanpa koin · tanpa statistik · tanpa pembukaan senjata
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="judul-senjata-uji">
          <h2
            id="judul-senjata-uji"
            className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase"
          >
            Senjata yang dicoba
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {MOCK_WEAPONS.map((weapon) => {
              const selected = weapon.id === weaponId;
              const locked = !weaponOwnership(weapon.id).isUnlocked;
              return (
                <li key={weapon.id}>
                  <button
                    type="button"
                    onClick={() => setWeapon(weapon.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-sky-400/70 bg-sky-500/10"
                        : "border-white/10 bg-slate-900/60 hover:border-white/25"
                    }`}
                  >
                    <span
                      className="block rounded-lg bg-slate-950/60 px-3 py-3"
                      style={{ color: WEAPON_SHAPES[weapon.type].accent }}
                    >
                      <SkinnedWeapon
                        type={weapon.type}
                        skin={null}
                        className="h-10 w-full"
                      />
                    </span>
                    <span className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {weapon.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {WEAPON_TYPE_LABEL[weapon.type]}
                      </span>
                    </span>
                    {locked ? (
                      <span className="mt-1 block text-[10px] text-amber-300/80">
                        Terkunci — boleh dicoba di sini
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside
          className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
          aria-label="Rincian senjata"
        >
          <div className="h-44 rounded-lg bg-slate-950/50">
            <WeaponPreview weapon={selected} />
          </div>
          <p className="mt-3 text-base font-semibold text-white">
            {selected.name}
          </p>
          <p className="text-xs text-slate-400">{weaponBlurb(selected)}</p>
          <div className="mt-3 space-y-2">
            {weaponStatBars(selected).map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className="tracking-wider uppercase">{bar.label}</span>
                  <span className="text-slate-200">{bar.display}</span>
                </div>
                <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-sky-400"
                    style={{ width: `${bar.value * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <label
            htmlFor="jumlah-lawan-uji"
            className="text-sm font-semibold text-white"
          >
            Jumlah lawan: <span className="font-mono">{botCount}</span>
          </label>
          <input
            id="jumlah-lawan-uji"
            type="range"
            min={1}
            max={6}
            value={botCount}
            onChange={(event) => setBotCount(Number(event.target.value))}
            className="mt-3 w-full accent-sky-400"
          />
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <p className="text-sm font-semibold text-white">Tingkat lawan</p>
          <div
            className="mt-3 flex gap-2"
            role="group"
            aria-label="Tingkat lawan"
          >
            {DIFFICULTY_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setDifficulty(id)}
                aria-pressed={difficulty === id}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                  difficulty === id
                    ? "border-sky-400/70 bg-sky-500/10 text-white"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {difficultyProfile(id).label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/uji/arena"
          className="rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          Mulai uji coba
        </Link>
        <span className="text-xs text-slate-500">
          1 ronde · {TRIAL_ROUND_SECONDS} detik · berhenti di{" "}
          {TRIAL_SCORE_LIMIT} kill
        </span>
        <Link
          href="/"
          className="ml-auto text-sm text-slate-400 hover:text-slate-200"
        >
          Kembali ke menu
        </Link>
      </div>
    </div>
  );
}
