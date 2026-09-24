"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Mesh, type PointLight } from "three";
import { playGunBurst } from "@/lib/audio/sfx";
import { getBot } from "@/lib/game/bot-runtime";
import { buildColliders } from "@/lib/game/collision";
import { markFighterHit } from "@/lib/game/fighter-runtime";
import { helicopterRuntime } from "@/lib/game/helicopter-runtime";
import { HELICOPTER_GUN } from "@/lib/game/killstreak";
import { playerRuntime } from "@/lib/game/player-runtime";
import { raycastArena } from "@/lib/game/shooting";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import type { ArenaMapInfo, Vec3 } from "@/types/game";

const TRACER_POOL = 10;
const TRACER_LIFE = 0.08;
const PUFF_LIFE = 0.35;
/** Tinggi badan musuh yang dibidik, dari telapak kaki. */
const AIM_HEIGHT = 1.1;

/**
 * Senapan mesin helikopter dukungan.
 *
 * Tiap rentetan memilih musuh hidup terdekat yang terlihat dari helikopter
 * (atap dan tembok tetap melindungi), lalu menembakkan beberapa peluru
 * dengan peluang kena tetap. Peluru yang kena melukai lewat `damageFighter`
 * atas nama pemain, jadi kill helikopter masuk ke skor dan kill feed pemain.
 * Tracer, kilat moncong, dan kepulan debu memakai kolam mesh tetap.
 */
