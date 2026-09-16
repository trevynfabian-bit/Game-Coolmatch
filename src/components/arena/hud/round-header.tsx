import type { RoundState } from "@/types/game";

/** Format detik menjadi m:ss untuk timer ronde. */
function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const STATUS_LABEL: Record<RoundState["status"], string> = {
  warmup: "Pemanasan",
  live: "Berlangsung",
  ended: "Selesai",
};

/** Panel atas-tengah: nomor ronde, sisa waktu, dan batas skor. */
export function RoundHeader({ round }: { round: RoundState }) {
  const urgent = round.status === "live" && round.secondsLeft <= 30;

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 backdrop-blur-sm sm:gap-4 sm:px-4 sm:py-2">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
            Ronde
          </p>
          <p className="font-mono text-sm font-semibold text-slate-100">
            {round.current}
            <span className="text-slate-500">/{round.total}</span>
          </p>
        </div>

        <span className="h-8 w-px bg-white/10" />

        <div className="text-center">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
            {STATUS_LABEL[round.status]}
          </p>
          <p
            className={`font-mono text-lg leading-5 font-bold tabular-nums sm:text-xl sm:leading-6 ${
              urgent ? "text-rose-400" : "text-white"
            }`}
          >
            {formatClock(round.secondsLeft)}
          </p>
        </div>

        <span className="h-8 w-px bg-white/10" />

        <div className="text-center">
          <p className="text-[10px] tracking-[0.2em] text-slate-400 uppercase">
            Target
          </p>
          <p className="font-mono text-sm font-semibold text-slate-100">
            {round.scoreLimit} <span className="text-slate-500">kill</span>
          </p>
        </div>
      </div>
    </div>
  );
}
