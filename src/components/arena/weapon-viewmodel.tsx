"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

/**
 * Jarak senjata dari kamera. Ditahan cukup jauh supaya popor tidak menembus
 * near-plane dan senjata tidak menutupi layar.
 */
const GUN_DISTANCE = -1.15;
const GUN_SCALE = 0.78;

/**
 * Senjata sudut pandang orang pertama. Group luar menyalin transform kamera
 * tiap frame sehingga offset di dalamnya berperilaku seperti anak kamera, lalu
 * ditambah ayunan idle halus supaya arena tidak terasa beku.
 */
export function WeaponViewmodel({ color = "#39424d" }: { color?: string }) {
  const rigRef = useRef<Group>(null);
  const gunRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);

  useFrame(({ clock }) => {
    const rig = rigRef.current;
    const gun = gunRef.current;
    if (!rig || !gun) return;

    rig.position.copy(camera.position);
    rig.quaternion.copy(camera.quaternion);

    // Ayunan idle: napas vertikal pelan plus geser horizontal lebih pelan lagi.
    const t = clock.elapsedTime;
    gun.position.set(
      0.46 + Math.sin(t * 0.6) * 0.01,
      -0.36 + Math.sin(t * 1.25) * 0.014,
      GUN_DISTANCE,
    );
    gun.rotation.set(
      Math.sin(t * 1.25) * 0.01,
      -0.06 + Math.sin(t * 0.6) * 0.014,
      0,
    );
  });

  return (
    <group ref={rigRef}>
      {/* Lampu ikut kamera supaya senjata tidak pernah jadi siluet hitam. */}
      <pointLight
        position={[0.5, 0.1, -0.7]}
        intensity={3}
        distance={4}
        decay={2}
        color="#ffe9cc"
      />

      <group ref={gunRef} scale={GUN_SCALE}>
        <mesh>
          <boxGeometry args={[0.13, 0.17, 0.72]} />
          <meshStandardMaterial
            color={color}
            roughness={0.45}
            metalness={0.5}
            emissive="#0d1116"
            emissiveIntensity={0.6}
          />
        </mesh>

        <mesh position={[0, 0.005, -0.62]}>
          <boxGeometry args={[0.065, 0.07, 0.55]} />
          <meshStandardMaterial
            color="#2a3139"
            roughness={0.35}
            metalness={0.65}
            emissive="#0d1116"
            emissiveIntensity={0.6}
          />
        </mesh>

        <mesh position={[0, 0.115, -0.12]}>
          <boxGeometry args={[0.05, 0.06, 0.22]} />
          <meshStandardMaterial
            color="#20272e"
            roughness={0.4}
            metalness={0.6}
            emissive="#0d1116"
            emissiveIntensity={0.6}
          />
        </mesh>

        <mesh position={[0, -0.2, 0.02]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.1, 0.3, 0.16]} />
          <meshStandardMaterial
            color="#333c46"
            roughness={0.6}
            metalness={0.3}
            emissive="#0d1116"
            emissiveIntensity={0.6}
          />
        </mesh>

        <mesh position={[0, -0.16, 0.3]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[0.09, 0.24, 0.13]} />
          <meshStandardMaterial
            color="#5a4633"
            roughness={0.8}
            metalness={0.05}
            emissive="#120d08"
            emissiveIntensity={0.6}
          />
        </mesh>

        <mesh position={[0, -0.01, 0.52]}>
          <boxGeometry args={[0.11, 0.15, 0.26]} />
          <meshStandardMaterial
            color="#5a4633"
            roughness={0.8}
            metalness={0.05}
            emissive="#120d08"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
    </group>
  );
}
