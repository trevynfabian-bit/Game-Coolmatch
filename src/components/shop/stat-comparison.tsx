"use client";

import { useMemo } from "react";
import { applyUpgrades, diffWeapons } from "@/lib/economy/weapon-modifiers";
import { weaponFeel } from "@/lib/weapons/weapon-feel";
import type { WeaponUpgradeState } from "@/types/economy";
import type { Weapon } from "@/types/game";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

/**
 * Pratinjau perbandingan statistik: keadaan senjata sekarang lawan keadaan
 * bila barang yang sedang disorot dibeli atau dipasang.
 *
 * Tanpa kandidat, panel menampilkan statistik efektif sekarang dibanding
 * statistik dasar pabrik, supaya pemain tetap tahu apa yang sudah ia dapat.
 */
export function StatComparison({
  weapon,
  current,
  candidate,
  candidateLabel,
  accent,
}: {
  weapon: Weapon;
  current: WeaponUpgradeState;
  /** Keadaan hipotetis bila barang yang disorot jadi dibeli; null bila tidak ada. */
  candidate: WeaponUpgradeState | null;
  candidateLabel: string | null;
  accent: string;
}) {
  const now = useMemo(() => applyUpgrades(weapon, current), [weapon, current]);
  const next = useMemo(
    () => (candidate ? applyUpgrades(weapon, candidate) : null),
    [weapon, candidate],
  );
  const before = next ? now : weapon;
  const after = next ?? now;
  const rows = useMemo(() => diffWeapons(before, after), [before, after]);
  const feelBefore = weaponFeel(before);
  const feelAfter = weaponFeel(after);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4" aria-live="polite">
      <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
        {next ? "Pratinjau efek" : "Statistik efektif"}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white">
        {next ? candidateLabel : weapon.name}
      </p>
      <p className="text-[11px] text-slate-500">
        {next ? "Sekarang → sesudah dibeli/dipasang" : "Pabrik → dengan upgrade kamu"}
      </p>

      <table className="mt-3 w-full text-xs">
        <tbody>
          {rows.map((row) => {
            const changed = row.before !== row.after;
            const better = row.lowerIsBetter ? row.after < row.before : row.after > row.before;
            return (
              <tr key={row.key} className="border-t border-white/5">
                <th scope="row" className="py-1.5 text-left font-normal text-slate-400">
                  {row.label}
                </th>
                <td className="py-1.5 text-right font-mono text-slate-500 tabular-nums">
                  {formatNumber(row.before)}
                  {row.unit}
                </td>
                <td className="w-5 text-center text-slate-600">→</td>
                <td
                  className={`py-1.5 text-right font-mono tabular-nums ${
                    !changed ? "text-slate-300" : better ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {formatNumber(row.after)}
                  {row.unit}
                  {changed ? <span className="ml-1 text-[10px]">{better ? "▲" : "▼"}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p
        className="mt-3 rounded-lg border px-3 py-2 text-[11px]"
        style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10`, color: accent }}
      >
        Tumbang dalam {feelBefore.shotsToKill} → {feelAfter.shotsToKill} tembakan badan
      </p>
    </div>
  );
}
