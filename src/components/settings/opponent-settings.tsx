"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SettingsShell } from "@/components/settings/settings-shell";
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PROFILES,
  MIN_BOTS,
  difficultyTraits,
} from "@/lib/game/difficulty";
import { maxBotsForMap } from "@/lib/mock/bots";
import { findMap } from "@/lib/mock/maps";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";

/**
 * Panel kesulitan lawan di dalam Pengaturan: pilihan tingkat dan jumlah musuh
 * otomatis dalam bentuk ringkas. Memakai store yang sama dengan layar Atur
 * Lawan, jadi pilihan di sini langsung berlaku di pertandingan berikutnya.
 */
export function OpponentSettingsPage() {
  const difficulty = useMatchSetupStore((state) => state.difficulty);
  const botCount = useMatchSetupStore((state) => state.botCount);
  const mapId = useMatchSetupStore((state) => state.mapId);
  const setDifficulty = useMatchSetupStore((state) => state.setDifficulty);
  const setBotCount = useMatchSetupStore((state) => state.setBotCount);
  const resetOpponents = useMatchSetupStore((state) => state.resetOpponents);
  const map = findMap(mapId);
  const maxBots = maxBotsForMap(map);

  // Simpanan lama bisa melebihi daya tampung peta yang sekarang dipilih.
  useEffect(() => {
    if (botCount > maxBots) setBotCount(maxBots);
  }, [botCount, maxBots, setBotCount]);

  return (
    <SettingsShell
      active="/pengaturan/lawan"
      title="Lawan"
      description="Seberapa pintar musuh otomatis dan berapa banyak yang muncul."
    >
      <section aria-labelledby="judul-kesulitan">
        <h2 id="judul-kesulitan" className="mb-2 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Tingkat kesulitan
        </h2>
        <div className="space-y-2" role="radiogroup" aria-labelledby="judul-kesulitan">
          {DIFFICULTY_ORDER.map((id) => {
            const profile = DIFFICULTY_PROFILES[id];
            const active = id === difficulty;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDifficulty(id)}
                className={`grid w-full gap-3 rounded-xl border px-4 py-3 text-left sm:grid-cols-[1fr_12rem] ${
                  active ? "border-emerald-400/70 bg-emerald-500/10" : "border-white/10 bg-slate-900/60 hover:border-white/25"
                }`}
              >
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span
                      aria-hidden
                      className={`h-3.5 w-3.5 rounded-full border ${active ? "border-emerald-300 bg-emerald-400" : "border-slate-500"}`}
                    />
                    {profile.label}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{profile.blurb}</span>
                </span>
                <span className="space-y-1 self-center">
                  {difficultyTraits(profile).map((trait) => (
                    <span key={trait.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                      <span className="text-[10px] tracking-wider text-slate-500 uppercase">{trait.label}</span>
                      <span className="h-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.max(6, trait.value * 100)}%`, backgroundColor: active ? "#34d399" : "#64748b" }}
                        />
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <label htmlFor="jumlah-lawan" className="text-sm font-semibold text-white">
            Jumlah lawan
          </label>
          <span className="font-mono text-sm text-slate-300 tabular-nums">{botCount}</span>
        </div>
        <p className="text-[11px] text-slate-500">
          {map.name} menampung paling banyak {maxBots} lawan.
        </p>
        <input
          id="jumlah-lawan"
          type="range"
          min={MIN_BOTS}
          max={maxBots}
          step={1}
          value={Math.min(botCount, maxBots)}
          onChange={(event) => setBotCount(Number(event.target.value))}
          className="mt-2 w-full accent-emerald-400"
        />
      </div>

      <button type="button" onClick={resetOpponents} className="mt-4 block text-xs text-slate-400 hover:text-slate-200">
        Kembalikan ke bawaan
      </button>

      <Link href="/lawan" className="mt-3 block text-xs text-emerald-300 hover:text-emerald-200">
        Lihat daftar lawan lengkap →
      </Link>
    </SettingsShell>
  );
}
