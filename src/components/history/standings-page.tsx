"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HistoryState } from "@/components/history/history-state";
import { HistoryTabs } from "@/components/history/history-tabs";
import { buildStandings, kd } from "@/lib/history/standings";
import { useHistoryStore } from "@/lib/store/history-store";

/**
 * Klasemen: peringkat gabungan kamu dan para bot dari seluruh pertandingan
 * yang selesai — siapa yang paling sering juara, paling banyak kill, dan
 * paling tangguh (K/M). Baris kamu disorot.
 */
export function StandingsPage() {
  const matches = useHistoryStore((state) => state.matches);
  const standings = useMemo(() => buildStandings(matches), [matches]);
  const me = standings.find((row) => !row.isBot);
  const myRank = me ? standings.indexOf(me) + 1 : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
        Riwayat
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
        Klasemen
      </h1>
      <p className="mt-2 mb-6 text-sm text-slate-400">
        Gabungan{" "}
        {matches.filter((m) => m.result !== "ditinggal" && !m.isTrial).length}{" "}
        pertandingan terakhir (uji coba tidak dihitung).
        {myRank ? ` Kamu di peringkat ${myRank} dari ${standings.length}.` : ""}
      </p>
      <HistoryTabs active="/riwayat" />

      <HistoryState>
        {me ? (
          <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Juara", value: `${me.wins}/${me.matches}` },
              { label: "Total kill", value: me.kills },
              { label: "K/M", value: kd(me).toFixed(2) },
              { label: "Ronde menang", value: me.roundWins },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-3"
              >
                <dt className="text-[10px] tracking-[0.2em] text-slate-500 uppercase">
                  {item.label}
                </dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Peserta</th>
                <th className="px-2 py-2 text-right font-medium">Main</th>
                <th className="px-2 py-2 text-right font-medium">Juara</th>
                <th className="px-2 py-2 text-right font-medium">Kill</th>
                <th className="px-2 py-2 text-right font-medium">Mati</th>
                <th className="px-2 py-2 text-right font-medium">K/M</th>
                <th className="px-4 py-2 text-right font-medium">Skor</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, index) => (
                <tr
                  key={row.name}
                  className={`border-t border-white/5 ${row.isBot ? "" : "bg-sky-500/10"}`}
                >
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">
                    {index + 1}
                  </td>
                  <td
                    className={`px-2 py-2 ${row.isBot ? "text-slate-200" : "font-semibold text-sky-200"}`}
                  >
                    {row.name}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-400 tabular-nums">
                    {row.matches}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-semibold text-amber-300 tabular-nums">
                    {row.wins}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-100 tabular-nums">
                    {row.kills}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-500 tabular-nums">
                    {row.deaths}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-300 tabular-nums">
                    {kd(row).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-100 tabular-nums">
                    {row.score.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HistoryState>

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-slate-400 hover:text-slate-200"
      >
        ← Kembali ke menu
      </Link>
    </div>
  );
}
