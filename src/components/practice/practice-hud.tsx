"use client";

import Link from "next/link";
import { AmmoPanel } from "@/components/arena/hud/ammo-panel";
import { Crosshair } from "@/components/arena/hud/crosshair";
import { CONTROL_HINTS } from "@/lib/game/controls";
import { RANGE_TARGETS } from "@/lib/practice/range-map";
import { accuracyPercent, usePracticeStore } from "@/lib/store/practice-store";
import { usePlayerStore } from "@/lib/store/player-store";
import { WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import type { Weapon } from "@/types/game";

/** Panel kiri-atas: ketepatan dan rincian kena per sasaran. */
function ScorePanel({ weapon }: { weapon: Weapon }) {
  const shots = usePracticeStore((state) => state.shots);
  const hits = usePracticeStore((state) => state.hits);
  const perTarget = usePracticeStore((state) => state.perTarget);
  const reset = usePracticeStore((state) => state.reset);

  const accuracy = accuracyPercent(shots, hits);

  return (
    <div className="pointer-events-none absolute top-4 left-4 w-60 sm:left-5">
      <div className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-sm">
        <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          Tempat latihan
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-100">
          {weapon.name}
          <span className="ml-1.5 text-[11px] font-normal text-slate-500">
            {WEAPON_TYPE_LABEL[weapon.type]}
          </span>
        </p>

        <div className="mt-3 flex items-end gap-3 border-t border-white/10 pt-3">
          <span className="font-mono text-2xl leading-6 font-bold tabular-nums text-emerald-300">
            {accuracy.toFixed(0)}
            <span className="text-sm text-slate-500">%</span>
          </span>
          <span className="pb-0.5 text-[11px] text-slate-400">
            {hits} kena dari {shots} butir
          </span>
        </div>

        <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
          {RANGE_TARGETS.map((target) => (
            <li
              key={target.id}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: target.color }}
                  aria-hidden
                />
                {target.distance} m
              </span>
              <span className="font-mono text-slate-200 tabular-nums">
                {perTarget[target.id] ?? 0}
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={reset}
          className="pointer-events-auto mt-3 w-full rounded border border-white/15 px-2 py-1.5 text-[11px] text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Nolkan catatan
        </button>
      </div>
    </div>
  );
}

/** Lapisan ajakan mulai; browser hanya mengunci kursor sesudah gerakan pengguna. */
function StartOverlay({ weapon }: { weapon: Weapon }) {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const hasEngaged = usePlayerStore((state) => state.hasEngaged);

  if (isLocked) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/70 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          {hasEngaged ? "Jeda" : "Tempat latihan"}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{weapon.name}</p>

        <button
          type="button"
          className="pointer-events-auto mt-4 rounded-lg bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {hasEngaged ? "Klik untuk lanjut" : "Klik untuk mulai"}
        </button>

        <dl className="mx-auto mt-7 grid max-w-[18rem] grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left">
          {CONTROL_HINTS.filter((hint) => hint.keys !== "Tab").map((hint) => (
            <div key={hint.keys} className="contents">
              <dt className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-center font-mono text-[11px] whitespace-nowrap text-slate-200">
                {hint.keys}
              </dt>
              <dd className="self-center text-xs text-slate-400">{hint.label}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-[11px] text-slate-500">
          Tidak ada lawan dan tidak ada batas waktu. Peluru cadangan berlimpah.
        </p>

        <Link
          href="/senjata"
          className="pointer-events-auto mt-4 inline-block rounded-lg border border-white/15 px-5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Kembali ke pilih senjata
        </Link>
      </div>
    </div>
  );
}

/** Seluruh lapisan HUD tempat latihan. */
export function PracticeHud({ weapon }: { weapon: Weapon }) {
  const isLocked = usePlayerStore((state) => state.isLocked);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 select-none">
        <ScorePanel weapon={weapon} />
        {isLocked ? <Crosshair /> : null}
        <AmmoPanel weapon={weapon} />
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm">
          Esc lalu klik &ldquo;Kembali&rdquo; untuk memilih senjata lain
        </p>
      </div>

      <StartOverlay weapon={weapon} />
    </>
  );
}
