"use client";

import { Grid } from "@react-three/drei";
import type { ArenaMapInfo, MapBlock } from "@/types/game";

/** Satu balok penghalang. Semua bentuk arena dibangun dari primitif box. */
function Block({ block }: { block: MapBlock }) {
  const isCrate = block.kind === "crate";

  return (
    <mesh
      position={block.position}
      rotation={[0, block.rotationY ?? 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={block.size} />
      <meshStandardMaterial
        color={block.color ?? "#6b6053"}
        roughness={isCrate ? 0.85 : 0.95}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * Merender geometri statis arena: lantai, garis petak, dan seluruh balok
 * penghalang dari `ArenaMapInfo`. Murni tampilan — tabrakan dan fisika
 * ditangani task berikutnya.
 */
export function ArenaMap({ map }: { map: ArenaMapInfo }) {
  const [width, depth] = map.floorSize;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={map.floorColor} roughness={1} />
      </mesh>

      <Grid
        args={[width, depth]}
        position={[0, 0.02, 0]}
        cellSize={1.5}
        cellThickness={0.5}
        cellColor="#6f6455"
        sectionSize={7.5}
        sectionThickness={1}
        sectionColor="#9a8a72"
        fadeDistance={60}
        fadeStrength={1.4}
        side={2}
      />

      {map.blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </group>
  );
}
