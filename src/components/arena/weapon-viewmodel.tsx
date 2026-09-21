"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Mesh, PointLight } from "three";
import {
  currentEffectCursor,
  readCombatEffects,
} from "@/lib/game/combat-effects";
import { BARREL_TIP, flashFor } from "@/lib/game/muzzle-flash";
import { playerRuntime } from "@/lib/game/player-runtime";
import { viewmodelPose } from "@/lib/game/viewmodel-anim";
import { runtimeProgress, weaponRuntime } from "@/lib/game/weapon-runtime";
import { clipsFor } from "@/lib/mock/viewmodel-clips";
import type { WeaponType } from "@/types/game";

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
export function WeaponViewmodel({
  color = "#39424d",
  weaponType,
}: {
  color?: string;
  /** Menentukan watak kilatan moncongnya; kosong berarti senapan serbu. */
  weaponType?: WeaponType;
}) {
  const rigRef = useRef<Group>(null);
  const gunRef = useRef<Group>(null);
  const flashRef = useRef<Mesh>(null);
  const flashLightRef = useRef<PointLight>(null);
  const flashUntil = useRef(0);
  /**
   * Batas baca antrean efek. Kilatan moncong pemain digambar DI SINI, sebagai
   * anak grup senjatanya, bukan di lapisan efek dunia — dengan begitu ia ikut
   * bergerak bersama ayunan dan sentakan senjata, dan tidak pernah melayang
   * lepas dari ujung laras seperti saat posisinya ditulis terpisah.
   */
  const cursor = useRef(currentEffectCursor());
  const camera = useThree((state) => state.camera);
  const flash = flashFor(weaponType);
  const clips = clipsFor(weaponType);
  /**
   * Jam tembakan terakhir, dicatat di ref dan bukan di store: ia hanya dipakai
   * di dalam loop frame, dan menaruhnya di store berarti render ulang React
   * tiap kali pelatuk ditarik. Jam isi ulang dan pergantian senjata datang
   * dari runtime senjata, supaya animasinya memakai jam yang sama persis
   * dengan yang membuka pelatuk.
   */
  const lastShot = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const rig = rigRef.current;
    const gun = gunRef.current;
    if (!rig || !gun) return;

    rig.position.copy(camera.position);
    rig.quaternion.copy(camera.quaternion);

    const now = performance.now() / 1000;
    // Kilatan moncong PEMAIN saja: kejadian tanpa posisi dunia.
    const bacaan = readCombatEffects(cursor.current);
    cursor.current = bacaan.cursor;
    for (const event of bacaan.events) {
      if (event.kind === "moncong" && event.at3 === null) {
        flashUntil.current = now + flash.seconds;
        // Kejadian yang sama memicu sentakan senjatanya: satu tarikan
        // pelatuk, satu kilatan, satu sentakan.
        lastShot.current = now;
      }
    }

    const menyala = now < flashUntil.current;
    if (flashRef.current) flashRef.current.visible = menyala;
    if (flashLightRef.current) {
      flashLightRef.current.intensity = menyala ? flash.intensity : 0;
    }

    /*
      Seluruh gerakan senjata datang dari kontroler animasi: napas diam,
      ayunan langkah, sentakan tembakan, isi ulang, dan pergantian senjata —
      dijumlahkan sebagai lapisan, bukan dipilih salah satu. Menembak sambil
      berlari karena itu terlihat sebagai keduanya sekaligus.
    */
    const pose = viewmodelPose(
      {
        time: clock.elapsedTime,
        speed: playerRuntime.planarSpeed,
        sinceShot: lastShot.current === null ? null : now - lastShot.current,
        reloadProgress: runtimeProgress(
          weaponRuntime.reloadEndsAt,
          weaponRuntime.reloadSeconds,
          now,
        ),
        swapProgress: runtimeProgress(
          weaponRuntime.swapEndsAt,
          weaponRuntime.swapSeconds,
          now,
        ),
      },
      clips,
    );

    gun.position.set(0.46 + pose.px, -0.36 + pose.py, GUN_DISTANCE + pose.pz);
    gun.rotation.set(pose.rx, -0.06 + pose.ry, pose.rz);
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
        {/*
          Kilatan dan cahayanya duduk di UJUNG LARAS, sebagai anak grup yang
          sama dengan model senjatanya. Keduanya karena itu ikut bergerak
          bersama ayunan senjata tanpa satu baris pun kode penyelaras.
        */}
        <mesh ref={flashRef} position={BARREL_TIP} visible={false}>
          <sphereGeometry args={[flash.radius, 8, 8]} />
          <meshBasicMaterial color={flash.color} transparent opacity={0.95} />
        </mesh>
        <pointLight
          ref={flashLightRef}
          position={BARREL_TIP}
          intensity={0}
          distance={flash.distance}
          decay={2}
          color={flash.color}
        />

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
