import {
  ARMOR_PER_ROUND,
  armorHint,
  displayArmor,
  displayHealth,
} from "@/lib/game/vitals";
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
 *
 * Angkanya dari petarung lokal di store, yang dikurangi tembakan masuk dan
 * dipulihkan aturan ronde: nyawa penuh saat muncul kembali dan saat ronde
 * baru, rompi hanya saat ronde baru. Bar rompi mengukur terhadap jatah rompi
 * satu ronde, dan bacaannya dibulatkan lewat `vitals` supaya pecahan dari
 * serapan rompi tidak pernah sampai ke layar.
 */
export function VitalsPanel({
  fighter,
  weapon,
}: {
  fighter: Fighter;
  weapon: Weapon;
}) {
  const health = displayHealth(fighter);
  const armor = displayArmor(fighter);
  const hint = armorHint(fighter);
  const critical = health <= 30;

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
                role="status"
                aria-label={`Nyawa ${health} dari ${fighter.maxHealth}`}
              >
                {health}
              </span>
              <div className="pb-1">
                <p className="mb-1 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                  Nyawa
                </p>
                <StatBar
                  value={health}
                  max={fighter.maxHealth}
                  color={critical ? "#fb7185" : "#34d399"}
                />
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span
                className={`font-mono text-xl leading-5 font-semibold tabular-nums ${
                  armor > 0 ? "text-sky-300" : "text-slate-500"
                }`}
                aria-label={`Rompi ${armor} dari ${ARMOR_PER_ROUND}`}
              >
                {armor}
              </span>
              <div className="pb-0.5">
                <p className="mb-1 text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                  Rompi
                </p>
                <StatBar value={armor} max={ARMOR_PER_ROUND} color="#38bdf8" />
                {hint ? (
                  <p className="mt-1 text-[10px] text-slate-500">{hint}</p>
                ) : null}
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
