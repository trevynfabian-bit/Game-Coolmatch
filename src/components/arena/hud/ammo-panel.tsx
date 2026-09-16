import type { Weapon } from "@/types/game";

/**
 * Panel kanan-bawah: peluru di magasin, cadangan, dan ringkasan statistik
 * senjata yang sedang dipakai.
 */
export function AmmoPanel({
  weapon,
  inMagazine,
  reserve,
}: {
  weapon: Weapon;
  inMagazine: number;
  reserve: number;
}) {
  const low = inMagazine <= Math.ceil(weapon.magazineSize * 0.25);

  return (
    <div className="pointer-events-none absolute right-4 bottom-4 sm:right-5 sm:bottom-5">
      <div className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 text-right backdrop-blur-sm sm:px-4 sm:py-3">
        <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          {weapon.type}
        </p>
        <p className="mb-1 text-sm font-semibold text-slate-200">
          {weapon.name}
        </p>

        <p className="font-mono leading-none font-bold tabular-nums">
          <span
            className={`text-3xl sm:text-4xl ${low ? "text-rose-400" : "text-amber-300"}`}
          >
            {inMagazine}
          </span>
          <span className="text-xl text-slate-500"> / {reserve}</span>
        </p>

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
