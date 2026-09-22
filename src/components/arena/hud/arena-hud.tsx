"use client";

import { useMemo } from "react";
import { AmmoPanel } from "@/components/arena/hud/ammo-panel";
import { CoinCounter } from "@/components/arena/hud/coin-counter";
import { ControlHints } from "@/components/arena/hud/control-hints";
import { DamageNumbers } from "@/components/arena/hud/damage-numbers";
import { DamageVignette } from "@/components/arena/hud/damage-vignette";
import { FpsMeter } from "@/components/arena/hud/fps-meter";
import { Crosshair } from "@/components/arena/hud/crosshair";
import { EngageOverlay } from "@/components/arena/hud/engage-overlay";
import { KillFeed } from "@/components/arena/hud/kill-feed";
import { LiveScore } from "@/components/arena/hud/live-score";
import { MatchEndScreen } from "@/components/arena/hud/match-end-screen";
import { RoundBanner } from "@/components/arena/hud/round-banner";
import { RoundHeader } from "@/components/arena/hud/round-header";
import { ScoreboardOverlay } from "@/components/arena/hud/scoreboard-overlay";
import { StanceBadge } from "@/components/arena/hud/stance-badge";
import { TrialBadge } from "@/components/arena/hud/trial-badge";
import { VitalsPanel } from "@/components/arena/hud/vitals-panel";
import { WeaponSlots } from "@/components/arena/hud/weapon-slots";
import { UnlockCelebration } from "@/components/weapons/unlock-celebration";
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
export function ArenaHud({
  match,
  isTrial = false,
}: {
  match: MatchSnapshot;
  /**
   * Benar bila pertandingan ini uji coba senjata. Dioper sebagai prop, bukan
   * dibaca dari penyimpanan: niat uji cobanya sudah dibuang begitu arena
   * berdiri, sedangkan penandanya harus bertahan sepanjang pertandingan.
   */
  isTrial?: boolean;
}) {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const fighters = useMatchStore((state) => state.fighters);
  const killFeed = useMatchStore((state) => state.killFeed);
  const round = useMatchStore((state) => state.round);
  const roundResults = useMatchStore((state) => state.roundResults);
  const matchResult = useMatchStore((state) => state.matchResult);
  const startedAt = useMatchStore((state) => state.startedAt);
  const endedAt = useMatchStore((state) => state.endedAt);
  const generation = useMatchStore((state) => state.generation);

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
        {/*
          Yang disebut adalah senjata yang DIUJI, bukan yang sedang dipegang.
          Pemain bisa menukar senjata di tengah pertandingan lewat tombol
          angka — justru berguna untuk membandingkan — dan penanda yang ikut
          berganti akan kehilangan gunanya: ia ada untuk mengingatkan kenapa
          aturan pertandingan ini berbeda.
        */}
        {isTrial ? (
          <TrialBadge
            weaponName={findWeapon(getLocalFighter(match).weaponId).name}
          />
        ) : null}
        <KillFeed
          entries={killFeed.length > 0 ? killFeed : match.killFeed}
          localName={local.name}
        />
        {isLocked && local.isAlive ? <Crosshair /> : null}
        <DamageNumbers />
        <ControlHints />
        <StanceBadge />
        <VitalsPanel fighter={local} weapon={weapon} round={activeRound} />
        <AmmoPanel weapon={weapon} />
        {/*
          Saldo koin tidak ditampilkan pada pertandingan uji coba. Uji coba
          memang tidak mengubah progres apa pun, jadi saldo yang terpampang di
          sana adalah angka yang dijamin tidak bergerak — dan angka yang tidak
          pernah bergerak di tengah pertandingan hanya mengajari pemain untuk
          berhenti memperhatikannya.
        */}
        {isTrial ? null : <CoinCounter />}
        <WeaponSlots />
        <MatchInfoStrip match={match} />
        <FpsMeter />
      </div>

      <ScoreboardOverlay
        fighters={fighters.length > 0 ? fighters : match.fighters}
        round={activeRound}
        pingMs={match.pingMs}
      />

      <RoundBanner
        round={activeRound}
        fighters={fighters.length > 0 ? fighters : match.fighters}
        lastResult={roundResults[roundResults.length - 1] ?? null}
      />

      <MatchEndScreen
        isTrial={isTrial}
        /*
          Kunci pertandingan menggabungkan id dan generasinya. Id sendiri tidak
          berganti saat pemain menekan "Main lagi", jadi memakainya sendirian
          berarti pertandingan kedua dianggap pertandingan yang sudah dibayar
          dan koinnya tidak pernah masuk.
        */
        matchKey={`${match.matchId}-g${generation}`}
        round={activeRound}
        fighters={fighters.length > 0 ? fighters : match.fighters}
        map={match.map}
        snapshot={match}
        roundResults={roundResults}
        matchResult={matchResult}
        startedAt={startedAt}
        endedAt={endedAt}
      />

      <EngageOverlay round={activeRound} match={match} />

      {/*
        Dipasang paling akhir, dan memang harus menumpuk segalanya: ia memakai
        elemen dialog bawaan browser, yang naik ke lapisan teratas halaman
        terlepas dari urutan di sini — termasuk di atas ringkasan akhir
        pertandingan yang sedang tampil di belakangnya.
      */}
      <UnlockCelebration isTrial={isTrial} />
    </>
  );
}
