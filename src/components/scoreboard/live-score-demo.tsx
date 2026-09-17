"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KillFeedList } from "@/components/arena/hud/kill-feed";
import {
  ScoreRow,
  ScoreTableHead,
  type ScoreRowEntry,
} from "@/components/scoreboard/score-row";
import { difficultyProfile } from "@/lib/game/difficulty";
import {
  createSimulation,
  rankParticipants,
  simulationTotals,
  stepSimulation,
  type SimParticipant,
  type SimState,
  type SimulationSetup,
} from "@/lib/game/score-simulation";

/** Jeda antar kill yang disimulasikan. Cukup pelan untuk diikuti mata. */
const STEP_MS = 1100;

/** Pengaturan pertandingan yang disimulasikan; ronde pendek supaya cepat terlihat. */
const SETUP: SimulationSetup = {
  difficulty: "normal",
  botCount: 3,
  scoreLimit: 5,
  totalRounds: 3,
};

/** Baris papan skor dari peserta simulasi. */
function rowFrom(
  participant: SimParticipant,
  leaderWins: number,
  ended: boolean,
  winnerName: string | null,
): ScoreRowEntry {
  return {
    id: participant.id,
    name: participant.name,
    color: participant.color,
    roundWins: participant.roundWins,
    kills: participant.kills,
    deaths: participant.deaths,
    score: participant.score,
    isLocal: participant.isLocal,
    starTitle: ended
      ? participant.name === winnerName
        ? "Juara"
        : null
      : participant.roundWins > 0 && participant.roundWins === leaderWins
        ? "Memimpin kemenangan ronde"
        : null,
  };
}

/**
 * Papan skor langsung, dijalankan oleh simulasi.
 *
 * Bagian ini menjawab satu hal yang tidak bisa ditunjukkan riwayat: bahwa angka
 * kill, kematian, dan skor benar-benar BERGERAK selama pertandingan, bukan cuma
 * muncul di akhir. Sampai layer backend ada, memeriksanya tanpa ini berarti
 * memainkan satu pertandingan penuh lebih dulu.
 *
 * Yang disimulasikan hanya siapa menembak siapa. Akibatnya — nilai per kill,
 * pemenang ronde, dan kapan pertandingan ditutup — dihitung modul yang sama
 * dengan yang dipakai arena sungguhan, dan barisnya dirender komponen papan
 * skor yang sama pula. Jadi yang dilihat di sini memang perilaku yang akan
 * berjalan di arena, bukan tiruan terpisah yang bisa diam-diam berbeda.
 */
export function LiveScoreDemo() {
  // Keadaan awal dihitung dari benih tetap, jadi hasil render di server dan
  // render hidrasi pertama di browser selalu sama persis. Simulasinya sendiri
  // baru berjalan sesudah komponen terpasang.
  const [state, setState] = useState<SimState>(() => createSimulation(SETUP));
  const [running, setRunning] = useState(true);

  const isEnded = state.status === "ended";

  useEffect(() => {
    if (!running || isEnded) return;
    const timer = window.setInterval(
      () => setState((current) => stepSimulation(current)),
      STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [running, isEnded]);

  const reset = useCallback(() => {
    // Benih diputar agar ulangan berikutnya tidak persis sama; tanpa itu tombol
    // ini hanya memutar rekaman yang sama berulang-ulang.
    setState(createSimulation({ ...SETUP, seed: Date.now() | 0 }));
    setRunning(true);
  }, []);

  const ranked = useMemo(
    () => rankParticipants(state.participants),
    [state.participants],
  );
  const totals = useMemo(() => simulationTotals(state), [state]);
  const leaderWins = ranked[0]?.roundWins ?? 0;
  const profile = difficultyProfile(SETUP.difficulty);

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
            Papan skor langsung
          </p>
          <h2 className="mt-1.5 text-lg font-bold text-white">
            {isEnded
              ? state.winnerName
                ? `${state.winnerName} juara simulasi`
                : "Simulasi berakhir seri"
              : `Ronde ${state.round.current} dari ${state.round.total}`}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span>{state.participants.length} peserta</span>
            <span>·</span>
            <span>tingkat {profile.label.toLowerCase()}</span>
            <span>·</span>
            <span>batas {state.round.scoreLimit} kill per ronde</span>
            <span>·</span>
            <span className="font-mono tabular-nums">
              {totals.kills} kill
            </span>
            <span>·</span>
            <span className="font-mono tabular-nums">
              {totals.headshots} headshot
            </span>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            disabled={isEnded}
            className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? "Jeda" : "Jalankan"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          >
            Ulangi
          </button>
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-left">
            <ScoreTableHead rank />
            <tbody>
              {ranked.map((participant, index) => (
                <ScoreRow
                  key={participant.id}
                  rank={index + 1}
                  entry={rowFrom(
                    participant,
                    leaderWins,
                    isEnded,
                    state.winnerName,
                  )}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/*
          Daftar kejadian yang sama dengan yang dipakai arena, tetapi duduk
          biasa di dalam kolom ini — penempatan melayangnya di arena tidak ikut
          terbawa.
        */}
        <div className="hidden border-l border-white/10 px-4 py-3 lg:block">
          <p className="mb-2 text-[10px] tracking-[0.15em] text-slate-500 uppercase">
            Kejadian
          </p>
          {state.feed.length === 0 ? (
            <p className="text-[11px] text-slate-600">
              Menunggu tembakan pertama…
            </p>
          ) : (
            <KillFeedList entries={state.feed} />
          )}
        </div>
      </div>

      <p className="border-t border-white/10 px-5 py-2.5 text-[11px] leading-relaxed text-slate-500">
        {isEnded
          ? "Simulasi selesai — tekan Ulangi untuk menjalankan pertandingan baru."
          : "Angka di atas bergerak tiap kali ada yang tumbang, persis seperti papan skor di dalam arena."}{" "}
        Nilai per kill, penentuan pemenang ronde, dan kapan pertandingan ditutup
        memakai aturan yang sama dengan arena sungguhan.
      </p>
    </section>
  );
}
