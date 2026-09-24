"use client";

import Link from "next/link";
import { CoinIcon } from "@/components/economy/coin-badge";
import { HistoryTabs } from "@/components/history/history-tabs";
import { useHistoryStore } from "@/lib/store/history-store";
import type { HistoryMatch } from "@/types/history";

const RESULT_STYLE: Record<HistoryMatch["result"], { label: string; className: string }> = {
  menang: { label: "Menang", className: "bg-emerald-400/15 text-emerald-300" },
  kalah: { label: "Kalah", className: "bg-rose-400/15 text-rose-300" },
  seri: { label: "Seri", className: "bg-slate-400/15 text-slate-300" },
  ditinggal: { label: "Ditinggal", className: "bg-white/5 text-slate-500" },
};

const DIFFICULTY_LABEL = { santai: "Santai", normal: "Normal", susah: "Susah" } as const;

/** Tanggal dan jam singkat gaya Indonesia, zona waktu tetap supaya hidrasi cocok. */
export function formatMatchTime(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(timestamp);
}

/**
 * Riwayat pertandingan lampau, terbaru di atas: hasil, peta, lawan, perolehan
 * pemain, dan koin. Tiap baris membuka rincian pertandingannya.
 */
export function MatchHistoryPage() {
  const matches = useHistoryStore((state) => state.matches);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Riwayat</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Pertandingan Lampau</h1>
      <p className="mt-2 mb-6 text-sm text-slate-400">{matches.length} pertandingan tercatat.</p>
      <HistoryTabs active="/riwayat/pertandingan" />

      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-slate-400">
          Belum ada pertandingan. <Link href="/lawan" className="text-emerald-300 hover:underline">Main sekarang</Link>.
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((match) => {
            const me = match.participants.find((p) => !p.isBot);
            const style = RESULT_STYLE[match.result];
            return (
              <li key={match.id}>
                <Link
                  href={`/riwayat/pertandingan/${match.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 transition-colors hover:border-white/25 hover:bg-slate-900"
                >
                  <span className={`w-20 rounded px-2 py-1 text-center text-[11px] font-semibold ${style.className}`}>{style.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{match.mapName}</span>
                    <span className="block text-[11px] text-slate-500" suppressHydrationWarning>
                      {formatMatchTime(match.startedAt)} · {DIFFICULTY_LABEL[match.difficulty]} · {match.botCount} bot
                    </span>
                  </span>
                  <span className="flex items-center gap-4 font-mono text-xs tabular-nums">
                    <span className="text-slate-300">
                      {me?.kills ?? 0}
                      <span className="text-slate-600">/</span>
                      {me?.deaths ?? 0}
                      <span className="ml-1 font-sans text-[10px] text-slate-500">K/M</span>
                    </span>
                    <span className="text-amber-300">
                      {me?.roundWins ?? 0}
                      <span className="ml-1 font-sans text-[10px] text-slate-500">ronde</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-200">
                      <CoinIcon className="h-3 w-3" />+{match.coinsEarned}
                    </span>
                  </span>
                  <span className="text-slate-600" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
