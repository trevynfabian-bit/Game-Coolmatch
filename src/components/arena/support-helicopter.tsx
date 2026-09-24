"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { findKillstreak, helicopterPosition } from "@/lib/game/killstreak";
import { helicopterRuntime } from "@/lib/game/helicopter-runtime";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import type { ArenaMapInfo } from "@/types/game";

const BODY = "#3f4a3a";
const DARK = "#1f2420";
const GLASS = "#7dd3fc";

/** Model helikopter dari balok, silinder, dan bola — tanpa aset model. */
function HelicopterModel({
  mainRotorRef,
  tailRotorRef,
}: {
  mainRotorRef: React.RefObject<Group | null>;
  tailRotorRef: React.RefObject<Group | null>;
}) {
  return (
    <group>
      {/* Badan dan kokpit. Hidung menghadap -Z. */}
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.4, 3.4]} />
        <meshStandardMaterial color={BODY} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, -1.9]} castShadow>
        <sphereGeometry args={[0.85, 14, 10]} />
        <meshStandardMaterial color={GLASS} roughness={0.1} metalness={0.2} transparent opacity={0.75} />
      </mesh>
      {/* Ekor. */}
      <mesh position={[0, 0.25, 3.1]} castShadow>
        <boxGeometry args={[0.35, 0.35, 3.4]} />
        <meshStandardMaterial color={BODY} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.8, 4.6]} castShadow>
        <boxGeometry args={[0.12, 1.1, 0.6]} />
        <meshStandardMaterial color={BODY} roughness={0.6} />
      </mesh>
      {/* Poros dan baling-baling utama. */}
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <group ref={mainRotorRef} position={[0, 1.2, 0]}>
        <mesh>
          <boxGeometry args={[8.5, 0.05, 0.28]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[8.5, 0.05, 0.28]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      </group>
      {/* Baling-baling ekor. */}
      <group ref={tailRotorRef} position={[0.14, 0.8, 4.7]}>
        <mesh>
          <boxGeometry args={[0.04, 1.4, 0.12]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
      </group>
      {/* Kaki pendarat. */}
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.95, 0]}>
            <boxGeometry args={[0.1, 0.1, 3]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[x, -0.8, -0.8]}>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[x, -0.8, 0.8]}>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        </group>
      ))}
      {/* Senapan mesin di bawah hidung dan lampu penanda. */}
      <mesh position={[0, -0.7, -1.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.9, 8]} />
        <meshStandardMaterial color={DARK} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.35, 4.9]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#a3e635" emissive="#a3e635" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

/**
 * Helikopter dukungan: muncul saat hadiahnya aktif, terbang masuk dari luar
 * arena, berpatroli di jalur angka delapan, lalu keluar lagi saat waktunya
 * habis. Posisinya ditulis ke helicopterRuntime tiap frame.
 */
export function SupportHelicopter({ map }: { map: ArenaMapInfo }) {
  const endsAt = useKillstreakStore((state) => state.active.helikopter);
  const groupRef = useRef<Group>(null);
  const mainRotorRef = useRef<Group>(null);
  const tailRotorRef = useRef<Group>(null);
  const duration = findKillstreak("helikopter").durationSeconds;

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const now = performance.now();
    if (endsAt === undefined || endsAt <= now) {
      group.visible = false;
      helicopterRuntime.active = false;
      return;
    }

    const t = duration - (endsAt - now) / 1000;
    const here = helicopterPosition(t, duration, map.playableBounds);
    const ahead = helicopterPosition(t + 0.1, duration, map.playableBounds);
    const yaw = Math.atan2(-(ahead.x - here.x), -(ahead.z - here.z));

    group.visible = true;
    group.position.set(here.x, here.y, here.z);
    group.rotation.set(0.12, yaw, Math.sin(t * 0.8) * 0.06);

    if (mainRotorRef.current) mainRotorRef.current.rotation.y += delta * 28;
    if (tailRotorRef.current) tailRotorRef.current.rotation.x += delta * 40;

    helicopterRuntime.active = true;
    helicopterRuntime.x = here.x;
    helicopterRuntime.y = here.y;
    helicopterRuntime.z = here.z;
    helicopterRuntime.yaw = yaw;
  });

  return (
    <group ref={groupRef} visible={false}>
      <HelicopterModel mainRotorRef={mainRotorRef} tailRotorRef={tailRotorRef} />
    </group>
  );
}
