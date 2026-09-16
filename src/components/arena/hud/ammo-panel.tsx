"use client";

import { useCombatStore } from "@/lib/store/combat-store";
import type { Weapon } from "@/types/game";

/**
 * Panel kanan-bawah: peluru di magasin, cadangan, status isi ulang, dan
 * ringkasan statistik senjata aktif. Angkanya dibaca dari combat store supaya
 * ikut berubah tiap kali pelatuk ditarik.
 */
export function AmmoPanel({ weapon }: { weapon: Weapon }) {
  const inMagazine = useCombatStore((state) => state.ammoInMagazine);
  const reserve = useCombatStore((state) => state.ammoReserve);
  const isReloading = useCombatStore((state) => state.isReloading);
  const reloadSeconds = useCombatStore((state) => state.reloadSeconds);

  const low = inMagazine <= Math.ceil(weapon.magazineSize * 0.25);
  const empty = inMagazine === 0;

  return (
    <div className="pointer-events-none absolute right-4 bottom-4 sm:right-5 sm:bottom-5">
      <div className="w-44 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-right backdrop-blur-sm sm:w-52 sm:px-4 sm:py-3">
        <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          {weapon.type}
        </p>
        <p className="mb-1 text-sm font-semibold text-slate-200">
          {weapon.name}
        </p>

        <p
          className="font-mono leading-none font-bold tabular-nums"
          role="status"
          aria-label={`Peluru: ${inMagazine} di magasin, ${reserve} cadangan`}
        >
          <span
            className={`text-3xl sm:text-4xl ${
              low ? "text-rose-400" : "text-amber-300"
            }`}
          >
            {inMagazine}
          </span>
          <span className="text-xl text-slate-500"> / {reserve}</span>
        </p>

        {isReloading ? (
          <div className="mt-2">
            <p className="mb-1 text-[10px] tracking-[0.2em] text-sky-300 uppercase">
              Mengisi ulang
            </p>
            <span className="block h-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-sky-400"
                style={{
                  animation: `reload-fill ${reloadSeconds}s linear forwards`,
                }}
              />
            </span>
          </div>
        ) : empty && reserve === 0 ? (
          <p className="mt-2 text-[10px] tracking-[0.2em] text-rose-400 uppercase">
            Peluru habis
          </p>
        ) : empty ? (
          <p className="mt-2 text-[10px] tracking-[0.2em] text-amber-300 uppercase">
            Tekan R untuk isi
          </p>
        ) : null}

        <dl className="mt-3 hidden grid-cols-3 gap-3 border-t border-white/10 pt-2 text-[10px] text-slate-400 sm:grid">
          <div>
            <dt className="tracking-wider uppercase">Damage</dt>
            <dd className="font-mono text-xs text-slate-200">{weapon.damage}</dd>
          </div>
          <div>
            <dt className="tracking-wider uppercase">Rpm</dt>
            <dd className="font-mono text-xs text-slate-200">
              {weapon.fireRate}
            </dd>
          </div>
          <div>
            <dt className="tracking-wider uppercase">Isi</dt>
            <dd className="font-mono text-xs text-slate-200">
              {weapon.magazineSize}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
