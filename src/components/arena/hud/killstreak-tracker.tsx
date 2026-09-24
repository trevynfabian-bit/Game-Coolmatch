"use client";

import { KILLSTREAKS, nextKillstreak } from "@/lib/game/killstreak";
import { STREAK_ACTIONS } from "@/lib/game/controls";
import { keyLabel } from "@/lib/game/keybindings";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useSettingsStore } from "@/lib/store/settings-store";

/** Ikon sederhana per hadiah, digambar SVG supaya tanpa aset. */
export function KillstreakIcon({ id, className }: { id: string; className?: string }) {
  if (id === "uav") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 12 L18 6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "serangan_udara") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M12 2l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 6h18M12 6v3" strokeLinecap="round" />
      <rect x="6" y="9" width="10" height="6" rx="3" fill="currentColor" />
      <path d="M16 12h5M8 15l-1 3M14 15l1 3M5 18h14" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Pelacak killstreak di sisi kanan layar: jumlah kill beruntun saat ini,
 * tiga hadiah dengan bar menuju ambangnya, dan tombol untuk memanggil hadiah
 * yang sudah siap. Hadiah terdekat disorot supaya pemain tahu apa yang hampir
 * terbuka.
 */
export function KillstreakTracker() {
  const streak = useKillstreakStore((state) => state.streak);
  const ready = useKillstreakStore((state) => state.ready);
  const active = useKillstreakStore((state) => state.active);
  const loadout = useKillstreakStore((state) => state.loadout);
  const bindings = useSettingsStore((state) => state.controls.bindings);

  // Urut sesuai loadout (tombol 6, 7, 8), slot kosong dilewati.
  const rewards = loadout.flatMap((id) => KILLSTREAKS.filter((item) => item.id === id));
  const next = nextKillstreak(streak, rewards);

  return (
    <div className="pointer-events-none absolute right-4 bottom-52 hidden sm:block sm:right-5">
      <div className="w-44 rounded-lg border border-white/10 bg-slate-950/65 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">Killstreak</p>
          <p className="font-mono text-xl font-bold text-white tabular-nums" aria-label={`${streak} kill beruntun`}>
            {streak}
          </p>
        </div>
        {next ? (
          <p className="mt-0.5 text-[10px] text-slate-400">
            {next.kills - streak} kill lagi → <span style={{ color: next.color }}>{next.name}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-[10px] text-emerald-300">Semua hadiah terbuka</p>
        )}

        <ul className="mt-2 space-y-1.5">
          {rewards.map((reward) => {
            const isReady = ready.includes(reward.id);
            const isActive = active[reward.id] !== undefined;
            const isNext = next?.id === reward.id;
            const progress = Math.min(1, streak / reward.kills);
            return (
              <li
                key={reward.id}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${
                  isReady ? "bg-white/10" : isNext ? "bg-white/5" : ""
                }`}
                style={isReady ? { boxShadow: `inset 0 0 0 1px ${reward.color}88` } : undefined}
              >
                <span style={{ color: isReady || isActive || isNext ? reward.color : "#475569" }}>
                  <KillstreakIcon id={reward.id} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1">
                    <span className={`truncate text-[10px] ${isReady ? "text-white" : "text-slate-400"}`}>
                      {reward.name}
                    </span>
                    {isReady ? (
                      <span className="rounded bg-white/15 px-1 font-mono text-[9px] text-white">
                        {keyLabel(bindings[STREAK_ACTIONS[loadout.indexOf(reward.id)]])}
                      </span>
                    ) : isActive ? (
                      <span className="text-[9px] tracking-wider uppercase" style={{ color: reward.color }}>
                        Aktif
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] text-slate-500 tabular-nums">
                        {Math.min(streak, reward.kills)}/{reward.kills}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${(isReady ? 1 : progress) * 100}%`, backgroundColor: reward.color }}
                    />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
