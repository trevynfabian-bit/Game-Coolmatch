"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Mesh, type PointLight } from "three";
import {
  currentEffectCursor,
  pruneCombatEffects,
  readCombatEffects,
} from "@/lib/game/combat-effects";
import {
  ENEMY_FLASH_SCALE,
  MUZZLE_FLASH,
  enemyFlashSeconds,
  flashFor,
} from "@/lib/game/muzzle-flash";

const TRACER_POOL = 18;
const IMPACT_POOL = 18;
const TRACER_LIFETIME = 0.07;
const IMPACT_LIFETIME = 0.38;
/**
 * Kolam kilatan moncong MUSUH di dunia. Beberapa musuh bisa menembak dalam
 * frame yang sama, jadi satu objek saja akan membuat kilatan mereka saling
 * menimpa dan hanya satu arah yang terlihat.
 */
const ENEMY_MUZZLE_POOL = 6;
/**
 * Jari-jari bola kilatan musuh sebelum diskalakan per senjata. Bolanya
 * digambar sekali sebesar ini, lalu tiap kilatan menyesuaikan skalanya —
 * dengan begitu lima watak senjata memakai satu geometri yang sama.
 */
const ENEMY_MUZZLE_RADIUS = MUZZLE_FLASH.rifle.radius * ENEMY_FLASH_SCALE;

interface Slot {
  expiresAt: number;
  /** Diisi impact: apakah mengenai petarung, bukan geometri peta. */
  onFighter: boolean;
}

/**
 * Efek visual tembakan: garis tracer, percikan di titik jatuh, dan kilatan
 * moncong. Semuanya memakai kolam objek tetap yang dihidup-matikan di dalam
 * useFrame, jadi menembak beruntun tidak pernah memicu render ulang React.
 *
 * Apa yang digambar datang dari antrean efek kombat, bukan dari ref yang
 * dipegang sistem senjata. Komponen ini karena itu tidak tahu — dan tidak
 * perlu tahu — siapa yang menembak: pemain, musuh, atau sistem lain yang
 * belum ada. Ia hanya menggambar apa yang masuk antrean.
 */
