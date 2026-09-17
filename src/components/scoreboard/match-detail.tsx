import { difficultyProfile } from "@/lib/game/difficulty";
import {
  findLocalScore,
  formatDuration,
  formatMatchDate,
  killRatio,
  matchDurationSeconds,
  rankScores,
} from "@/lib/game/scoreboard";
import { RESULT_STYLE } from "@/components/scoreboard/result-badge";
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

/** Kalimat yang menjelaskan kenapa pertandingan berhenti di ronde tertentu. */
function endingNote(record: MatchRecord): string | null {
  if (record.result === "ditinggal") {
    return `Pertandingan ditinggal setelah ronde ${record.roundsPlayed}, jadi juaranya tidak pernah ditentukan.`;
  }
  if (record.roundsPlayed < record.totalRounds && record.winnerName) {
    return `Gelar terkunci di ronde ${record.roundsPlayed} — sisa ${
      record.totalRounds - record.roundsPlayed
    } ronde sudah tidak bisa mengubah juaranya.`;
  }
  if (!record.winnerName && record.result === "seri") {
    return "Kedudukan ronde berakhir imbang sampai ronde terakhir, jadi tidak ada juara.";
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
  const style = RESULT_STYLE[record.result];
  const note = endingNote(record);

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
      <header className="border-b border-white/10 px-5 py-4">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Hasil pertandingan
        </p>
        <h2 className={`mt-2 text-2xl font-bold ${style.text}`}>
          {record.winnerName
            ? record.winnerName === "Kamu"
              ? "Kamu juara"
              : `${record.winnerName} juara`
            : record.result === "ditinggal"
              ? "Tidak selesai"
              : "Berakhir seri"}
        </h2>

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
          <thead>
            <tr className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
              <th className="px-5 py-2 font-medium">Peringkat</th>
              <th className="w-14 px-2 py-2 text-right font-medium">Ronde</th>
              <th className="w-12 px-2 py-2 text-right font-medium">Kill</th>
              <th className="w-12 px-2 py-2 text-right font-medium">Mati</th>
              <th className="w-14 px-2 py-2 text-right font-medium">K/M</th>
              <th className="w-16 px-5 py-2 text-right font-medium">Skor</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((score, index) => (
              <tr
                key={score.id}
                className={`border-t border-white/5 ${
                  score.isLocal ? "bg-sky-500/10" : ""
                }`}
              >
                <td className="px-5 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 font-mono text-xs text-slate-500 tabular-nums">
                      {index + 1}
                    </span>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: score.color }}
                      aria-hidden
                    />
                    <span
                      className={`truncate text-sm ${
                        score.isLocal
                          ? "font-semibold text-sky-200"
                          : "text-slate-200"
                      }`}
                    >
                      {score.participantName}
                    </span>
                    {score.isWinner ? (
                      <span className="text-[10px] text-amber-300" title="Juara">
                        ★
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm font-semibold text-amber-300 tabular-nums">
                  {score.roundWins}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
                  {score.kills}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-slate-500 tabular-nums">
                  {score.deaths}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-slate-400 tabular-nums">
                  {killRatio(score.kills, score.deaths)}
                </td>
                <td className="px-5 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
                  {score.score}
                </td>
              </tr>
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
