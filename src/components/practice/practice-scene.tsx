"use client";

import { useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { MeshStandardMaterial } from "three";
import { ArenaMap } from "@/components/arena/arena-map";
import { FpsTicker } from "@/components/arena/fps-ticker";
import { MapLights } from "@/components/arena/map-lights";
import { PlayerController } from "@/components/arena/player-controller";
import { WeaponSystem } from "@/components/arena/weapon-system";
import { WeaponViewmodel } from "@/components/arena/weapon-viewmodel";
import { EYE_HEIGHT } from "@/lib/game/controls";
import { useRenderQuality } from "@/lib/game/render-quality";
import type { ShotHit } from "@/lib/game/shooting";
import {
  RANGE_MAP,
  RANGE_SPAWN,
  RANGE_TARGETS,
  TARGET_INDEX_BY_BLOCK,
} from "@/lib/practice/range-map";
import { usePracticeStore } from "@/lib/store/practice-store";
import type { MatchSnapshot, Weapon } from "@/types/game";

/** Lama pelat sasaran berkedip setelah kena, dalam detik. */
const FLASH_SECONDS = 0.16;

/** Penanda waktu kena per sasaran, di luar React karena hanya soal material. */
const flashUntil = new Map<string, number>();

/**
 * Kilatan pada pelat sasaran. Pelatnya sendiri digambar ArenaMap sebagai balok
 * peta biasa; komponen ini hanya menumpuk bidang tipis bercahaya di depannya
 * supaya kena tembak terasa jelas tanpa menduplikasi geometri.
 */
function TargetFlashes() {
  const materials = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(() => {
    const now = performance.now() / 1000;
    RANGE_TARGETS.forEach((target, index) => {
      const material = materials.current[index];
      if (!material) return;
      const until = flashUntil.get(target.id) ?? 0;
      const left = until - now;
      material.opacity = left > 0 ? (left / FLASH_SECONDS) * 0.85 : 0;
    });
  });

  return (
    <>
      {RANGE_TARGETS.map((target, index) => {
        const block = RANGE_MAP.blocks.find((item) => item.id === target.id);
        if (!block) return null;
        return (
          <mesh
            key={target.id}
            position={[
              block.position[0],
              block.position[1],
              block.position[2] + block.size[2] / 2 + 0.01,
            ]}
          >
            <planeGeometry args={[block.size[0], block.size[1]]} />
            <meshStandardMaterial
              ref={(node) => {
                materials.current[index] = node;
              }}
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={1.4}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

/**
 * Tempat latihan menembak: lorong berisi empat sasaran di jarak berbeda, tanpa
 * lawan, tanpa nyawa, dan tanpa batas waktu.
 *
 * Gerak, bidik, dan mekanik menembak memakai komponen yang sama persis dengan
 * arena, jadi rasa senjata di sini benar-benar sama dengan saat bertanding.
 * Bedanya hanya tidak ada RoundTicker, RespawnTicker, maupun tembakan masuk.
 */
export function PracticeScene({
  snapshot,
  weapon,
}: {
  snapshot: MatchSnapshot;
  weapon: Weapon;
}) {
  const recordShot = usePracticeStore((state) => state.recordShot);
  const quality = useRenderQuality();

  const handleShot = useCallback(
    (hit: ShotHit | null) => {
      const targetId =
        hit && hit.kind === "map" && hit.blockIndex !== undefined
          ? (TARGET_INDEX_BY_BLOCK.get(hit.blockIndex) ?? null)
          : null;

      if (targetId) {
        flashUntil.set(targetId, performance.now() / 1000 + FLASH_SECONDS);
      }
      recordShot(targetId);
    },
    [recordShot],
  );

  return (
    <Canvas
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{
        fov: 75,
        near: 0.1,
        far: 220,
        position: [RANGE_SPAWN[0], RANGE_SPAWN[1] + EYE_HEIGHT, RANGE_SPAWN[2]],
      }}
      gl={{ antialias: quality.antialias }}
    >
      <color attach="background" args={[RANGE_MAP.skyColor]} />
      <fog attach="fog" args={[RANGE_MAP.fogColor, ...RANGE_MAP.fogRange]} />

      <FpsTicker />
      <MapLights lighting={RANGE_MAP.lighting} />
      <PlayerController map={RANGE_MAP} spawn={RANGE_SPAWN} />
      <WeaponSystem match={snapshot} weapon={weapon} onShot={handleShot} />
      <ArenaMap map={RANGE_MAP} />
      <TargetFlashes />
      <WeaponViewmodel weaponType={weapon.type} weaponId={weapon.id} />
    </Canvas>
  );
}