export function ShotEffects() {
  const tracerRefs = useRef<(Mesh | null)[]>([]);
  const impactRefs = useRef<(Mesh | null)[]>([]);
  const enemyMuzzleRefs = useRef<(Mesh | null)[]>([]);
  const enemyLightRefs = useRef<(PointLight | null)[]>([]);

  const tracerSlots = useRef<Slot[]>(
    Array.from({ length: TRACER_POOL }, () => ({
      expiresAt: 0,
      onFighter: false,
    })),
  );
  const impactSlots = useRef<Slot[]>(
    Array.from({ length: IMPACT_POOL }, () => ({
      expiresAt: 0,
      onFighter: false,
    })),
  );
  const enemyMuzzleSlots = useRef<number[]>(
    Array.from({ length: ENEMY_MUZZLE_POOL }, () => 0),
  );
  const nextTracer = useRef(0);
  const nextImpact = useRef(0);
  const nextEnemyMuzzle = useRef(0);
  /**
   * Batas baca antrean efek. Dimulai dari kejadian TERAKHIR yang sudah ada,
   * bukan dari nol: efek yang terjadi sebelum arena terpasang — misalnya di
   * pertandingan sebelumnya — tidak perlu digambar susulan sekaligus.
   */
  const cursor = useRef(currentEffectCursor());

  const from = useMemo(() => new Vector3(), []);
  const to = useMemo(() => new Vector3(), []);
  const mid = useMemo(() => new Vector3(), []);

  const spawnTracer = (a: readonly number[], b: readonly number[]) => {
    const index = nextTracer.current % TRACER_POOL;
    nextTracer.current += 1;
    const mesh = tracerRefs.current[index];
    if (!mesh) return;

    from.set(a[0], a[1], a[2]);
    to.set(b[0], b[1], b[2]);
    const length = from.distanceTo(to);
    if (length < 0.05) return;

    mid.addVectors(from, to).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.lookAt(to);
    mesh.scale.set(1, 1, length);
    mesh.visible = true;
    tracerSlots.current[index].expiresAt =
      performance.now() / 1000 + TRACER_LIFETIME;
  };

  const spawnEnemyMuzzle = (
    point: readonly number[],
    weapon: Parameters<typeof flashFor>[0],
  ) => {
    const index = nextEnemyMuzzle.current % ENEMY_MUZZLE_POOL;
    nextEnemyMuzzle.current += 1;
    const mesh = enemyMuzzleRefs.current[index];
    if (!mesh) return;

    // Watak senjatanya menentukan besar dan terangnya: kilatan sniper harus
    // menjadi petunjuk yang jauh lebih mudah dibaca daripada kilatan SMG.
    const voice = flashFor(weapon);
    mesh.position.set(point[0], point[1], point[2]);
    mesh.scale.setScalar(voice.radius / MUZZLE_FLASH.rifle.radius);
    mesh.visible = true;
    const light = enemyLightRefs.current[index];
    if (light) {
      light.position.set(point[0], point[1], point[2]);
      light.intensity = voice.intensity * ENEMY_FLASH_SCALE;
    }
    enemyMuzzleSlots.current[index] =
      performance.now() / 1000 + enemyFlashSeconds(weapon);
  };

  const spawnImpact = (point: readonly number[], onFighter: boolean) => {
    const index = nextImpact.current % IMPACT_POOL;
    nextImpact.current += 1;
    const mesh = impactRefs.current[index];
    if (!mesh) return;

    mesh.position.set(point[0], point[1], point[2]);
    mesh.scale.setScalar(1);
    mesh.visible = true;
    const slot = impactSlots.current[index];
    slot.expiresAt = performance.now() / 1000 + IMPACT_LIFETIME;
    slot.onFighter = onFighter;
  };

  useFrame(() => {
    const now = performance.now() / 1000;

    // Kejadian baru sejak frame lalu diubah jadi objek yang terlihat.
    const bacaan = readCombatEffects(cursor.current);
    cursor.current = bacaan.cursor;
    for (const event of bacaan.events) {
      switch (event.kind) {
        case "tracer":
          spawnTracer(event.from, event.to);
          break;
        case "percikan":
          spawnImpact(event.at3, event.onFighter);
          break;
        case "moncong":
          /*
            Hanya kilatan yang punya posisi DUNIA yang digambar di sini —
            itulah kilatan musuh. Kilatan pemain menempel pada ujung laras
            viewmodel dan digambar komponen senjata itu sendiri, supaya ikut
            bergerak bersama ayunannya.
          */
          if (event.at3 !== null) spawnEnemyMuzzle(event.at3, event.weapon);
          break;
        default:
          break;
      }
    }
    // Kejadian yang sudah lewat masa gambarnya tidak perlu disimpan.
    if (bacaan.events.length > 0) pruneCombatEffects(1, now);

    for (let i = 0; i < TRACER_POOL; i++) {
      const mesh = tracerRefs.current[i];
      if (!mesh || !mesh.visible) continue;
      const slot = tracerSlots.current[i];
      if (now >= slot.expiresAt) {
        mesh.visible = false;
        continue;
      }
      const life = (slot.expiresAt - now) / TRACER_LIFETIME;
      mesh.scale.x = life;
      mesh.scale.y = life;
    }

    for (let i = 0; i < IMPACT_POOL; i++) {
      const mesh = impactRefs.current[i];
      if (!mesh || !mesh.visible) continue;
      const slot = impactSlots.current[i];
      if (now >= slot.expiresAt) {
        mesh.visible = false;
        continue;
      }
      const life = (slot.expiresAt - now) / IMPACT_LIFETIME;
      mesh.scale.setScalar(slot.onFighter ? life * 1.5 : life);
    }

    for (let i = 0; i < ENEMY_MUZZLE_POOL; i++) {
      const mesh = enemyMuzzleRefs.current[i];
      if (!mesh || !mesh.visible) continue;
      if (now < enemyMuzzleSlots.current[i]) continue;
      mesh.visible = false;
      const light = enemyLightRefs.current[i];
      if (light) light.intensity = 0;
    }
  });

  return (
    <group>
      {Array.from({ length: TRACER_POOL }, (_, i) => (
        <mesh
          key={`tracer-${i}`}
          ref={(node) => {
            tracerRefs.current[i] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[0.035, 0.035, 1]} />
          <meshBasicMaterial color="#ffe8a3" transparent opacity={0.85} />
        </mesh>
      ))}

      {Array.from({ length: IMPACT_POOL }, (_, i) => (
        <mesh
          key={`impact-${i}`}
          ref={(node) => {
            impactRefs.current[i] = node;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} />
        </mesh>
      ))}

      {Array.from({ length: ENEMY_MUZZLE_POOL }, (_, i) => (
        <group key={`moncong-musuh-${i}`}>
          <mesh
            ref={(node) => {
              enemyMuzzleRefs.current[i] = node;
            }}
            visible={false}
          >
            <sphereGeometry args={[ENEMY_MUZZLE_RADIUS, 8, 8]} />
            <meshBasicMaterial
              color={MUZZLE_FLASH.rifle.color}
              transparent
              opacity={0.95}
            />
          </mesh>
          <pointLight
            ref={(node) => {
              enemyLightRefs.current[i] = node;
            }}
            intensity={0}
            distance={MUZZLE_FLASH.rifle.distance}
            decay={2}
            color={MUZZLE_FLASH.rifle.color}
          />
        </group>
      ))}
    </group>
  );
}
