import { difficultyProfile } from "@/lib/game/difficulty";
import {
  findLocalScore,
  findTiedLeaders,
  formatDuration,
  formatMatchDate,
  killRatio,
  matchDurationSeconds,
  rankScores,
} from "@/lib/game/scoreboard";
import { RoundResultStrip } from "@/components/scoreboard/round-result-strip";
import {
  ScoreRow,
  ScoreTableHead,
  scoreRowFromLine,
} from "@/components/scoreboard/score-row";
import { WinnerIndicator } from "@/components/scoreboard/winner-indicator";
import type { MatchRecord } from "@/types/game";

/** Satu angka besar pada ringkasan perolehan pemain. */
function Stat({
  label,
  value,
  accent = "text-slate-100",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5">
      <p className="text-[9px] tracking-[0.15em] text-slate-500 uppercase">
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${accent}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Kalimat yang menjelaskan kenapa pertandingan berhenti di ronde tertentu.
 *
 * Seri sengaja TIDAK ditangani di sini: indikator pemenang sudah menjelaskannya
 * dan bahkan menyebut siapa yang imbang, jadi menambahkan kalimat kedua hanya
 * mengulang hal yang sama dua baris di bawahnya.
 */
function endingNote(record: MatchRecord): string | null {
  if (record.result === "ditinggal") {
    return `Pertandingan ditinggal setelah ronde ${record.roundsPlayed}, jadi juaranya tidak pernah ditentukan.`;
  }
  if (record.roundsPlayed < record.totalRounds && record.winnerName) {
    return `Gelar terkunci di ronde ${record.roundsPlayed} — sisa ${
      record.totalRounds - record.roundsPlayed
    } ronde sudah tidak bisa mengubah juaranya.`;
  }
  return null;
}

/**
 * Rincian satu pertandingan yang sudah selesai: juara, perolehan pemain, dan
 * klasemen akhir seluruh peserta.
 *
 * Kolom utamanya kemenangan ronde, sama seperti papan skor di dalam arena —
 * itulah yang menentukan juara, sedangkan kill dan skor adalah rinciannya.
 */
export function MatchDetail({ record }: { record: MatchRecord }) {
  const ranked = rankScores(record.scores);
  const local = findLocalScore(record);
  const profile = difficultyProfile(record.difficulty);
  const note = endingNote(record);
  // Hanya perlu saat tidak ada juara; di luar itu indikator mengabaikannya.
  const tiedLeaders = record.winnerName
    ? []
    : findTiedLeaders(
        record.scores.map((score) => ({
          name: score.participantName,
          roundWins: score.roundWins,
          score: score.score,
          kills: score.kills,
          deaths: score.deaths,
        })),
      );

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
      <header className="border-b border-white/10 px-5 py-4">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Hasil pertandingan
        </p>
        <div className="mt-2">
          <WinnerIndicator
            winnerName={record.winnerName}
            unfinished={record.result === "ditinggal"}
            tiedNames={tiedLeaders}
          />
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="text-slate-300">{record.mapName}</span>
          <span>·</span>
          <span>tingkat {profile.label.toLowerCase()}</span>
          <span>·</span>
          <span>{record.botCount} musuh</span>
          <span>·</span>
          <span>
            {record.roundsPlayed} dari {record.totalRounds} ronde
          </span>
          <span>·</span>
          <span>batas {record.scoreLimit} kill</span>
        </p>

        <p className="mt-1.5 text-[11px] text-slate-600">
          {formatMatchDate(record.startedAt)}
          <span className="text-slate-700"> · </span>
          berlangsung {formatDuration(matchDurationSeconds(record))}
        </p>

        {note ? (
          <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">
            {note}
          </p>
        ) : null}
      </header>

      {record.rounds.length > 0 ? (
        <div className="border-b border-white/10 px-5 py-4">
          <RoundResultStrip rounds={record.rounds} />
        </div>
      ) : null}

      {local ? (
        <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-5 py-4 sm:grid-cols-5">
          <Stat label="Ronde" value={local.roundWins} accent="text-amber-300" />
          <Stat label="Kill" value={local.kills} />
          <Stat label="Mati" value={local.deaths} accent="text-slate-400" />
          <Stat label="K/M" value={killRatio(local.kills, local.deaths)} />
          <Stat label="Skor" value={local.score} accent="text-sky-300" />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left">
          <ScoreTableHead rank />
          <tbody>
            {ranked.map((score, index) => (
              <ScoreRow
                key={score.id}
                rank={index + 1}
                entry={scoreRowFromLine(score)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-white/10 px-5 py-2.5 text-[11px] text-slate-500">
        Juara ditentukan oleh kemenangan ronde terbanyak; skor dan kill hanya
        memecah kedudukan yang sama.
      </p>
    </section>
  );
}
