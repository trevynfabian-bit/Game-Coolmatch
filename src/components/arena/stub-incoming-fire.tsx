"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { buildColliders } from "@/lib/game/collision";
import { resolveShotDamage } from "@/lib/game/damage";
import { markFighterHit } from "@/lib/game/fighter-runtime";
import { raycastArena } from "@/lib/game/shooting";
import { findWeapon } from "@/lib/mock/weapons";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Fighter, Vec3 } from "@/types/game";

/**
 * SEMENTARA — sumber tembakan musuh tiruan.
 *
 * Musuh otomatis baru dibangun pada fase berikutnya, padahal HUD nyawa pemain
 * perlu bisa dicoba sekarang. Komponen ini menirukan tembakan masuk: memilih
 * bot hidup yang benar-benar punya garis pandang ke pemain, lalu menerapkan
 * kerusakan lewat jalur yang sama persis dengan yang nanti dipakai AI
 * (`useMatchStore.damageFighter`).
 *
 * Saat AI musuh mendarat, hapus komponen ini dan panggil jalur yang sama dari
 * sana — HUD, vignette, dan penunjuk arah tidak perlu diubah sama sekali.
 */

/**
 * Rentang jeda antar tembakan musuh tiruan, dalam detik. Sengaja longgar:
 * respawn baru dibangun di task berikutnya, jadi pemain perlu bertahan cukup
 * lama untuk sempat mencoba arena sebelum tumbang.
 */
const MIN_GAP = 4.5;
const MAX_GAP = 9;
/** Tinggi mata bot, dipakai sebagai titik asal tembakan tiruan. */
const BOT_EYE = 1.55;
/** Tinggi dada pemain, sasaran tembakan tiruan. */
const PLAYER_CHEST = 1.15;
/** Peluang tembakan mengenai kepala. */
const HEADSHOT_CHANCE = 0.12;

function randomGap() {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
}

/** Sudut terpendek antara dua arah, dinormalkan ke rentang -PI..PI. */
function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(from - to), Math.cos(from - to));
}

export function StubIncomingFire({ map }: { map: ArenaMapInfo }) {
  const camera = useThree((state) => state.camera);
  const colliders = useMemo(() => buildColliders(map), [map]);
  // Nol berarti belum dijadwalkan; jadwal pertama dibuat di frame pertama
  // supaya tidak ada pemanggilan fungsi tak murni saat render.
  const nextShotAt = useRef(0);
  const forward = useRef(new Vector3());

  useFrame(() => {
    const now = performance.now() / 1000;
    if (nextShotAt.current === 0) {
      nextShotAt.current = now + randomGap();
      return;
    }
    if (now < nextShotAt.current) return;
    nextShotAt.current = now + randomGap();

    // Hanya menembak saat pemain benar-benar bermain.
    if (!usePlayerStore.getState().isLocked) return;

    const match = useMatchStore.getState();
    if (match.round.status !== "live") return;

    const local = match.fighters.find((fighter) => fighter.isLocal);
    if (!local || !local.isAlive) return;

    const target: Vec3 = [
      camera.position.x,
      local.position[1] + PLAYER_CHEST,
      camera.position.z,
    ];

    const seesPlayer = (shooter: Fighter) => {
      const origin: Vec3 = [
        shooter.position[0],
        shooter.position[1] + BOT_EYE,
        shooter.position[2],
      ];
      const dx = target[0] - origin[0];
      const dy = target[1] - origin[1];
      const dz = target[2] - origin[2];
      const length = Math.hypot(dx, dy, dz);
      if (length < 0.001) return false;

      const direction: Vec3 = [dx / length, dy / length, dz / length];
      const blocker = raycastArena(origin, direction, colliders, []);
      return blocker === null || blocker.distance >= length;
    };

    const shooters = match.fighters.filter(
      (fighter) => !fighter.isLocal && fighter.isAlive && seesPlayer(fighter),
    );
    if (shooters.length === 0) return;

    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    const weapon = findWeapon(shooter.weaponId);
    const isHeadshot = Math.random() < HEADSHOT_CHANCE;

    const report = match.damageFighter({
      attackerId: shooter.id,
      targetId: local.id,
      damage: resolveShotDamage(weapon.damage, isHeadshot),
      isHeadshot,
      weaponName: weapon.name,
    });
    if (!report) return;

    markFighterHit(local.id);

    // Sudut penyerang relatif arah pandang, supaya busur menunjuk ke arah benar.
    camera.getWorldDirection(forward.current);
    const facing = Math.atan2(forward.current.x, forward.current.z);
    const toShooter = Math.atan2(
      shooter.position[0] - camera.position.x,
      shooter.position[2] - camera.position.z,
    );

    useCombatStore.getState().pushIncomingHit({
      angleRad: shortestAngle(facing, toShooter),
      severity: (report.healthLost + report.armorLost) / local.maxHealth,
      attackerName: shooter.name,
    });
  });

  return null;
}
