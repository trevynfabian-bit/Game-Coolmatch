"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlayerNameForm } from "@/components/profile/player-name-form";
import { ActionButton, ActionRow } from "@/components/ui/action-button";
import { killRatio, summarizeHistory } from "@/lib/game/scoreboard";
import { useLocalPlayerName } from "@/lib/hooks/use-local-player-name";
import { buildMatchHistory } from "@/lib/mock/scoreboard";
import { useProfileStore } from "@/lib/store/profile-store";

/** Satu angka pada ikhtisar profil. */
function Stat({
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

/**
 * Profil pemain: siapa dia di game ini, dan apa yang sudah ia kerjakan.
 *
 * Bedanya dengan layar onboarding adalah pertanyaannya. Onboarding bertanya
 * "siapa namamu" kepada orang yang baru datang dan belum punya apa-apa;
 * halaman ini menjawab "namamu sekarang apa, dan sudah sejauh mana" kepada
 * orang yang sudah bermain. Isian namanya sama persis — disisipkan, bukan
 * ditulis ulang, supaya aturan nama tidak punya dua tafsir.
 *
 * Angkanya diambil dari riwayat yang sama dengan halaman papan skor, lewat
 * fungsi ringkasan yang sama, sehingga kedua halaman tidak bisa menyebutkan
 * jumlah kemenangan yang berbeda.
 */
export function ProfileScreen() {
  const playerName = useLocalPlayerName();
  const hasNamed = useProfileStore((state) => state.hasNamed);
  const summary = useMemo(
    () => summarizeHistory(buildMatchHistory(playerName)),
    [playerName],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Profil pemain
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {playerName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {hasNamed
            ? "Nama ini yang muncul di papan skor dan kill feed, tersimpan di perangkat ini saja."
            : "Kamu belum menamai diri sendiri, jadi ini nama bawaannya. Ganti di bawah kapan saja."}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Rekam jejak
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pertandingan" value={summary.matchesPlayed} />
          <Stat
            label="Menang"
            value={summary.wins}
            accent="text-emerald-300"
            suffix={`/ ${summary.matchesPlayed}`}
          />
          <Stat label="Rasio menang" value={summary.winRate} suffix="%" />
          <Stat
            label="K/D"
            value={killRatio(summary.totalKills, summary.totalDeaths)}
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-600">
          {summary.totalKills} kill berbanding {summary.totalDeaths} kematian
          sepanjang {summary.matchesPlayed} pertandingan.{" "}
          <Link
            href="/skor"
            className="text-emerald-400 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Lihat rinciannya
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Ganti nama
        </h2>
        <div className="rounded-xl border border-white/10 bg-slate-900/50 px-5 py-5">
          <PlayerNameForm embedded />
        </div>
      </section>

      <ActionRow>
        <ActionButton href="/lawan">Main cepat</ActionButton>
        <ActionButton href="/skor">Papan skor</ActionButton>
        <ActionButton href="/">Kembali ke menu</ActionButton>
      </ActionRow>
    </div>
  );
}
