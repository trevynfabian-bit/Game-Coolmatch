import type { KillFeedEntry } from "@/types/game";

/**
 * Feed kanan-atas berisi kejadian tembakan mematikan terbaru. Entri paling baru
 * ditaruh di atas; kill oleh pemain lokal diberi sorotan.
 */
export function KillFeed({ entries }: { entries: KillFeedEntry[] }) {
  const latest = [...entries].sort((a, b) => b.atSecond - a.atSecond).slice(0, 5);

  if (latest.length === 0) return null;

  return (
    <ul className="pointer-events-none absolute top-4 right-5 hidden w-64 flex-col gap-1 lg:flex">
      {latest.map((entry, index) => {
        const byPlayer = entry.killerName === "Kamu";
        return (
          <li
            key={entry.id}
            className={`flex items-center justify-end gap-1.5 rounded border px-2 py-1 text-[11px] backdrop-blur-sm ${
              byPlayer
                ? "border-emerald-400/30 bg-emerald-950/60"
                : "border-white/10 bg-slate-950/60"
            }`}
            style={{ opacity: 1 - index * 0.15 }}
          >
            <span
              className={`font-semibold ${
                byPlayer ? "text-emerald-300" : "text-slate-200"
              }`}
            >
              {entry.killerName}
            </span>
            <span className="text-slate-500">{entry.weaponName}</span>
            {entry.isHeadshot ? (
              <span
                className="text-amber-300"
                title="Headshot"
                aria-label="Headshot"
              >
                ◎
              </span>
            ) : null}
            <span className="text-slate-600">→</span>
            <span className="text-slate-400">{entry.victimName}</span>
          </li>
        );
      })}
    </ul>
  );
}
