import type { Fighter, Weapon } from "@/types/game";

/** Bar horizontal generik untuk nyawa dan rompi. */
function StatBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className="block h-1.5 w-20 overflow-hidden rounded-full bg-white/10 sm:w-32">
      <span
        className="block h-full rounded-full transition-[width] duration-300"
        style={{ width: `${ratio * 100}%`, backgroundColor: color }}
      />
    </span>
  );
}

/**
 * Panel kiri-bawah: nyawa, rompi, dan status respawn pemain lokal.
 * Angkanya masih dari data tiruan; pengurangan nyawa asli menyusul di task
 * nyawa & muncul lagi.
 */
export function VitalsPanel({
  fighter,
  weapon,
}: {
  fighter: Fighter;
  weapon: Weapon;
}) {
  const critical = fighter.health <= 30;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 sm:bottom-5 sm:left-5">
      <div className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2.5 backdrop-blur-sm sm:px-4 sm:py-3">
        {fighter.isAlive ? (
          <>
            <div className="mb-2 flex items-end gap-3">
              <span
                className={`font-mono text-2xl leading-6 font-bold tabular-nums sm:text-3xl sm:leading-7 ${
                  critical ? "text-rose-400" : "text-emerald-300"
                }`}
              >
                {fighter.health}
              </span>
              <div className="pb-1">
                <p className="mb-1 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                  Nyawa
                </p>
                <StatBar
                  value={fighter.health}
                  max={fighter.maxHealth}
                  color={critical ? "#fb7185" : "#34d399"}
                />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="font-mono text-xl leading-5 font-semibold tabular-nums text-sky-300">
                {fighter.armor}
              </span>
              <div className="pb-0.5">
                <p className="mb-1 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                  Rompi
                </p>
                <StatBar value={fighter.armor} max={100} color="#38bdf8" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-44">
            <p className="text-[10px] tracking-[0.2em] text-rose-400 uppercase">
              Kamu tumbang
            </p>
            <p className="font-mono text-2xl font-bold text-white">
              Muncul lagi dalam {fighter.respawnInSeconds ?? 0}s
            </p>
          </div>
        )}

        <p className="mt-2.5 hidden border-t border-white/10 pt-2 text-[11px] text-slate-400 sm:block">
          Senjata aktif:{" "}
          <span className="font-medium text-slate-200">{weapon.name}</span>
        </p>
      </div>
    </div>
  );
}
