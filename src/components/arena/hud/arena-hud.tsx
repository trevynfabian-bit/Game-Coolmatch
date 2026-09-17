"use client";

import { useMemo } from "react";
import { AmmoPanel } from "@/components/arena/hud/ammo-panel";
import { ControlHints } from "@/components/arena/hud/control-hints";
import { DamageNumbers } from "@/components/arena/hud/damage-numbers";
import { DamageVignette } from "@/components/arena/hud/damage-vignette";
import { Crosshair } from "@/components/arena/hud/crosshair";
import { EngageOverlay } from "@/components/arena/hud/engage-overlay";
import { KillFeed } from "@/components/arena/hud/kill-feed";
import { LiveScore } from "@/components/arena/hud/live-score";
import { MatchEndScreen } from "@/components/arena/hud/match-end-screen";
import { RoundBanner } from "@/components/arena/hud/round-banner";
import { RoundHeader } from "@/components/arena/hud/round-header";
import { ScoreboardOverlay } from "@/components/arena/hud/scoreboard-overlay";
import { StanceBadge } from "@/components/arena/hud/stance-badge";
import { VitalsPanel } from "@/components/arena/hud/vitals-panel";
import { WeaponSlots } from "@/components/arena/hud/weapon-slots";
import { getLocalFighter } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import { sortScoreboard, useMatchStore } from "@/lib/store/match-store";
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
        {/* Pertandingan lokal tidak punya ping; menampilkan "0 ms" hanya bikin
            bingung, jadi angkanya disembunyikan saat nol. */}
        {match.pingMs > 0 ? (
          <>
            <span className="text-slate-600">•</span>
            <span className="font-mono tabular-nums">{match.pingMs} ms</span>
          </>
        ) : null}
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
  const isLocked = usePlayerStore((state) => state.isLocked);
  const fighters = useMatchStore((state) => state.fighters);
  const killFeed = useMatchStore((state) => state.killFeed);
  const round = useMatchStore((state) => state.round);
  const roundResults = useMatchStore((state) => state.roundResults);
  const startedAt = useMatchStore((state) => state.startedAt);
  const endedAt = useMatchStore((state) => state.endedAt);

  // Sebelum store terisi pada render pertama, jatuh ke potret pertandingan
  // supaya HUD tidak pernah kosong sekejap.
  const local =
    fighters.find((fighter) => fighter.isLocal) ?? getLocalFighter(match);
  const activeRound = round.total > 0 ? round : match.round;
  const scoreboard = useMemo(
    () => sortScoreboard(fighters.length > 0 ? fighters : match.fighters),
    [fighters, match.fighters],
  );
  const weapon = findWeapon(local.weaponId);

  return (
    <>
      <DamageVignette fighter={local} />

      <div className="pointer-events-none absolute inset-0 z-10 select-none">
        <LiveScore scoreboard={scoreboard} />
        <RoundHeader round={activeRound} />
        <KillFeed
          entries={killFeed.length > 0 ? killFeed : match.killFeed}
          localName={local.name}
        />
        {isLocked && local.isAlive ? <Crosshair /> : null}
        <DamageNumbers />
        <ControlHints />
        <StanceBadge />
        <VitalsPanel fighter={local} weapon={weapon} />
        <AmmoPanel weapon={weapon} />
        <WeaponSlots />
        <MatchInfoStrip match={match} />
      </div>

      <ScoreboardOverlay
        fighters={fighters.length > 0 ? fighters : match.fighters}
        round={activeRound}
        pingMs={match.pingMs}
      />

      <RoundBanner
        round={activeRound}
        fighters={fighters.length > 0 ? fighters : match.fighters}
      />

      <MatchEndScreen
        round={activeRound}
        fighters={fighters.length > 0 ? fighters : match.fighters}
        map={match.map}
        snapshot={match}
        roundResults={roundResults}
        startedAt={startedAt}
        endedAt={endedAt}
      />

      <EngageOverlay round={activeRound} match={match} />
    </>
  );
}
