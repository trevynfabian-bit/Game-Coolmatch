"use client";

import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { KILLSTREAKS } from "@/lib/game/killstreak";
import { useKillstreakStore } from "@/lib/store/killstreak-store";

/**
 * Ringkasan hadiah killstreak di layar akhir: kill beruntun terpanjang, dan
 * untuk tiap hadiah berapa kali dipanggil serta berapa kill yang dihasilkannya.
 * Hadiah yang terbuka tapi tidak sempat dipakai ikut disebut supaya pemain
 * ingat memakainya lain kali.
 */
export function KillstreakSummary() {
  const bestStreak = useKillstreakStore((state) => state.bestStreak);
  const used = useKillstreakStore((state) => state.used);
  const killsBy = useKillstreakStore((state) => state.killsBy);
  const ready = useKillstreakStore((state) => state.ready);
  const loadout = useKillstreakStore((state) => state.loadout);

  const rewards = KILLSTREAKS.filter((item) => loadout.includes(item.id));
  const totalUsed = rewards.reduce((sum, item) => sum + (used[item.id] ?? 0), 0);
  const totalKills = rewards.reduce((sum, item) => sum + (killsBy[item.id] ?? 0), 0);

  return (
    <section aria-labelledby="judul-ringkasan-killstreak" className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <h3 id="judul-ringkasan-killstreak" className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
          Hadiah killstreak
        </h3>
        <p className="text-[11px] text-slate-400">
          Beruntun terpanjang <span className="font-mono font-semibold text-white tabular-nums">{bestStreak}</span>
        </p>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {rewards.map((reward) => {
          const count = used[reward.id] ?? 0;
          const kills = killsBy[reward.id] ?? 0;
          const unused = ready.includes(reward.id);
          return (
            <li
              key={reward.id}
              className={`rounded-lg border px-2 py-2 text-center ${count > 0 ? "border-white/15 bg-white/5" : "border-white/5"}`}
            >
              <span className="mx-auto block w-fit" style={{ color: count > 0 ? reward.color : "#475569" }}>
                <KillstreakIcon id={reward.id} className="h-5 w-5" />
              </span>
              <span className="mt-1 block truncate text-[10px] text-slate-300">{reward.name}</span>
              <span className="mt-0.5 block font-mono text-sm font-semibold text-white tabular-nums">
                {count}×
              </span>
              <span className="block text-[10px] text-slate-500">
                {count > 0 ? `${kills} kill` : unused ? "Terbuka, tak dipakai" : "Tidak terbuka"}
              </span>
            </li>
          );
        })}
      </ul>
      {totalUsed > 0 ? (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {totalUsed} hadiah dipanggil, menghasilkan {totalKills} kill.
        </p>
      ) : null}
    </section>
  );
}
