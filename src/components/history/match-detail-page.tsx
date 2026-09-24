"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { HistoryMatch } from "@/types/history";
import { CoinIcon } from "@/components/economy/coin-badge";
import { HistoryState } from "@/components/history/history-state";
import { formatMatchTime } from "@/components/history/match-history-page";
import { kd } from "@/lib/history/standings";
import { useHistoryStore } from "@/lib/store/history-store";

interface RoundDetail {
  roundNumber: number;
  lines: { name: string; kills: number; headshots: number; deaths: number }[];
  headshots: number;
  totalKills: number;
}

/**
 * Rincian per ronde dari /api/riwayat/[id]: kill tiap peserta yang tersinkron
 * selama pertandingan, plus potret pertandingannya sendiri sebagai cadangan
 * bila pertandingan ini tidak termasuk daftar riwayat yang termuat.
 */
function useRoundDetail(matchId: number) {
  const [detail, setDetail] = useState<{ match: HistoryMatch; rounds: RoundDetail[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void apiFetch<{ match: HistoryMatch; rounds: RoundDetail[] }>(`/api/riwayat/${matchId}`).then((response) => {
      if (!cancelled && response.ok) setDetail(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);
  return detail;
}

const REASON_LABEL = {
  batas_kill: "Batas kill tercapai",
  waktu_habis: "Waktu habis",
  ditinggal: "Ditinggal",
} as const;

/**
 * Rincian satu pertandingan: kartu hasil, klasemen akhir peserta, lalu
 * jalannya pertandingan ronde demi ronde — siapa pemenangnya, sebab ronde
 * berakhir, dan kill pemain di ronde itu.
 */
export function MatchDetailPage({ matchId }: { matchId: number }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <HistoryState>
        <MatchDetail matchId={matchId} />
      </HistoryState>
    </div>
  );
}

function MatchDetail({ matchId }: { matchId: number }) {
  const matches = useHistoryStore((state) => state.matches);
  const detail = useRoundDetail(matchId);
  const index = matches.findIndex((item) => item.id === matchId);
  const match = index >= 0 ? matches[index] : detail?.match;
  const roundLines = new Map(detail?.rounds.map((round) => [round.roundNumber, round]) ?? []);
  // Riwayat urut terbaru dulu: "lebih baru" ada di indeks sebelumnya.
  const newer = index > 0 ? matches[index - 1] : null;
  const older =
    index >= 0 && index < matches.length - 1 ? matches[index + 1] : null;

  if (!match) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-300">
          Pertandingan ini tidak ditemukan — mungkin sudah terhapus atau bukan
          milikmu.
        </p>
        <Link
          href="/riwayat/pertandingan"
          className="mt-3 inline-block text-sm text-emerald-300 hover:underline"
        >
          Kembali ke riwayat
        </Link>
      </div>
    );
  }

  const ranked = [...match.participants].sort(
    (a, b) =>
      b.roundWins - a.roundWins || b.kills - a.kills || a.deaths - b.deaths,
  );
  const me = match.participants.find((p) => !p.isBot);
  const maxRoundKills = Math.max(
    1,
    ...match.rounds.map((round) => round.playerKills),
  );

  return (
    <div>
      <Link
        href="/riwayat/pertandingan"
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← Riwayat
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase"
            suppressHydrationWarning
          >
            {formatMatchTime(match.startedAt)}
          </p>
          {match.isTrial ? (
            <p className="mt-1 inline-block rounded bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-sky-200 uppercase">
              Uji coba · tidak dihitung
            </p>
          ) : null}
          <h1 className="mt-1 text-3xl font-bold text-white">
            {match.result === "menang"
              ? "Kamu juara"
              : match.winnerName
                ? `${match.winnerName} juara`
                : "Seri"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {match.mapName} · {match.totalRounds} ronde · {match.botCount} bot
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-mono text-sm text-amber-200">
          <CoinIcon className="h-4 w-4" />+{match.coinsEarned}
        </span>
      </div>

      {me ? (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Kill", value: me.kills },
            { label: "Mati", value: me.deaths },
            { label: "K/M", value: kd(me).toFixed(2) },
            { label: "Ronde", value: me.roundWins },
            { label: "Beruntun", value: match.bestStreak },
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

      <section className="mt-8" aria-labelledby="judul-ronde">
        <h2
          id="judul-ronde"
          className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase"
        >
          Jalannya pertandingan
        </h2>
        <ol className="space-y-2">
          {match.rounds.map((round) => {
            const mine = round.winnerName === me?.name;
            return (
              <li
                key={round.roundNumber}
                className="flex items-center gap-4 rounded-lg border border-white/10 bg-slate-900/50 px-4 py-2.5"
              >
                <span className="w-16 font-mono text-xs text-slate-500">
                  Ronde {round.roundNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${mine ? "font-semibold text-emerald-300" : "text-slate-200"}`}
                  >
                    {round.winnerName ?? "Seri"}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {REASON_LABEL[round.endedReason]}
                    {(() => {
                      const info = roundLines.get(round.roundNumber);
                      const top = info?.lines[0];
                      if (!info || !top) return null;
                      return (
                        <>
                          {" · "}
                          {info.totalKills} kill, {info.headshots} kena kepala · teratas {top.name} ({top.kills})
                        </>
                      );
                    })()}
                  </span>
                </span>
                <span className="flex w-40 items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-sky-400"
                      style={{
                        width: `${(round.playerKills / maxRoundKills) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="w-12 text-right font-mono text-[11px] text-slate-300 tabular-nums">
                    {round.playerKills} kill
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="judul-klasemen-akhir">
        <h2
          id="judul-klasemen-akhir"
          className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase"
        >
          Klasemen akhir
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
                <th className="px-4 py-2 font-medium">Peserta</th>
                <th className="px-2 py-2 text-right font-medium">Ronde</th>
                <th className="px-2 py-2 text-right font-medium">Kill</th>
                <th className="px-2 py-2 text-right font-medium">Mati</th>
                <th className="px-4 py-2 text-right font-medium">Skor</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((p) => (
                <tr
                  key={p.name}
                  className={`border-t border-white/5 ${p.isBot ? "" : "bg-sky-500/10"}`}
                >
                  <td
                    className={`px-4 py-2 ${p.isBot ? "text-slate-200" : "font-semibold text-sky-200"}`}
                  >
                    {p.name}
                    {p.isWinner ? (
                      <span className="ml-2 text-[10px] text-amber-300">
                        juara
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right font-mono font-semibold text-amber-300 tabular-nums">
                    {p.roundWins}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-100 tabular-nums">
                    {p.kills}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-slate-500 tabular-nums">
                    {p.deaths}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-slate-100 tabular-nums">
                    {p.score.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <nav
        aria-label="Pertandingan lain"
        className="mt-8 flex justify-between gap-3 border-t border-white/10 pt-4 text-sm"
      >
        {older ? (
          <Link
            href={`/riwayat/pertandingan/${older.id}`}
            className="text-slate-400 hover:text-slate-200"
          >
            ← Lebih lama · {older.mapName}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link
            href={`/riwayat/pertandingan/${newer.id}`}
            className="text-slate-400 hover:text-slate-200"
          >
            Lebih baru · {newer.mapName} →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
