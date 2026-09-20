"use client";

import { useEffect, useMemo } from "react";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { describeTuning } from "@/lib/game/bot-tuning";
import {
  DIFFICULTY_ORDER,
  DIFFICULTY_PROFILES,
  MIN_BOTS,
  difficultyProfile,
  difficultyTraits,
} from "@/lib/game/difficulty";
import { buildBotRoster, maxBotsForMap } from "@/lib/mock/bots";
import { MapThumbnail } from "@/components/maps/map-thumbnail";
import { findMap } from "@/lib/mock/maps";
import { findWeapon } from "@/lib/mock/weapons";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useMapStore } from "@/lib/store/map-store";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";
import { WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";

/** Kata yang menggambarkan seramai apa arena pada jumlah lawan tertentu. */
function crowdWord(botCount: number): string {
  if (botCount <= 2) return "Lengang, banyak duel satu lawan satu";
  if (botCount <= 4) return "Ramai wajar, tembak-menembak hampir tanpa jeda";
  if (botCount <= 6) return "Padat, jarang ada tempat aman";
  return "Sesak, siap-siap ditembak dari segala arah";
}

/**
 * Layar pengaturan lawan: tingkat kesulitan dan jumlah musuh otomatis.
 *
 * Keduanya dijelaskan dengan kata sehari-hari, bukan angka mentah — pemain
 * tidak perlu tahu berapa detik reaksi bot untuk memilih. Daftar lawan yang
 * akan dihadapi ditampilkan langsung supaya pilihan terasa nyata.
 */
export function OpponentSetup() {
  const difficulty = useMatchSetupStore((state) => state.difficulty);
  const botCount = useMatchSetupStore((state) => state.botCount);
  const setDifficulty = useMatchSetupStore((state) => state.setDifficulty);
  const setBotCount = useMatchSetupStore((state) => state.setBotCount);
  const selectedWeaponId = useLoadoutStore((state) => state.selectedWeaponId);
  const selectedMapId = useMapStore((state) => state.selectedMapId);

  /**
   * Peta yang benar-benar akan dimainkan, bukan peta bawaan. Seluruh layar ini
   * bergantung padanya: berapa lawan yang muat, siapa saja lawannya, dan nama
   * arena yang disebut — ketiganya akan salah bila peta pilihan pemain
   * diabaikan di sini.
   */
  const map = findMap(selectedMapId);

  /**
   * Batas atas penggeser mengikuti peta, bukan angka tetap: peta yang titik
   * spawn-nya lebih sedikit menampung lebih sedikit lawan.
   */
  const maxBots = maxBotsForMap(map);

  // Pilihan yang tersimpan bisa berasal dari peta lain yang lebih lapang, jadi
  // dirapikan begitu layar ini dibuka — penggeser tidak boleh menampilkan
  // angka yang tidak bisa dipakai petanya.
  useEffect(() => {
    if (botCount > maxBots) setBotCount(maxBots);
  }, [botCount, maxBots, setBotCount]);

  const profile = difficultyProfile(difficulty);
  const roster = useMemo(() => buildBotRoster(botCount, map), [botCount, map]);
  const weapon = findWeapon(selectedWeaponId);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Atur lawan
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Musuh Otomatis
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Kamu bertanding sendirian melawan lawan yang dikendalikan komputer.
          Atur seberapa pintar mereka dan berapa banyak yang muncul di arena.
        </p>
      </header>

      {/*
        Peta ditaruh paling atas karena ia yang membatasi sisanya: daya tampung
        lawan mengikuti jumlah titik spawn-nya, jadi pemain yang mentok di
        penggeser harus bisa langsung melihat arena mana yang sedang dipakai dan
        pindah dari sini — bukan kembali ke menu untuk mencarinya.
      */}
      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Arena
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-5 py-5 sm:flex-row sm:items-center">
          <span className="block w-full shrink-0 overflow-hidden rounded-lg border border-white/10 sm:w-40">
            <MapThumbnail map={map} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100">{map.name}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              {map.description}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Muat sampai {maxBots} lawan.
            </p>
          </div>

          <ActionButton size="ringkas" href="/peta" className="shrink-0">
            Ganti peta
          </ActionButton>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Tingkat kesulitan
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {DIFFICULTY_ORDER.map((id) => {
            const item = DIFFICULTY_PROFILES[id];
            const active = id === difficulty;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setDifficulty(id)}
                aria-pressed={active}
                className={`flex h-full flex-col rounded-xl border px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                  active
                    ? "border-emerald-400/70 bg-emerald-500/10"
                    : "border-white/10 bg-slate-900/60 hover:border-white/25 hover:bg-slate-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">
                    {item.label}
                  </span>
                  {active ? (
                    <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
                      Dipilih
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 block flex-1 text-[11px] leading-relaxed text-slate-400">
                  {item.blurb}
                </span>

                <span className="mt-3 block space-y-1.5 border-t border-white/10 pt-3">
                  {difficultyTraits(item).map((trait) => (
                    <span
                      key={trait.label}
                      className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2"
                    >
                      <span className="text-[10px] tracking-wider text-slate-500 uppercase">
                        {trait.label}
                      </span>
                      <span className="h-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(6, trait.value * 100)}%`,
                            backgroundColor: active ? "#34d399" : "#64748b",
                          }}
                        />
                      </span>
                      <span className="text-right text-[10px] text-slate-400">
                        {trait.word}
                      </span>
                    </span>
                  ))}
                </span>
                <span className="mt-2.5 block text-[10px] leading-relaxed text-slate-500">
                  {describeTuning(item).join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Jumlah musuh
        </h2>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 px-5 py-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl font-bold tabular-nums text-emerald-300">
              {botCount}
            </span>
            <span className="text-sm text-slate-400">
              musuh di arena {map.name}
            </span>
          </div>

          <label className="mt-4 block">
            <span className="sr-only">Jumlah musuh otomatis</span>
            <input
              type="range"
              min={MIN_BOTS}
              max={maxBots}
              step={1}
              value={botCount}
              onChange={(event) => setBotCount(Number(event.target.value))}
              className="w-full accent-emerald-400"
            />
          </label>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>{MIN_BOTS}</span>
            <span>{maxBots}</span>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            {crowdWord(botCount)}
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Yang akan kamu hadapi
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {roster.map((bot) => {
            const botWeapon = findWeapon(bot.weaponId);
            return (
              <li
                key={bot.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: bot.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {bot.name}
                </span>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {botWeapon.name}
                  <span className="text-slate-700"> · </span>
                  {WEAPON_TYPE_LABEL[botWeapon.type]}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="rounded-xl border border-white/10 bg-slate-900/40 px-5 py-4">
        <p className="text-[11px] text-slate-400">
          Kamu membawa{" "}
          <span className="font-medium text-slate-200">{weapon.name}</span>{" "}
          melawan {botCount} musuh tingkat{" "}
          <span className="font-medium text-slate-200">
            {profile.label.toLowerCase()}
          </span>{" "}
          di <span className="font-medium text-slate-200">{map.name}</span>.
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Pengaturan ini tersimpan otomatis di perangkat ini, jadi pertandingan
          berikutnya langsung memakai pilihan yang sama.
        </p>

        {/*
          "Ganti peta" sengaja TIDAK diulang di sini. Tempatnya di panel Arena
          paling atas, tepat di sebelah denah yang sedang dilihat pemain —
          deretan ini isinya tujuan lain: mulai bertanding, ganti senjata, atau
          keluar.
        */}
        <ActionRow className="mt-4">
          <ActionButton variant="utama" href="/arena">
            Mulai bertanding
          </ActionButton>
          <ActionButton href="/senjata">Ganti senjata</ActionButton>
          <ActionButton href="/">Kembali ke menu</ActionButton>
        </ActionRow>
      </div>
    </div>
  );
}