export function HelicopterGunner({ map }: { map: ArenaMapInfo }) {
  const colliders = useMemo(() => buildColliders(map), [map]);
  const tracerRefs = useRef<(Mesh | null)[]>([]);
  const puffRefs = useRef<(Mesh | null)[]>([]);
  const tracerUntil = useRef<number[]>(Array(TRACER_POOL).fill(0));
  const puffUntil = useRef<number[]>(Array(TRACER_POOL).fill(0));
  const nextSlot = useRef(0);
  const flashRef = useRef<PointLight>(null);
  const flashUntil = useRef(0);

  const gun = useRef({ targetId: null as string | null, shotsLeft: 0, nextShotAt: 0 });
  const from = useMemo(() => new Vector3(), []);
  const to = useMemo(() => new Vector3(), []);

  function visibleTarget(origin: Vec3): { id: string; point: Vec3 } | null {
    let best: { id: string; point: Vec3; distance: number } | null = null;
    for (const fighter of useMatchStore.getState().fighters) {
      if (fighter.isLocal || !fighter.isAlive) continue;
      const bot = getBot(fighter.id);
      if (!bot) continue;
      const distance = Math.hypot(bot.x - origin[0], bot.z - origin[2]);
      if (distance > HELICOPTER_GUN.range) continue;
      if (best && distance >= best.distance) continue;
      const point: Vec3 = [bot.x, bot.y + AIM_HEIGHT, bot.z];
      const dx = point[0] - origin[0];
      const dy = point[1] - origin[1];
      const dz = point[2] - origin[2];
      const length = Math.hypot(dx, dy, dz);
      const blocker = raycastArena(origin, [dx / length, dy / length, dz / length], colliders, []);
      if (blocker && blocker.distance < length) continue;
      best = { id: fighter.id, point, distance };
    }
    return best;
  }

  function spawnTracer(a: Vec3, b: Vec3, now: number) {
    const index = nextSlot.current % TRACER_POOL;
    nextSlot.current += 1;
    const tracer = tracerRefs.current[index];
    const puff = puffRefs.current[index];
    if (tracer) {
      from.set(...a);
      to.set(...b);
      tracer.position.addVectors(from, to).multiplyScalar(0.5);
      tracer.lookAt(to);
      tracer.scale.set(1, 1, from.distanceTo(to));
      tracer.visible = true;
      tracerUntil.current[index] = now + TRACER_LIFE;
    }
    if (puff) {
      puff.position.set(...b);
      puff.visible = true;
      puffUntil.current[index] = now + PUFF_LIFE;
    }
  }

  useFrame(() => {
    const now = performance.now() / 1000;

    for (let i = 0; i < TRACER_POOL; i++) {
      const tracer = tracerRefs.current[i];
      if (tracer && tracer.visible && now > tracerUntil.current[i]) tracer.visible = false;
      const puff = puffRefs.current[i];
      if (puff) {
        const left = puffUntil.current[i] - now;
        puff.visible = left > 0;
        if (left > 0) puff.scale.setScalar(0.25 + (1 - left / PUFF_LIFE) * 0.6);
      }
    }
    if (flashRef.current) flashRef.current.intensity = now < flashUntil.current ? 12 : 0;

    const match = useMatchStore.getState();
    if (!helicopterRuntime.active || match.round.status !== "live") {
      gun.current.shotsLeft = 0;
      return;
    }
    if (now < gun.current.nextShotAt) return;

    // Moncong di bawah hidung helikopter.
    const yaw = helicopterRuntime.yaw;
    const muzzle: Vec3 = [
      helicopterRuntime.x - Math.sin(yaw) * 2.2,
      helicopterRuntime.y - 0.8,
      helicopterRuntime.z - Math.cos(yaw) * 2.2,
    ];

    if (gun.current.shotsLeft <= 0) {
      const target = visibleTarget(muzzle);
      if (!target) {
        gun.current.nextShotAt = now + 0.25;
        return;
      }
      gun.current.targetId = target.id;
      gun.current.shotsLeft = HELICOPTER_GUN.burst;
    }

    const targetId = gun.current.targetId;
    const fighter = match.fighters.find((f) => f.id === targetId);
    const bot = targetId ? getBot(targetId) : undefined;
    if (!fighter || !fighter.isAlive || !bot) {
      gun.current.shotsLeft = 0;
      return;
    }

    const hit = Math.random() < HELICOPTER_GUN.hitChance;
    const scatter = hit ? 0.25 : 1.6;
    const impact: Vec3 = [
      bot.x + (Math.random() - 0.5) * scatter,
      hit ? bot.y + AIM_HEIGHT + (Math.random() - 0.5) * 0.4 : 0.05,
      bot.z + (Math.random() - 0.5) * scatter,
    ];
    spawnTracer(muzzle, impact, now);
    flashUntil.current = now + 0.04;
    if (flashRef.current) flashRef.current.position.set(...muzzle);

    const [px, , pz] = playerRuntime.position;
    playGunBurst(Math.max(0.05, 0.35 - Math.hypot(px - muzzle[0], pz - muzzle[2]) / 120));

    if (hit) {
      const local = match.fighters.find((f) => f.isLocal);
      const report = match.damageFighter({
        attackerId: local?.id ?? "",
        targetId: fighter.id,
        damage: HELICOPTER_GUN.damage,
        isHeadshot: false,
        weaponName: "Helikopter Dukungan",
      });
      if (report) markFighterHit(fighter.id);
      if (report?.isLethal) {
        gun.current.shotsLeft = 0;
        useKillstreakStore.getState().recordRewardKill("helikopter");
      }
    }

    gun.current.shotsLeft -= 1;
    gun.current.nextShotAt =
      now + (gun.current.shotsLeft > 0 ? HELICOPTER_GUN.shotInterval : HELICOPTER_GUN.burstCooldown);
  });

  return (
    <group>
      <pointLight ref={flashRef} color="#fde68a" intensity={0} distance={10} decay={2} />
      {Array.from({ length: TRACER_POOL }, (_, index) => (
        <group key={index}>
          <mesh ref={(mesh) => { tracerRefs.current[index] = mesh; }} visible={false}>
            <boxGeometry args={[0.04, 0.04, 1]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
          <mesh ref={(mesh) => { puffRefs.current[index] = mesh; }} visible={false}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#a8a29e" transparent opacity={0.5} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
