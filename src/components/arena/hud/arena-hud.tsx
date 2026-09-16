import { AmmoPanel } from "@/components/arena/hud/ammo-panel";
import { Crosshair } from "@/components/arena/hud/crosshair";
import { KillFeed } from "@/components/arena/hud/kill-feed";
import { LiveScore } from "@/components/arena/hud/live-score";
import { RoundHeader } from "@/components/arena/hud/round-header";
import { VitalsPanel } from "@/components/arena/hud/vitals-panel";
import { getLocalFighter, getScoreboard } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import type { MatchSnapshot } from "@/types/game";

const DIFFICULTY_LABEL: Record<MatchSnapshot["difficulty"], string> = {
  santai: "Santai",
  normal: "Normal",
  susah: "Susah",
};

/** Baris tipis di bawah-tengah: peta, kesulitan, jumlah bot, dan ping. */
function MatchInfoStrip({ match }: { match: MatchSnapshot }) {
  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 lg:block">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/60 px-4 py-1.5 text-[11px] text-slate-400 backdrop-blur-sm">
        <span className="font-medium text-slate-200">{match.map.name}</span>
        <span className="text-slate-600">•</span>
        <span>{DIFFICULTY_LABEL[match.difficulty]}</span>
        <span className="text-slate-600">•</span>
        <span>{match.botCount} bot</span>
        <span className="text-slate-600">•</span>
        <span className="font-mono tabular-nums">{match.pingMs} ms</span>
      </div>
    </div>
  );
}

/**
 * Seluruh lapisan HUD arena. Semuanya dibaca dari satu `MatchSnapshot`, dan
 * lapisan ini tidak menangkap pointer sama sekali supaya nanti input bidik
 * langsung sampai ke kanvas di bawahnya.
 */
export function ArenaHud({ match }: { match: MatchSnapshot }) {
  const local = getLocalFighter(match);
  const weapon = findWeapon(local.weaponId);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none">
      <LiveScore scoreboard={getScoreboard(match)} />
      <RoundHeader round={match.round} />
      <KillFeed entries={match.killFeed} />
      {local.isAlive ? <Crosshair /> : null}
      <VitalsPanel fighter={local} weapon={weapon} />
      <AmmoPanel
        weapon={weapon}
        inMagazine={match.ammoInMagazine}
        reserve={match.ammoReserve}
      />
      <MatchInfoStrip match={match} />

      <p className="absolute top-20 left-1/2 max-w-[92vw] -translate-x-1/2 rounded-full border border-amber-400/25 bg-amber-950/50 px-3 py-1 text-center text-[10px] text-amber-200/90 backdrop-blur-sm sm:text-[11px] lg:top-auto lg:bottom-16 lg:whitespace-nowrap">
        Data tiruan — kontrol gerak, bidik, dan tembak menyusul di task berikutnya
      </p>
    </div>
  );
}
