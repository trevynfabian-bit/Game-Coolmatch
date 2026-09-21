"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group, type Mesh, type PointLight } from "three";
import {
  currentEffectCursor,
  pruneCombatEffects,
  readCombatEffects,
} from "@/lib/game/combat-effects";

const TRACER_POOL = 18;
const IMPACT_POOL = 18;
const TRACER_LIFETIME = 0.07;
const IMPACT_LIFETIME = 0.38;
const MUZZLE_LIFETIME = 0.055;

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
  const camera = useThree((state) => state.camera);

  const tracerRefs = useRef<(Mesh | null)[]>([]);
  const impactRefs = useRef<(Mesh | null)[]>([]);
  const muzzleRigRef = useRef<Group>(null);
  const muzzleMeshRef = useRef<Mesh>(null);
  const muzzleLightRef = useRef<PointLight>(null);

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
  const muzzleUntil = useRef(0);
  const nextTracer = useRef(0);
  const nextImpact = useRef(0);
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
          // Kilatan moncong pemain menempel pada kamera; moncong musuh di
          // dunia belum digambar komponen ini.
          if (event.at3 === null) muzzleUntil.current = now + MUZZLE_LIFETIME;
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

    // Kilatan moncong menempel pada kamera, sejajar dengan viewmodel senjata.
    const rig = muzzleRigRef.current;
    if (rig) {
      rig.position.copy(camera.position);
      rig.quaternion.copy(camera.quaternion);
    }
    const lit = now < muzzleUntil.current;
    if (muzzleMeshRef.current) muzzleMeshRef.current.visible = lit;
    if (muzzleLightRef.current) muzzleLightRef.current.intensity = lit ? 14 : 0;
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

      <group ref={muzzleRigRef}>
        <mesh
          ref={muzzleMeshRef}
          position={[0.36, -0.24, -1.65]}
          visible={false}
        >
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshBasicMaterial color="#fff2c4" transparent opacity={0.95} />
        </mesh>
        <pointLight
          ref={muzzleLightRef}
          position={[0.36, -0.24, -1.65]}
          intensity={0}
          distance={9}
          decay={2}
          color="#ffd9a0"
        />
      </group>
    </group>
  );
}
