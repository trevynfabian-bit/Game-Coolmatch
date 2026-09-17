"use client";

import { ResultBadge } from "@/components/scoreboard/result-badge";
import { difficultyProfile } from "@/lib/game/difficulty";
import { findLocalScore, formatMatchTime } from "@/lib/game/scoreboard";
import type { MatchRecord } from "@/types/game";

/**
 * Daftar pertandingan yang pernah dimainkan, terbaru di atas. Tiap baris
 * adalah tombol: memilihnya menukar rincian yang ditampilkan di sebelahnya,
 * jadi riwayat ini bukan sekadar catatan yang tidak bisa disentuh.
 */
export function MatchHistory({
  records,
  selectedId,
  onSelect,
}: {
  records: MatchRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {records.map((record) => {
        const local = findLocalScore(record);
        const active = record.id === selectedId;
        const profile = difficultyProfile(record.difficulty);

        return (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onSelect(record.id)}
              aria-pressed={active}
              className={`w-full rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                active
                  ? "border-emerald-400/70 bg-emerald-500/10"
                  : "border-white/10 bg-slate-900/50 hover:border-white/25 hover:bg-slate-900"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <ResultBadge result={record.result} />
                <span className="truncate text-[11px] text-slate-500">
                  {formatMatchTime(record.startedAt)}
                </span>
              </span>

              <span className="mt-2 block truncate text-sm font-medium text-slate-200">
                {record.mapName}
              </span>

              <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                {record.botCount} musuh
                <span className="text-slate-700"> · </span>
                {profile.label.toLowerCase()}
                <span className="text-slate-700"> · </span>
                {record.roundsPlayed} ronde
              </span>

              {local ? (
                <span className="mt-2 flex items-center gap-3 border-t border-white/10 pt-2 font-mono text-[11px] tabular-nums">
                  <span className="text-amber-300">
                    {local.roundWins}
                    <span className="ml-1 font-sans text-[9px] text-slate-500 uppercase">
                      ronde
                    </span>
                  </span>
                  <span className="text-slate-200">
                    {local.kills}
                    <span className="ml-1 font-sans text-[9px] text-slate-500 uppercase">
                      kill
                    </span>
                  </span>
                  <span className="text-slate-500">
                    {local.deaths}
                    <span className="ml-1 font-sans text-[9px] uppercase">
                      mati
                    </span>
                  </span>
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
