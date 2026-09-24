"use client";

import { useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { playTargetPing } from "@/lib/audio/sfx";
import { ArenaMap } from "@/components/arena/arena-map";
import { PlayerController } from "@/components/arena/player-controller";
import { WeaponSystem } from "@/components/arena/weapon-system";
import { WeaponViewmodel } from "@/components/arena/weapon-viewmodel";
import { EYE_HEIGHT } from "@/lib/game/controls";
import type { ShotHit } from "@/lib/game/shooting";
import {
  RANGE_MAP,
  RANGE_SPAWN,
  RANGE_TARGETS,
  TARGET_INDEX_BY_BLOCK,
} from "@/lib/practice/range-map";
import { usePracticeStore } from "@/lib/store/practice-store";
import { QUALITY_PRESETS, canvasDpr, useSettingsStore } from "@/lib/store/settings-store";
import { CameraFov } from "@/components/arena/camera-fov";
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

const DECAL_POOL = 30;
const DECAL_SECONDS = 4;

/** Bekas peluru yang menempel sesaat di pelat sasaran; kolam tetap di luar React. */
const decals: { point: [number, number, number]; until: number }[] = [];
let nextDecal = 0;

function addDecal(point: [number, number, number]) {
  decals[nextDecal % DECAL_POOL] = { point, until: performance.now() / 1000 + DECAL_SECONDS };
  nextDecal += 1;
}

/**
 * Bekas tembakan di sasaran: titik gelap yang memudar, jadi pemain bisa
 * melihat sebaran pelurunya sendiri — rapat atau menyebar — di tiap jarak.
 */
function HitDecals() {
  const meshes = useRef<(Mesh | null)[]>([]);
  useFrame(() => {
    const now = performance.now() / 1000;
    for (let i = 0; i < DECAL_POOL; i++) {
      const mesh = meshes.current[i];
      const decal = decals[i];
      if (!mesh) continue;
      if (!decal || decal.until <= now) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(decal.point[0], decal.point[1], decal.point[2] + 0.02);
      (mesh.material as MeshBasicMaterial).opacity = Math.min(0.9, (decal.until - now) / 1.2);
    }
  });
  return (
    <>
      {Array.from({ length: DECAL_POOL }, (_, index) => (
        <mesh key={index} ref={(mesh) => { meshes.current[index] = mesh; }} visible={false}>
          <circleGeometry args={[0.045, 10]} />
          <meshBasicMaterial color="#111827" transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/** Pencahayaan lorong latihan: terang dan rata supaya sasaran mudah dibaca. */
function RangeLights() {
  return (
    <>
      <hemisphereLight args={["#aebfd6", "#3a3f4a", 1.3]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[6, 18, 10]}
        intensity={1.6}
        color="#ffe9cc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={90}
      />
      <directionalLight position={[-8, 6, -20]} intensity={0.55} color="#8fb3e0" />
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

  const handleShot = useCallback(
    (hit: ShotHit | null) => {
      const targetId =
        hit && hit.kind === "map" && hit.blockIndex !== undefined
          ? (TARGET_INDEX_BY_BLOCK.get(hit.blockIndex) ?? null)
          : null;

      if (targetId && hit) {
        flashUntil.set(targetId, performance.now() / 1000 + FLASH_SECONDS);
        addDecal(hit.point);
        playTargetPing(RANGE_TARGETS.find((target) => target.id === targetId)?.distance ?? 20);
      }
      recordShot(targetId);
    },
    [recordShot],
  );

  const graphics = useSettingsStore((state) => state.graphics);
  const preset = QUALITY_PRESETS[graphics.quality];

  return (
    <Canvas
      shadows={preset.shadows}
      dpr={canvasDpr(graphics)}
      camera={{
        fov: 75,
        near: 0.1,
        far: 220,
        position: [RANGE_SPAWN[0], RANGE_SPAWN[1] + EYE_HEIGHT, RANGE_SPAWN[2]],
      }}
      gl={{ antialias: preset.antialias }}
    >
      <CameraFov />
      <color attach="background" args={[RANGE_MAP.skyColor]} />
      <fog attach="fog" args={[RANGE_MAP.fogColor, 45, 130]} />

      <RangeLights />
      <PlayerController map={RANGE_MAP} spawn={RANGE_SPAWN} />
      <WeaponSystem match={snapshot} weapon={weapon} onShot={handleShot} />
      <ArenaMap map={RANGE_MAP} />
      <TargetFlashes />
      <HitDecals />
      <WeaponViewmodel />
    </Canvas>
  );
}
