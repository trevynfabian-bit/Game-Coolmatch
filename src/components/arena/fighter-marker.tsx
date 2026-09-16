"use client";

import { Billboard, Html } from "@react-three/drei";
import type { Fighter } from "@/types/game";

/** Tinggi papan nama di atas kepala petarung, dalam satuan dunia. */
const NAMETAG_HEIGHT = 2.45;

/**
 * Penanda satu petarung di arena: badan kapsul low-poly, kepala, laras senjata
 * sebagai petunjuk arah hadap, plus papan nama + bar nyawa yang selalu
 * menghadap kamera. Petarung yang sedang mati dirender tembus pandang.
 */
export function FighterMarker({ fighter }: { fighter: Fighter }) {
  const healthRatio = Math.max(
    0,
    Math.min(1, fighter.health / fighter.maxHealth),
  );
  const dimmed = !fighter.isAlive;

  return (
    <group position={fighter.position} rotation={[0, fighter.rotationY, 0]}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.9, 4, 12]} />
        <meshStandardMaterial
          color={fighter.color}
          roughness={0.6}
          transparent={dimmed}
          opacity={dimmed ? 0.25 : 1}
        />
      </mesh>

      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial
          color={fighter.color}
          roughness={0.5}
          transparent={dimmed}
          opacity={dimmed ? 0.25 : 1}
        />
      </mesh>

      <mesh position={[0.18, 1.15, -0.5]} castShadow>
        <boxGeometry args={[0.1, 0.12, 0.85]} />
        <meshStandardMaterial
          color="#1f2937"
          roughness={0.4}
          metalness={0.5}
          transparent={dimmed}
          opacity={dimmed ? 0.25 : 1}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.45, 0.6, 20]} />
        <meshBasicMaterial
          color={fighter.color}
          transparent
          opacity={dimmed ? 0.15 : 0.55}
        />
      </mesh>

      <Billboard position={[0, NAMETAG_HEIGHT, 0]}>
        <Html center pointerEvents="none" zIndexRange={[10, 0]}>
          <div className="pointer-events-none flex w-24 flex-col items-center gap-1 select-none">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-white/90 drop-shadow"
              style={{ backgroundColor: "rgba(9,12,18,0.72)" }}
            >
              {fighter.name}
              {fighter.isBot ? "" : " ★"}
            </span>
            <span className="h-1 w-16 overflow-hidden rounded-full bg-black/60">
              <span
                className="block h-full rounded-full transition-[width]"
                style={{
                  width: `${healthRatio * 100}%`,
                  backgroundColor: fighter.color,
                }}
              />
            </span>
            {!fighter.isAlive && fighter.respawnInSeconds !== null ? (
              <span className="rounded bg-black/70 px-1 text-[10px] text-amber-300">
                respawn {fighter.respawnInSeconds}s
              </span>
            ) : null}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}
