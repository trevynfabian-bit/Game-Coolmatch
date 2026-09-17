"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ScoreRow,
  ScoreTableHead,
  scoreRowFromFighter,
} from "@/components/scoreboard/score-row";
import { restartMatch } from "@/lib/game/match-reset";
import type { ArenaMapInfo, Fighter, MatchSnapshot, RoundState } from "@/types/game";

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

  /**
   * Pertandingan bisa ditutup sebelum ronde terakhir, yaitu saat keunggulan
   * juaranya sudah tidak mungkin disusul. Tanpa keterangan ini pemain hanya
   * melihat pertandingan lima ronde yang tiba-tiba berhenti di ronde ketiga
   * dan mengira ada yang rusak.
   */
  const clinchedEarly = Boolean(round.matchWinner) && round.current < round.total;

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
            {round.current} dari {round.total} ronde
            <span className="text-slate-600"> · </span>
            batas {round.scoreLimit} kill
          </p>

          {clinchedEarly ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Gelar terkunci di ronde {round.current} — sisa{" "}
              {round.total - round.current} ronde sudah tidak bisa mengubah
              juaranya.
            </p>
          ) : null}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
          <table className="w-full text-left">
            <ScoreTableHead rank />
            <tbody>
              {ranked.map((fighter, index) => (
                <ScoreRow
                  key={fighter.id}
                  rank={index + 1}
                  entry={scoreRowFromFighter(fighter, {
                    matchEnded: true,
                    starTitle:
                      round.matchWinner === fighter.name ? "Juara" : null,
                  })}
                />
              ))}
            </tbody>
          </table>
        </div>

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

        <p className="mt-4 text-center text-[11px] text-slate-600">
          &ldquo;Main lagi&rdquo; memakai pengaturan yang sama; &ldquo;Ganti
          lawan&rdquo; membuka lagi pilihan tingkat kesulitan dan jumlah musuh.
        </p>
      </div>
    </div>
  );
}
