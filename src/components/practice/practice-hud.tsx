"use client";

import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import Link from "next/link";
import { AmmoPanel } from "@/components/arena/hud/ammo-panel";
import { Crosshair } from "@/components/arena/hud/crosshair";
import { useControlHints } from "@/lib/game/use-keybindings";
import { RANGE_TARGETS } from "@/lib/practice/range-map";
import { accuracyPercent, usePracticeStore } from "@/lib/store/practice-store";
import { PracticeResults } from "@/components/practice/practice-results";
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

/**
 * Lapisan ajakan mulai sekaligus layar jeda.
 *
 * Browser hanya mengunci kursor sesudah gerakan pengguna, jadi latihan selalu
 * dimulai dari sini. Sesudah pemain pernah menembak, lapisan yang sama menjadi
 * tempat memutuskan langkah berikutnya: lanjut berlatih, membawa senjata ini ke
 * arena, atau menukarnya dengan senjata lain.
 *
 * Tautan di sini menghentikan perambatan klik, sebab PointerLockControls
 * menyimak klik di level document dan akan mencoba mengunci kursor tepat saat
 * halaman sedang ditinggalkan.
 */
function StartOverlay({ weapon }: { weapon: Weapon }) {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const hasEngaged = usePlayerStore((state) => state.hasEngaged);
  const hints = useControlHints();
  if (isLocked) return null;

  const stopClick = keepCursorFree;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-slate-950/75 px-6 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          {hasEngaged ? "Jeda latihan" : "Tempat latihan"}
        </p>
        <p className="mt-2 text-lg font-semibold text-white">{weapon.name}</p>

        <PracticeResults />

        <button
          type="button"
          className="pointer-events-auto mt-5 w-full rounded-lg bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {hasEngaged ? "Lanjut latihan" : "Klik untuk mulai"}
        </button>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/arena"
            onClick={stopClick}
            className="pointer-events-auto flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-center text-sm font-semibold text-slate-100 transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Pakai senjata ini
          </Link>
          <Link
            href="/senjata"
            onClick={stopClick}
            className="pointer-events-auto flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Ganti senjata
          </Link>
        </div>

        <dl className="mx-auto mt-7 grid max-w-[18rem] grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left">
          {hints.filter((hint) => hint.id !== "scoreboard" && hint.id !== "streaks").map((hint) => (
            <div key={hint.id} className="contents">
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
        <p className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-sky-400/40 bg-sky-950/70 px-3 py-1 text-[10px] font-bold tracking-[0.25em] text-sky-200 uppercase">
          Mode latihan · tidak mengubah progres
        </p>
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm">
          Tekan Esc untuk jeda, memakai senjata ini, atau menggantinya
        </p>
      </div>

      <StartOverlay weapon={weapon} />
    </>
  );
}
