"use client";

import { RoundRulesPanel } from "@/components/arena/hud/round-rules-panel";
import { CONTROL_HINTS } from "@/lib/game/controls";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Lapisan yang menutup arena selama kursor belum dikunci. Browser hanya mau
 * mengunci pointer sesudah gerakan pengguna, jadi halaman selalu mulai di sini.
 * Tombolnya sekadar sasaran klik yang jelas — drei PointerLockControls sendiri
 * menyimak klik di level document.
 */
export function EngageOverlay() {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const hasEngaged = usePlayerStore((state) => state.hasEngaged);
  const round = useMatchStore((state) => state.round);
  const roundStatus = round.status;
  const targeting = useKillstreakStore((state) => state.targeting);

  // Pertandingan usai dan denah sasaran punya layarnya sendiri; jangan tumpuk
  // dengan ajakan main.
  if (isLocked || roundStatus === "ended" || targeting) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/70 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          {hasEngaged ? "Jeda" : "Gudang Senja"}
        </p>

        <button
          type="button"
          className="pointer-events-auto mt-4 rounded-lg bg-emerald-500 px-7 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {hasEngaged ? "Klik untuk lanjut" : "Klik untuk main"}
        </button>

        <dl className="mx-auto mt-7 grid max-w-[18rem] grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-left">
          {CONTROL_HINTS.map((hint) => (
            <div key={hint.keys} className="contents">
              <dt className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-center font-mono text-[11px] whitespace-nowrap text-slate-200">
                {hint.keys}
              </dt>
              <dd className="self-center text-xs text-slate-400">
                {hint.label}
              </dd>
            </div>
          ))}
        </dl>

        {round.total > 0 ? <RoundRulesPanel round={round} /> : null}
      </div>
    </div>
  );
}
