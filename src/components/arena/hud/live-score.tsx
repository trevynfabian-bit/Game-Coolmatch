import type { Fighter } from "@/types/game";

/**
 * Papan skor ringkas di kiri-atas selama pertandingan berjalan: nama, kill,
 * dan mati tiap peserta. Ringkasan akhir yang lebih lengkap ditangani fase
 * penilaian.
 */
export function LiveScore({ scoreboard }: { scoreboard: Fighter[] }) {
  return (
    <div className="pointer-events-none absolute top-4 left-5 hidden w-56 lg:block">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/70 backdrop-blur-sm">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-white/10 px-3 py-1.5 text-[10px] tracking-[0.15em] text-slate-400 uppercase">
          <span>Pemain</span>
          <span className="w-6 text-right">K</span>
          <span className="w-6 text-right">M</span>
        </div>

        <ul>
          {scoreboard.map((fighter) => (
            <li
              key={fighter.id}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-1.5 text-xs ${
                fighter.isLocal ? "bg-sky-500/10" : ""
              }`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: fighter.color }}
                  aria-hidden
                />
                <span
                  className={`truncate ${
                    fighter.isLocal
                      ? "font-semibold text-sky-200"
                      : "text-slate-300"
                  } ${fighter.isAlive ? "" : "opacity-45"}`}
                >
                  {fighter.name}
                </span>
              </span>
              <span className="w-6 text-right font-mono tabular-nums text-slate-100">
                {fighter.kills}
              </span>
              <span className="w-6 text-right font-mono tabular-nums text-slate-500">
                {fighter.deaths}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
