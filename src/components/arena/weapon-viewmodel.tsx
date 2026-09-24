"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { findSkin } from "@/lib/economy/skin-catalog";
import { skinFinish, skinTexture } from "@/lib/skins/skin-texture";
import { useCombatStore } from "@/lib/store/combat-store";
import { useSkinStore } from "@/lib/store/skin-store";
import { viewmodelRuntime } from "@/lib/game/viewmodel-runtime";

/**
 * Jarak senjata dari kamera. Ditahan cukup jauh supaya popor tidak menembus
 * near-plane dan senjata tidak menutupi layar.
 */
const GUN_DISTANCE = -1.15;
const GUN_SCALE = 0.78;

/**
 * Senjata sudut pandang orang pertama. Group luar menyalin transform kamera
 * tiap frame sehingga offset di dalamnya berperilaku seperti anak kamera, lalu
 * ditambah ayunan idle halus supaya arena tidak terasa beku. Skin yang
 * terpasang di senjata aktif dicat ke badan, laras, magasin, dan popornya.
 */
export function WeaponViewmodel({ color = "#39424d" }: { color?: string }) {
  // Skin senjata yang sedang dipegang ikut tampil di tangan pemain.
  const activeWeaponId = useCombatStore((state) => state.activeWeaponId);
  const skinId = useSkinStore((state) => state.collection.equipped[activeWeaponId]);
  const skin = findSkin(skinId);
  const texture = useMemo(() => (skin ? skinTexture(skin) : null), [skin]);
  const finish = skinFinish(skin);
  /** Material bagian yang ikut dicat skin (badan, laras, magasin, popor). */
  const painted = (factory: string, wood = false) =>
    texture ? (
      <meshStandardMaterial
        map={texture}
        roughness={finish.roughness}
        metalness={finish.metalness}
        emissive="#0d1116"
        emissiveIntensity={0.4}
      />
    ) : (
      <meshStandardMaterial
        color={factory}
        roughness={wood ? 0.8 : 0.45}
        metalness={wood ? 0.05 : 0.5}
        emissive={wood ? "#120d08" : "#0d1116"}
        emissiveIntensity={0.6}
      />
    );
  const rigRef = useRef<Group>(null);
  const gunRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);

  useFrame(({ clock }, delta) => {
    const rig = rigRef.current;
    const gun = gunRef.current;
    if (!rig || !gun) return;

    // Sentakan tembakan meluruh cepat kembali ke posisi diam.
    viewmodelRuntime.kick = Math.max(0, viewmodelRuntime.kick - Math.min(delta, 0.1) * 9);
    const kick = viewmodelRuntime.kick;

    rig.position.copy(camera.position);
    rig.quaternion.copy(camera.quaternion);

    // Ayunan idle: napas vertikal pelan plus geser horizontal lebih pelan lagi.
    const t = clock.elapsedTime;
    gun.position.set(
      0.46 + Math.sin(t * 0.6) * 0.01,
      -0.36 + Math.sin(t * 1.25) * 0.014 + kick * 0.02,
      GUN_DISTANCE + kick * 0.09,
    );
    gun.rotation.set(
      Math.sin(t * 1.25) * 0.01 + kick * 0.12,
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
          {painted(color)}
        </mesh>

        <mesh position={[0, 0.005, -0.62]}>
          <boxGeometry args={[0.065, 0.07, 0.55]} />
          {painted("#2a3139")}
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
          {painted("#333c46")}
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
          {painted("#5a4633", true)}
        </mesh>
      </group>
    </group>
  );
}
