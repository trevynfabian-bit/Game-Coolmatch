"use client";

import { Canvas } from "@react-three/fiber";
import { ArenaMap } from "@/components/arena/arena-map";
import { BotDriver } from "@/components/arena/bot-driver";
import { FighterMarker } from "@/components/arena/fighter-marker";
import { FpsTicker } from "@/components/arena/fps-ticker";
import { MapLights } from "@/components/arena/map-lights";
import { PlayerController } from "@/components/arena/player-controller";
import { RespawnTicker } from "@/components/arena/respawn-ticker";
import { RoundTicker } from "@/components/arena/round-ticker";
import { WeaponSwap } from "@/components/arena/weapon-swap";
import { WeaponSystem } from "@/components/arena/weapon-system";
import { WeaponViewmodel } from "@/components/arena/weapon-viewmodel";
import { EYE_HEIGHT } from "@/lib/game/controls";
import { useRenderQuality } from "@/lib/game/render-quality";
import { getLocalFighter } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import { useMatchStore } from "@/lib/store/match-store";
import type { MatchSnapshot } from "@/types/game";

/**
 * Kanvas 3D arena. Seluruh isinya digambar dari `MatchSnapshot` yang dioper,
 * jadi saat data tiruan diganti respons API nanti, komponen ini tidak berubah.
 */
export function ArenaScene({ match }: { match: MatchSnapshot }) {
  const spawnFighter = getLocalFighter(match);
  const quality = useRenderQuality();
  // Petarung dibaca dari state yang hidup supaya nyawa, kematian, dan skor
  // langsung terlihat di arena.
  const fighters = useMatchStore((state) => state.fighters);
  // Senjata juga dibaca dari state hidup, bukan dari potret, supaya pergantian
  // senjata di tengah pertandingan langsung dipakai sistem tembak.
  const weapon = findWeapon(
    fighters.find((fighter) => fighter.isLocal)?.weaponId ??
      spawnFighter.weaponId,
  );

  return (
    <Canvas
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{
        fov: 75,
        near: 0.1,
        far: 220,
        position: [
          spawnFighter.position[0],
          spawnFighter.position[1] + EYE_HEIGHT,
          spawnFighter.position[2],
        ],
      }}
      gl={{ antialias: quality.antialias }}
    >
      <color attach="background" args={[match.map.skyColor]} />
      <fog attach="fog" args={[match.map.fogColor, ...match.map.fogRange]} />

      <FpsTicker />
      <MapLights lighting={match.map.lighting} />
      <PlayerController map={match.map} spawn={spawnFighter.position} />
      <RespawnTicker map={match.map} />
      <RoundTicker map={match.map} />
      <WeaponSystem match={match} weapon={weapon} />
      <WeaponSwap />
      <BotDriver map={match.map} difficulty={match.difficulty} />
      <ArenaMap map={match.map} />

      {fighters
        .filter((fighter) => !fighter.isLocal)
        .map((fighter) => (
          <FighterMarker key={fighter.id} fighter={fighter} />
        ))}

      <WeaponViewmodel
        color={
          spawnFighter.color === "#38bdf8" ? "#39424d" : spawnFighter.color
        }
      />
    </Canvas>
  );
}
