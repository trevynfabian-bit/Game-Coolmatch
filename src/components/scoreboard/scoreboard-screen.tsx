"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LiveScoreDemo } from "@/components/scoreboard/live-score-demo";
import { MatchDetail } from "@/components/scoreboard/match-detail";
import { MatchHistory } from "@/components/scoreboard/match-history";
import { killRatio, summarizeHistory } from "@/lib/game/scoreboard";
import { MOCK_MATCH_HISTORY } from "@/lib/mock/scoreboard";
import type { MatchRecord } from "@/types/game";

/** Satu angka pada ikhtisar di bagian atas halaman. */
function Overview({
  label,
  value,
  suffix,
  accent = "text-slate-100",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
      <p className="text-[9px] tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${accent}`}>
        {value}
        {suffix ? (
          <span className="ml-1 font-sans text-xs font-normal text-slate-500">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** Tampilan saat pemain belum pernah menyelesaikan satu pertandingan pun. */
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-slate-900/30 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-300">
        Belum ada pertandingan yang tercatat
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
        Selesaikan satu pertandingan melawan musuh otomatis, dan hasilnya —
        juara, kemenangan ronde, kill, dan skor tiap peserta — akan muncul di
        halaman ini.
      </p>
      <Link
        href="/lawan"
        className="mt-5 inline-block rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        Mulai bertanding
      </Link>
    </div>
  );
}

/**
 * Halaman Skor Pertandingan: ikhtisar seluruh perolehan pemain, daftar
 * pertandingan yang pernah dimainkan, dan klasemen akhir pertandingan yang
 * sedang dipilih.
 *
 * Sumber datanya masih riwayat tiruan. Prop `records` sengaja dibuka supaya
 * task backend nanti tinggal mengoper hasil pengambilan tabel `matches` dan
 * `match_scores` tanpa mengubah satu pun komponen di bawahnya.
 */
export function ScoreboardScreen({
  records = MOCK_MATCH_HISTORY,
}: {
  records?: MatchRecord[];
}) {
  // Pertandingan terbaru yang dibuka lebih dulu: itu yang paling mungkin ingin
  // dilihat pemain begitu halaman ini terbuka.
  const [selectedId, setSelectedId] = useState(() => records[0]?.id ?? "");

  const summary = useMemo(() => summarizeHistory(records), [records]);
  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? records[0],
    [records, selectedId],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Riwayat bertanding
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Skor Pertandingan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Hasil akhir tiap pertandingan yang pernah kamu mainkan: siapa juaranya,
          berapa ronde yang dimenangkan, dan perolehan lengkap semua peserta.
        </p>
      </header>

      {records.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Overview label="Pertandingan" value={summary.matchesPlayed} />
            <Overview
              label="Menang"
              value={summary.wins}
              suffix={`dari ${summary.wins + summary.losses + summary.draws}`}
              accent="text-emerald-300"
            />
            <Overview
              label="Tingkat menang"
              value={summary.winRate}
              suffix="%"
              accent="text-amber-300"
            />
            <Overview
              label="Rasio K/M"
              value={killRatio(summary.totalKills, summary.totalDeaths)}
              suffix={`${summary.totalKills} kill : ${summary.totalDeaths} mati`}
              accent="text-sky-300"
            />
          </section>

          {/*
            Jumlah pertandingan dan penyebut tingkat menang bisa berbeda, dan
            selisihnya perlu dijelaskan — kalau tidak, "6 pertandingan" di
            sebelah "menang 2 dari 5" terbaca seperti salah hitung.
          */}
          {summary.matchesPlayed > summary.wins + summary.losses + summary.draws ? (
            <p className="-mt-5 mb-8 text-[11px] text-slate-600">
              Pertandingan yang ditinggal di tengah jalan tetap dihitung kill dan
              matinya, tetapi tidak masuk hitungan menang-kalah karena juaranya
              tidak pernah ditentukan.
            </p>
          ) : null}

          <section className="mb-8">
            <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
              Papan skor selama bertanding
            </h2>
            <LiveScoreDemo />
          </section>

          <div className="grid gap-6 lg:grid-cols-[19rem_1fr] lg:items-start">
            <section>
              <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
                Riwayat pertandingan
              </h2>
              <MatchHistory
                records={records}
                selectedId={selected?.id ?? ""}
                onSelect={setSelectedId}
              />
            </section>

            {selected ? <MatchDetail record={selected} /> : null}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/lawan"
          className="flex-1 rounded-lg bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Bertanding lagi
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-lg border border-white/15 px-6 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        >
          Kembali ke menu
        </Link>
      </div>
    </div>
  );
}
