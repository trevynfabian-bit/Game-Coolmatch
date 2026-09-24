"use client";

import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { callKillstreak, findKillstreak } from "@/lib/game/killstreak";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Tombol hadiah yang siap dipakai, di atas deret slot senjata. Tiap hadiah
 * tampil sebagai tombol dengan nomor tombolnya; saat kursor tidak terkunci
 * (mis. setelah Esc) tombolnya juga bisa diklik.
 */
export function KillstreakReadyPrompt() {
  const ready = useKillstreakStore((state) => state.ready);
  const loadout = useKillstreakStore((state) => state.loadout);
  const isLocked = usePlayerStore((state) => state.isLocked);

  const items = loadout.flatMap((id, index) =>
    id && ready.includes(id) ? [{ reward: findKillstreak(id), keyLabel: String(6 + index) }] : [],
  );
  if (items.length === 0) return null;

  return (
    <div className="absolute bottom-36 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-40">
      {items.map(({ reward, keyLabel }) => (
        <button
          key={reward.id}
          type="button"
          onClick={(event) => {
            // Jangan merambat ke kanvas yang akan mengunci kursor.
            event.stopPropagation();
            callKillstreak(reward.id, useKillstreakStore.getState());
          }}
          className={`killstreak-ready flex items-center gap-2 rounded-lg border bg-slate-950/80 px-3 py-1.5 text-left backdrop-blur-sm ${
            isLocked ? "pointer-events-none" : "pointer-events-auto hover:bg-slate-900"
          }`}
          style={{ borderColor: `${reward.color}aa`, boxShadow: `0 0 16px ${reward.color}44` }}
          aria-label={`Panggil ${reward.name} (tombol ${keyLabel})`}
        >
          <span className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-xs font-bold text-white">{keyLabel}</span>
          <span style={{ color: reward.color }}>
            <KillstreakIcon id={reward.id} className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[9px] tracking-[0.2em] text-slate-400 uppercase">Siap dipakai</span>
            <span className="block text-xs font-semibold text-white">{reward.name}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
