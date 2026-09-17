"use client";

import { Canvas } from "@react-three/fiber";
import { ArenaMap } from "@/components/arena/arena-map";
import { FighterMarker } from "@/components/arena/fighter-marker";
import { PlayerController } from "@/components/arena/player-controller";
import { RespawnTicker } from "@/components/arena/respawn-ticker";
import { RoundTicker } from "@/components/arena/round-ticker";
import { StubIncomingFire } from "@/components/arena/stub-incoming-fire";
import { WeaponSwap } from "@/components/arena/weapon-swap";
import { WeaponSystem } from "@/components/arena/weapon-system";
import { WeaponViewmodel } from "@/components/arena/weapon-viewmodel";
import { EYE_HEIGHT } from "@/lib/game/controls";
import { getLocalFighter } from "@/lib/mock/match";
import { findWeapon } from "@/lib/mock/weapons";
import { useMatchStore } from "@/lib/store/match-store";
import type { MatchSnapshot } from "@/types/game";

/** Pencahayaan arena: matahari senja yang menghasilkan bayangan + isian lembut. */
function ArenaLights() {
  return (
    <>
      <hemisphereLight args={["#9db4d2", "#3a332b", 1.15]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[18, 26, 10]}
        intensity={1.9}
        color="#ffd9ad"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      <directionalLight
        position={[-14, 10, -12]}
        intensity={0.5}
        color="#7aa2d6"
      />
    </>
  );
}

/**
 * Kanvas 3D arena. Seluruh isinya digambar dari `MatchSnapshot` yang dioper,
 * jadi saat data tiruan diganti respons API nanti, komponen ini tidak berubah.
 */
export function ArenaScene({ match }: { match: MatchSnapshot }) {
  const spawnFighter = getLocalFighter(match);
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
      shadows
      dpr={[1, 1.75]}
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
      gl={{ antialias: true }}
    >
      <color attach="background" args={[match.map.skyColor]} />
      <fog attach="fog" args={[match.map.fogColor, 34, 110]} />

      <ArenaLights />
      <PlayerController map={match.map} spawn={spawnFighter.position} />
      <RespawnTicker map={match.map} />
      <RoundTicker map={match.map} />
      <WeaponSystem match={match} weapon={weapon} />
      <WeaponSwap />
      {/* Sementara sampai AI musuh dibangun di fase berikutnya. */}
      <StubIncomingFire map={match.map} difficulty={match.difficulty} />
      <ArenaMap map={match.map} />

      {fighters
        .filter((fighter) => !fighter.isLocal)
        .map((fighter) => (
          <FighterMarker key={fighter.id} fighter={fighter} />
        ))}

      <WeaponViewmodel color={spawnFighter.color === "#38bdf8" ? "#39424d" : spawnFighter.color} />
    </Canvas>
  );
}
