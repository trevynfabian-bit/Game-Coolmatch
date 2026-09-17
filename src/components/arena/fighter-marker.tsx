"use client";

import { useRef } from "react";
import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { livePosition, liveYaw } from "@/lib/game/bot-runtime";
import { secondsSinceHit } from "@/lib/game/fighter-runtime";
import type { Fighter } from "@/types/game";

/** Tinggi papan nama di atas kepala petarung, dalam satuan dunia. */
const NAMETAG_HEIGHT = 2.45;

/** Lama badan berkedip putih setelah kena tembak, dalam detik. */
const HIT_FLASH_SECONDS = 0.14;

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

  const group = useRef<Group>(null);
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const headMaterial = useRef<MeshStandardMaterial>(null);

  // Dua hal dikerjakan langsung di objek Three, bukan lewat state React, supaya
  // musuh yang bergerak dan rentetan tembakan tidak memicu render ulang tiap
  // frame: posisi beserta arah hadap diambil dari runtime musuh, dan kedipan
  // kena tembak ditulis ke material.
  useFrame(() => {
    if (group.current) {
      const [x, y, z] = livePosition(fighter);
      group.current.position.set(x, y, z);
      group.current.rotation.y = liveYaw(fighter);
    }

    const since = secondsSinceHit(fighter.id);
    const strength =
      since >= HIT_FLASH_SECONDS ? 0 : 1 - since / HIT_FLASH_SECONDS;
    for (const material of [bodyMaterial.current, headMaterial.current]) {
      if (!material) continue;
      material.emissiveIntensity = strength * 1.6;
    }
  });

  return (
    <group
      ref={group}
      position={fighter.position}
      rotation={[0, fighter.rotationY, 0]}
    >
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.9, 4, 12]} />
        <meshStandardMaterial
          ref={bodyMaterial}
          color={fighter.color}
          roughness={0.6}
          emissive="#ffffff"
          emissiveIntensity={0}
          transparent={dimmed}
          opacity={dimmed ? 0.25 : 1}
        />
      </mesh>

      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial
          ref={headMaterial}
          color={fighter.color}
          roughness={0.5}
          emissive="#ffffff"
          emissiveIntensity={0}
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
