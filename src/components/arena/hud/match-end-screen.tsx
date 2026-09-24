"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CoinSummary } from "@/components/arena/hud/coin-summary";
import { KillstreakSummary } from "@/components/arena/hud/killstreak-summary";
import { restartMatch } from "@/lib/game/match-reset";
import { unseenCount, useNotificationStore } from "@/lib/store/notification-store";
import type { ArenaMapInfo, Fighter, MatchSnapshot, RoundState } from "@/types/game";

function killRatio(fighter: Fighter): string {
  return (fighter.kills / Math.max(1, fighter.deaths)).toFixed(2);
}

/**
 * Layar akhir pertandingan: juara, klasemen akhir lengkap, dan pilihan lanjut.
 *
 * Kursor sengaja sudah dilepas saat pertandingan usai (lihat RoundTicker),
 * jadi tombol di sini bisa diklik langsung. Kliknya dihentikan agar tidak
 * merambat ke document, tempat PointerLockControls menyimak dan akan mencoba
 * mengunci kursor kembali di saat yang salah.
 */
export function MatchEndScreen({
  round,
  fighters,
  map,
  snapshot,
}: {
  round: RoundState;
  fighters: Fighter[];
  map: ArenaMapInfo;
  snapshot: MatchSnapshot;
}) {
  const ranked = useMemo(
    () =>
      [...fighters].sort(
        (a, b) =>
          b.roundWins - a.roundWins ||
          b.score - a.score ||
          b.kills - a.kills ||
          a.deaths - b.deaths,
      ),
    [fighters],
  );

  if (round.status !== "ended") return null;

  const local = fighters.find((fighter) => fighter.isLocal);
  const playerWon = Boolean(local && round.matchWinner === local.name);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-slate-950/85 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <p
            className={`text-[10px] tracking-[0.3em] uppercase ${
              playerWon ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            Pertandingan selesai
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white">
            {round.matchWinner
              ? playerWon
                ? "Kamu juara!"
                : `${round.matchWinner} juara`
              : "Berakhir seri"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {map.name}
            <span className="text-slate-600"> · </span>
            {round.total} ronde
            <span className="text-slate-600"> · </span>
            batas {round.scoreLimit} kill
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
                <th className="px-4 py-2 font-medium">Peringkat</th>
                <th className="w-14 px-2 py-2 text-right font-medium">Ronde</th>
                <th className="w-12 px-2 py-2 text-right font-medium">Kill</th>
                <th className="w-12 px-2 py-2 text-right font-medium">Mati</th>
                <th className="w-14 px-2 py-2 text-right font-medium">K/M</th>
                <th className="w-16 px-4 py-2 text-right font-medium">Skor</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((fighter, index) => (
                <tr
                  key={fighter.id}
                  className={`border-t border-white/5 ${
                    fighter.isLocal ? "bg-sky-500/10" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 font-mono text-xs text-slate-500 tabular-nums">
                        {index + 1}
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: fighter.color }}
                        aria-hidden
                      />
                      <span
                        className={`truncate text-sm ${
                          fighter.isLocal
                            ? "font-semibold text-sky-200"
                            : "text-slate-200"
                        }`}
                      >
                        {fighter.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm font-semibold text-amber-300 tabular-nums">
                    {fighter.roundWins}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
                    {fighter.kills}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm text-slate-500 tabular-nums">
                    {fighter.deaths}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-sm text-slate-400 tabular-nums">
                    {killRatio(fighter)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
                    {fighter.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <CoinSummary fighters={fighters} difficulty={snapshot.difficulty} matchWinner={round.matchWinner} />
        <KillstreakSummary />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              restartMatch(map, snapshot);
            }}
            className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Main lagi
          </button>
          {/*
            Menutup lingkaran: dari hasil pertandingan langsung kembali ke
            layar yang menentukan lawannya. Tanpa ini, pemain yang baru saja
            kewalahan melawan enam musuh Susah harus lewat menu utama dulu
            hanya untuk menurunkan tingkat kesulitan.
          */}
          <Link
            href="/lawan"
            onClick={(event) => event.stopPropagation()}
            className="rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Ganti lawan
          </Link>
          <Link
            href="/"
            onClick={(event) => event.stopPropagation()}
            className="rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Kembali ke menu
          </Link>
        </div>

        <NewRewardsHint />

        <p className="mt-4 text-center text-[11px] text-slate-600">
          &ldquo;Main lagi&rdquo; memakai pengaturan yang sama; &ldquo;Ganti
          lawan&rdquo; membuka lagi pilihan tingkat kesulitan dan jumlah musuh.
        </p>
      </div>
    </div>
  );
}

/** Pengingat bahwa ada hadiah baru yang menunggu dirayakan di luar arena. */
function NewRewardsHint() {
  const celebrated = useNotificationStore(
    (state) => state.items.filter((item) => item.seenAt === null && item.kind !== "koin").length,
  );
  const total = useNotificationStore((state) => unseenCount(state.items));
  if (total === 0) return null;
  return (
    <p className="mt-3 text-center text-xs text-emerald-300" role="status">
      {celebrated > 0
        ? `${celebrated} hadiah baru menunggumu di menu.`
        : `${total} notifikasi hadiah baru di kotak hadiah.`}
    </p>
  );
}
