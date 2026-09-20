"use client";

import { useRef } from "react";
import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group, MeshStandardMaterial } from "three";
import { WeaponMesh } from "@/components/weapons/weapon-mesh";
import {
  BOT_EYE_HEIGHT,
  PLAYER_CHEST_HEIGHT,
  REST_PITCH,
  aimPitch,
} from "@/lib/game/bot-ai";
import { getBot, livePosition, liveYaw } from "@/lib/game/bot-runtime";
import { secondsSinceHit } from "@/lib/game/fighter-runtime";
import { playerRuntime } from "@/lib/game/player-runtime";
import { findWeapon } from "@/lib/mock/weapons";
import type { Fighter } from "@/types/game";

/** Tinggi papan nama di atas kepala petarung, dalam satuan dunia. */
const NAMETAG_HEIGHT = 2.45;

/** Lama badan berkedip putih setelah kena tembak, dalam detik. */
const HIT_FLASH_SECONDS = 0.14;

/**
 * Seberapa cepat senjata mengikuti pitch sasarannya, per detik.
 *
 * Badan sudah berputar dengan kecepatan bidik profilnya; angka ini hanya
 * untuk sumbu angkat, dan sengaja cukup cepat supaya senjata tidak terlihat
 * "mengayun" tertinggal saat pemain melompat.
 */
const PITCH_FOLLOW = 9;

/**
 * Seberapa jauh badan mencondong saat terhuyung, dalam radian, pada dorongan
 * sebesar `STAGGER_FULL_TILT_SPEED` atau lebih. Condongnya ke arah larinya
 * peluru, berporos di kaki — seperti orang yang terdorong, bukan patung yang
 * digeser. Condongnya naik cepat di awal huyungan lalu pulih bersama
 * dorongannya yang meluruh.
 */
const STAGGER_TILT = 0.34;
const STAGGER_FULL_TILT_SPEED = 2;
/** Bagian awal huyungan yang dipakai untuk mencondong. */
const STAGGER_ATTACK = 0.25;

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
  const lurch = useRef<Group>(null);
  const weaponPitch = useRef<Group>(null);
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const headMaterial = useRef<MeshStandardMaterial>(null);
  const weapon = findWeapon(fighter.weaponId);

  // Dua hal dikerjakan langsung di objek Three, bukan lewat state React, supaya
  // musuh yang bergerak dan rentetan tembakan tidak memicu render ulang tiap
  // frame: posisi beserta arah hadap diambil dari runtime musuh, dan kedipan
  // kena tembak ditulis ke material.
  useFrame((_state, delta) => {
    const [x, y, z] = livePosition(fighter);
    if (group.current) {
      group.current.position.set(x, y, z);
      group.current.rotation.y = liveYaw(fighter);
    }

    const bot = fighter.isBot ? getBot(fighter.id) : undefined;

    // Terhuyung: badan, kepala, dan senjata mencondong bersama ke arah
    // larinya peluru lalu pulih. Arah dorongannya ada di ruang dunia dan
    // pembungkus ini sudah diputar sebesar yaw, jadi arahnya diputar balik ke
    // kerangka badan dulu; condong ke +Z lokal berarti memutar sumbu X, ke +X
    // lokal berarti memutar sumbu Z ke arah negatif.
    if (lurch.current) {
      const stagger = bot?.stagger ?? null;
      let tilt = 0;
      let lx = 0;
      let lz = 0;
      if (stagger && stagger.remaining > 0) {
        const t = 1 - stagger.remaining / stagger.duration;
        const attack = Math.min(1, t / STAGGER_ATTACK);
        tilt =
          STAGGER_TILT *
          Math.min(1, stagger.velocity / STAGGER_FULL_TILT_SPEED) *
          attack;
        const yaw = group.current?.rotation.y ?? 0;
        lx = stagger.dirX * Math.cos(yaw) - stagger.dirZ * Math.sin(yaw);
        lz = stagger.dirX * Math.sin(yaw) + stagger.dirZ * Math.cos(yaw);
      }
      lurch.current.rotation.x = tilt * lz;
      lurch.current.rotation.z = -tilt * lx;
      lurch.current.position.y = -tilt * 0.22;
    }

    // Senjata ikut MENGANGKAT ke dada pemain saat musuh terlibat; badannya
    // sendiri sudah berputar ke pemain lewat yaw. Saat berpatroli senjata
    // diturunkan sedikit, seperti orang yang berjalan, bukan mendatar kaku.
    if (weaponPitch.current) {
      const target =
        bot?.engaged && fighter.isAlive
          ? aimPitch(
              [x, y + BOT_EYE_HEIGHT, z],
              [
                playerRuntime.position[0],
                playerRuntime.position[1] + PLAYER_CHEST_HEIGHT,
                playerRuntime.position[2],
              ],
            )
          : REST_PITCH;
      const now = weaponPitch.current.rotation.x;
      weaponPitch.current.rotation.x =
        now + (target - now) * Math.min(1, delta * PITCH_FOLLOW);
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
      {/* Badan, kepala, dan senjata terhuyung bersama; cincin dan papan nama tidak. */}
      <group ref={lurch}>
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

        {/*
        Senjata di tangan kanan, setinggi dada, dan cukup ke samping supaya
        badannya tidak tenggelam di dalam kapsul badan — dilihat dari samping,
        yang tersisa dari senjata yang tenggelam hanya laras dan popornya, dan
        jenisnya tidak lagi terbaca. Pembungkus luar dibalik
        setengah putaran karena model senjata menghadap -Z sementara depan
        musuh adalah +Z — arah yang sama dengan yaw dari `stepBot`. Pitch
        ditulis ke pembungkus dalam, di kerangka modelnya, supaya "terangkat"
        selalu berarti moncong naik apa pun arah hadap badannya.
      */}
        {!dimmed ? (
          <group position={[0.44, 1.2, 0.18]} rotation={[0, Math.PI, 0]}>
            <group ref={weaponPitch} rotation={[REST_PITCH, 0, 0]}>
              <group scale={0.9}>
                <WeaponMesh weapon={weapon} />
              </group>
            </group>
          </group>
        ) : null}
      </group>

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
