"use client";

import { AmmoPanel } from "@/components/arena/hud/ammo-panel";
import { ControlHints } from "@/components/arena/hud/control-hints";
import { Crosshair } from "@/components/arena/hud/crosshair";
import { EngageOverlay } from "@/components/arena/hud/engage-overlay";
import { KillFeed } from "@/components/arena/hud/kill-feed";
import { LiveScore } from "@/components/arena/hud/live-score";
import { RoundHeader } from "@/components/arena/hud/round-header";
import { StanceBadge } from "@/components/arena/hud/stance-badge";
import { VitalsPanel } from "@/components/arena/hud/vitals-panel";
import { getLocalFighter, getScoreboard } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import { usePlayerStore } from "@/lib/store/player-store";
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
 * lapisan ini tidak menangkap pointer sama sekali supaya input bidik langsung
 * sampai ke kanvas di bawahnya.
 */
export function ArenaHud({ match }: { match: MatchSnapshot }) {
  const local = getLocalFighter(match);
  const weapon = findWeapon(local.weaponId);
  const isLocked = usePlayerStore((state) => state.isLocked);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 select-none">
        <LiveScore scoreboard={getScoreboard(match)} />
        <RoundHeader round={match.round} />
        <KillFeed entries={match.killFeed} />
        {isLocked && local.isAlive ? <Crosshair /> : null}
        <ControlHints />
        <StanceBadge />
        <VitalsPanel fighter={local} weapon={weapon} />
        <AmmoPanel weapon={weapon} />
        <MatchInfoStrip match={match} />
      </div>

      <EngageOverlay />
    </>
  );
}
