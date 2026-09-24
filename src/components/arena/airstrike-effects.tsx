"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight } from "three";
import { playExplosion, playJetFlyby } from "@/lib/audio/sfx";
import { getBot } from "@/lib/game/bot-runtime";
import { markFighterHit } from "@/lib/game/fighter-runtime";
import { AIRSTRIKE } from "@/lib/game/killstreak";
import { playerRuntime } from "@/lib/game/player-runtime";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";

/** Jeda antar ledakan dalam satu serangan, detik. */
const BOMB_INTERVAL = 0.32;
/** Lama bom jatuh dari langit sampai menghantam, detik. */
const FALL_SECONDS = 0.45;
/** Lama bola api dan asap bertahan, detik. */
const BLAST_SECONDS = 1.1;
const DROP_HEIGHT = 32;

interface Bomb {
  x: number;
  z: number;
  /** Waktu hantaman, milidetik performance.now. */
  impactAt: number;
  exploded: boolean;
}

/** Acak berbibit supaya sebaran bom sama untuk sasaran yang sama. */
function seededRandom(seed: number) {
  let state = Math.floor(seed) >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function planBombs(strike: { x: number; z: number; launchedAt: number }): Bomb[] {
  const random = seededRandom(strike.launchedAt * 1000 + strike.x * 31 + strike.z * 17);
  const first = strike.launchedAt + AIRSTRIKE.delaySeconds * 1000;
  return Array.from({ length: AIRSTRIKE.bombs }, (_, index) => {
    // Bom pertama tepat di sasaran, sisanya menyebar merata di dalam lingkaran.
    const radius = index === 0 ? 0 : Math.sqrt(random()) * AIRSTRIKE.radius;
    const angle = random() * Math.PI * 2;
    return {
      x: strike.x + Math.cos(angle) * radius,
      z: strike.z + Math.sin(angle) * radius,
      impactAt: first + index * BOMB_INTERVAL * 1000,
      exploded: false,
    };
  });
}

/**
 * Menerapkan satu ledakan: kerusakan menurun menurut jarak dari pusat ke
 * semua musuh yang hidup di dalam jari-jari ledakan. Pemain sendiri tidak
 * terkena — serangan udara milik pemain tidak melukai pemanggilnya.
 */
function detonate(bomb: Bomb) {
  const match = useMatchStore.getState();
  const local = match.fighters.find((fighter) => fighter.isLocal);
  if (!local) return;

  for (const fighter of match.fighters) {
    if (fighter.isLocal || !fighter.isAlive) continue;
    const bot = getBot(fighter.id);
    if (!bot) continue;
    const distance = Math.hypot(bot.x - bomb.x, bot.z - bomb.z);
    if (distance > AIRSTRIKE.blastRadius) continue;
    const falloff = 1 - distance / AIRSTRIKE.blastRadius;
    const damage = Math.round(AIRSTRIKE.damage * (0.35 + 0.65 * falloff));
    const report = useMatchStore.getState().damageFighter({
      attackerId: local.id,
      targetId: fighter.id,
      damage,
      isHeadshot: false,
      weaponName: "Serangan Udara",
    });
    if (report) markFighterHit(fighter.id);
  }

  const [px, , pz] = playerRuntime.position;
  const heard = Math.hypot(px - bomb.x, pz - bomb.z);
  playExplosion(Math.max(0.15, 1 - heard / 45));
}

/**
 * Efek serangan udara di dalam kanvas: garis bom yang jatuh dari langit,
 * bola api yang mengembang, cahaya kilat, dan asap yang naik lalu memudar.
 * Semua mesh berasal dari kolam tetap seukuran jumlah bom dan digerakkan di
 * useFrame, jadi tidak ada render ulang React per frame.
 */
export function AirstrikeEffects() {
  const strike = useKillstreakStore((state) => state.strike);
  const bombs = useMemo(() => (strike ? planBombs(strike) : []), [strike]);
  const bombsRef = useRef<Bomb[]>([]);

  const streakRefs = useRef<(Mesh | null)[]>([]);
  const fireRefs = useRef<(Mesh | null)[]>([]);
  const smokeRefs = useRef<(Mesh | null)[]>([]);
  const scorchRefs = useRef<(Mesh | null)[]>([]);
  const lightRef = useRef<PointLight>(null);

  useEffect(() => {
    bombsRef.current = bombs.map((bomb) => ({ ...bomb }));
    if (bombs.length > 0) playJetFlyby();
  }, [bombs]);

  useFrame(() => {
    const now = performance.now();
    let flash = 0;
    let flashX = 0;
    let flashZ = 0;

    bombsRef.current.forEach((bomb, index) => {
      const streak = streakRefs.current[index];
      const fire = fireRefs.current[index];
      const smoke = smokeRefs.current[index];
      const scorch = scorchRefs.current[index];
      if (!streak || !fire || !smoke || !scorch) return;

      const untilImpact = (bomb.impactAt - now) / 1000;
      const sinceImpact = -untilImpact;

      // Bom jatuh: garis terang meluncur turun ke titik hantam.
      if (untilImpact > 0 && untilImpact <= FALL_SECONDS) {
        const t = 1 - untilImpact / FALL_SECONDS;
        streak.visible = true;
        streak.position.set(bomb.x, DROP_HEIGHT * (1 - t) + 1.5, bomb.z);
      } else {
        streak.visible = false;
      }

      if (sinceImpact >= 0 && !bomb.exploded) {
        bomb.exploded = true;
        detonate(bomb);
      }

      if (sinceImpact >= 0 && sinceImpact <= BLAST_SECONDS) {
        const t = sinceImpact / BLAST_SECONDS;
        fire.visible = true;
        fire.position.set(bomb.x, 0.6 + t * 1.2, bomb.z);
        fire.scale.setScalar(AIRSTRIKE.blastRadius * Math.min(1, t * 4) * (1 - t * 0.3));
        (fire.material as MeshBasicMaterial).opacity = Math.max(0, 1 - t * 1.4);

        smoke.visible = true;
        smoke.position.set(bomb.x, 1 + t * 5, bomb.z);
        smoke.scale.setScalar(1 + t * AIRSTRIKE.blastRadius);
        (smoke.material as MeshStandardMaterial).opacity = 0.55 * (1 - t);

        if (t < 0.25 && 1 - t * 4 > flash) {
          flash = 1 - t * 4;
          flashX = bomb.x;
          flashZ = bomb.z;
        }
      } else {
        fire.visible = false;
        smoke.visible = false;
      }

      // Bekas hangus tertinggal beberapa detik setelah ledakan.
      const scorchLife = 6;
      if (sinceImpact >= 0 && sinceImpact <= scorchLife) {
        scorch.visible = true;
        scorch.position.set(bomb.x, 0.02, bomb.z);
        (scorch.material as MeshBasicMaterial).opacity = 0.6 * (1 - sinceImpact / scorchLife);
      } else {
        scorch.visible = false;
      }
    });

    const light = lightRef.current;
    if (light) {
      light.intensity = flash * 60;
      light.position.set(flashX, 3, flashZ);
    }
  });

  return (
    <group>
      <pointLight ref={lightRef} color="#ffa94d" intensity={0} distance={26} decay={1.6} />
      {Array.from({ length: AIRSTRIKE.bombs }, (_, index) => (
        <group key={index}>
          <mesh ref={(mesh) => { streakRefs.current[index] = mesh; }} visible={false}>
            <cylinderGeometry args={[0.08, 0.08, 3, 6]} />
            <meshBasicMaterial color="#fde68a" />
          </mesh>
          <mesh ref={(mesh) => { fireRefs.current[index] = mesh; }} visible={false}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color="#fb923c" transparent depthWrite={false} />
          </mesh>
          <mesh ref={(mesh) => { smokeRefs.current[index] = mesh; }} visible={false}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#3f3f46" transparent depthWrite={false} roughness={1} />
          </mesh>
          <mesh ref={(mesh) => { scorchRefs.current[index] = mesh; }} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
            <circleGeometry args={[AIRSTRIKE.blastRadius * 0.8, 20]} />
            <meshBasicMaterial color="#0c0a09" transparent depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
