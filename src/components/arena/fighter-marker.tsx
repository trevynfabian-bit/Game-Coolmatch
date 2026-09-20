"use client";

import { useRef } from "react";
import { Billboard, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from "three";
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
import { respawnOutlook, respawnTag } from "@/lib/game/respawn-rules";
import { findWeapon } from "@/lib/mock/weapons";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
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
 * Roboh saat nyawa habis: badan rebah ke arah larinya peluru terakhir,
 * berporos di kaki, lalu tergeletak sebentar dan memudar sampai lenyap —
 * jauh sebelum hitung mundur respawn (empat detik) habis, supaya arena tidak
 * dipenuhi mayat tembus pandang yang berdiri kaku seperti sebelumnya.
 * Robohnya makin cepat makin ke bawah, seperti benda yang jatuh, bukan
 * pintu yang diayun pelan.
 */
const COLLAPSE_SECONDS = 0.55;
const CORPSE_HOLD_SECONDS = 0.9;
const CORPSE_FADE_SECONDS = 0.6;
/** Angkat kapsul badan saat rebah supaya bertumpu di lantai, bukan tenggelam. */
const CORPSE_LIFT = 0.35;
/** Kepekatan cincin di kaki saat hidup dan saat baru roboh. */
const RING_OPACITY = 0.55;
const RING_OPACITY_DEAD = 0.3;

/**
 * Muncul kembali: badan mewujud dari tembus pandang ke pekat sementara cincin
 * di kakinya menyusut dari lingkaran lebar — cukup untuk menandai bahwa ada
 * yang baru tiba di titik itu, tanpa membuatnya terlihat seperti muncul
 * tiba-tiba dari udara kosong.
 */
const SPAWN_FADE_SECONDS = 0.35;
const SPAWN_RING_SCALE = 1.8;

/**
 * Penanda satu petarung di arena: badan kapsul low-poly, kepala, laras senjata
 * sebagai petunjuk arah hadap, plus papan nama + bar nyawa yang selalu
 * menghadap kamera. Petarung yang sedang mati dirender tembus pandang.
 */
export function FighterMarker({ fighter }: { fighter: Fighter }) {
  const round = useMatchStore((state) => state.round);
  const tag = respawnTag(respawnOutlook(fighter, round));
  const healthRatio = Math.max(
    0,
    Math.min(1, fighter.health / fighter.maxHealth),
  );

  const group = useRef<Group>(null);
  const lurch = useRef<Group>(null);
  const weaponHolder = useRef<Group>(null);
  const weaponPitch = useRef<Group>(null);
  const bodyMaterial = useRef<MeshStandardMaterial>(null);
  const headMaterial = useRef<MeshStandardMaterial>(null);
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  const nametag = useRef<HTMLDivElement>(null);
  /** Lama sudah tumbang, dalam detik arena; nol selama hidup. */
  const deathSeconds = useRef(0);
  /** Lama sejak muncul kembali, dalam detik arena; sudah "lama" saat pertama tampil. */
  const spawnSeconds = useRef(SPAWN_FADE_SECONDS);
  const wasAlive = useRef(fighter.isAlive);
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

    // Roboh dan lenyap. Jamnya hanya berdetak selama arena berjalan — jeda
    // membekukan mayat sebagaimana ia membekukan segala hal lain — dan
    // kembali nol saat petarung hidup lagi, sehingga ia berdiri tegak dan
    // pekat di titik spawn barunya.
    const arenaRunning =
      usePlayerStore.getState().isLocked &&
      useMatchStore.getState().round.status === "live";
    if (fighter.isAlive && !wasAlive.current) {
      // Baru muncul kembali: mulai mewujud dari nol.
      spawnSeconds.current = 0;
    }
    wasAlive.current = fighter.isAlive;
    if (fighter.isAlive) {
      deathSeconds.current = 0;
      if (arenaRunning) spawnSeconds.current += delta;
    } else if (arenaRunning) {
      deathSeconds.current += delta;
    }
    const dying = !fighter.isAlive;
    const fallen = Math.min(1, deathSeconds.current / COLLAPSE_SECONDS);
    const spawning = Math.min(1, spawnSeconds.current / SPAWN_FADE_SECONDS);
    const fade = dying
      ? Math.max(
          0,
          Math.min(
            1,
            1 -
              (deathSeconds.current - COLLAPSE_SECONDS - CORPSE_HOLD_SECONDS) /
                CORPSE_FADE_SECONDS,
          ),
        )
      : spawning;
    // Tembus pandang hanya selama benar-benar memudar; material pekat lebih
    // murah dan tidak ikut antrean pengurutan objek tembus pandang.
    for (const material of [bodyMaterial.current, headMaterial.current]) {
      if (!material) continue;
      material.transparent = fade < 1;
      material.opacity = fade;
    }
    if (ringMaterial.current) {
      ringMaterial.current.opacity =
        (dying ? RING_OPACITY_DEAD : RING_OPACITY) * fade;
    }
    if (ring.current) {
      const s = dying ? 1 : 1 + (SPAWN_RING_SCALE - 1) * (1 - spawning);
      ring.current.scale.set(s, s, 1);
    }
    if (nametag.current) nametag.current.style.opacity = String(fade);
    if (lurch.current) lurch.current.visible = fade > 0;
    // Senjata tidak ikut memudar (materialnya milik bersama semua penanda),
    // jadi ia lenyap begitu badannya mulai memudar.
    if (weaponHolder.current) weaponHolder.current.visible = fade >= 1;

    // Terhuyung: badan, kepala, dan senjata mencondong bersama ke arah
    // larinya peluru lalu pulih. Arah dorongannya ada di ruang dunia dan
    // pembungkus ini sudah diputar sebesar yaw, jadi arahnya diputar balik ke
    // kerangka badan dulu; condong ke +Z lokal berarti memutar sumbu X, ke +X
    // lokal berarti memutar sumbu Z ke arah negatif. Roboh memakai poros dan
    // kerangka yang sama: rebah adalah condong yang diteruskan sampai rata.
    if (lurch.current && dying) {
      const yaw = group.current?.rotation.y ?? 0;
      const stagger = bot?.stagger ?? null;
      let lx = 0;
      let lz = -1;
      if (stagger) {
        lx = stagger.dirX * Math.cos(yaw) - stagger.dirZ * Math.sin(yaw);
        lz = stagger.dirX * Math.sin(yaw) + stagger.dirZ * Math.cos(yaw);
        const n = Math.hypot(lx, lz);
        if (n > 1e-6) {
          lx /= n;
          lz /= n;
        } else {
          lx = 0;
          lz = -1;
        }
      }
      const angle = (Math.PI / 2) * fallen * fallen;
      lurch.current.rotation.x = angle * lz;
      lurch.current.rotation.z = -angle * lx;
      lurch.current.position.y = CORPSE_LIFT * fallen * fallen;
    } else if (lurch.current) {
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
    if (weaponPitch.current && !dying) {
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
        <group
          ref={weaponHolder}
          position={[0.44, 1.2, 0.18]}
          rotation={[0, Math.PI, 0]}
        >
          <group ref={weaponPitch} rotation={[REST_PITCH, 0, 0]}>
            <group scale={0.9}>
              <WeaponMesh weapon={weapon} />
            </group>
          </group>
        </group>
      </group>

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.45, 0.6, 20]} />
        <meshBasicMaterial
          ref={ringMaterial}
          color={fighter.color}
          transparent
          opacity={RING_OPACITY}
        />
      </mesh>

      <Billboard position={[0, NAMETAG_HEIGHT, 0]}>
        <Html center pointerEvents="none" zIndexRange={[10, 0]}>
          <div
            ref={nametag}
            className="pointer-events-none flex w-24 flex-col items-center gap-1 select-none"
          >
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
            {tag ? (
              <span className="rounded bg-black/70 px-1 text-[10px] text-amber-300">
                {tag}
              </span>
            ) : null}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}
