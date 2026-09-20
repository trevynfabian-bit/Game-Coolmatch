"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { stepBot } from "@/lib/game/bot-ai";
import {
  HEADSHOT_SHARE,
  aimFactor,
  hitChance,
  nextFireDelay,
} from "@/lib/game/bot-combat";
import { getBot, syncBots } from "@/lib/game/bot-runtime";
import { buildColliders } from "@/lib/game/collision";
import { PLAYER_BOUNDS } from "@/lib/game/controls";
import { resolveShotDamage } from "@/lib/game/damage";
import { difficultyProfile } from "@/lib/game/difficulty";
import { markFighterHit } from "@/lib/game/fighter-runtime";
import { raycastArena } from "@/lib/game/shooting";
import { findWeapon } from "@/lib/mock/weapons";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Difficulty, Vec3 } from "@/types/game";

/** Sudut terpendek antara dua arah, dinormalkan ke rentang -PI..PI. */
function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(from - to), Math.cos(from - to));
}

/** Batas delta agar tab yang sempat tidak aktif tidak melontarkan musuh. */
const MAX_DELTA = 1 / 15;

/** Tinggi mata musuh, dipakai sebagai titik asal pemeriksaan garis pandang. */
const BOT_EYE = 1.55;
/** Tinggi dada pemain, sasaran pemeriksaan garis pandang. */
const PLAYER_CHEST = 1.15;

/**
 * Menjalankan semua musuh otomatis tiap frame: berjalan, membidik, menembak.
 *
 * Keputusan geraknya ada di `stepBot` dan aturan tembaknya di `bot-combat`;
 * komponen ini menyiapkan bahan — siapa yang hidup, di mana pemain, dan apakah
 * garis pandangnya terbuka — lalu menyimpan hasilnya ke runtime musuh. Tidak
 * ada state React yang disentuh per frame untuk gerak, jadi penanda petarung
 * tidak ikut dirender ulang; penanda itu membaca posisi terbaru sendiri di
 * dalam `useFrame` miliknya.
 *
 * Tiap musuh punya JAM TEMBAKNYA SENDIRI. Itu bedanya dengan sumber tembakan
 * tiruan yang digantikan komponen ini, yang hanya punya satu jam untuk seluruh
 * arena dan karena itu perlu meregangkan angka pada profil kesulitan.
 *
 * Musuh hanya hidup saat ronde berjalan dan pemain benar-benar bermain, sama
 * seperti bagian arena lain yang berdetak.
 */
export function BotDriver({
  map,
  difficulty,
}: {
  map: ArenaMapInfo;
  difficulty: Difficulty;
}) {
  const camera = useThree((state) => state.camera);
  const colliders = useMemo(() => buildColliders(map), [map]);
  const forward = useRef(new Vector3());

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA);
    const match = useMatchStore.getState();

    syncBots(match.fighters);

    if (match.round.status !== "live") return;
    if (!usePlayerStore.getState().isLocked) return;

    const local = match.fighters.find((fighter) => fighter.isLocal);
    if (!local) return;

    const profile = difficultyProfile(difficulty);
    const now = performance.now() / 1000;
    // Pemain diikuti dari kamera, karena di situlah posisi hidupnya berada.
    const target: Vec3 = [
      camera.position.x,
      local.position[1] + PLAYER_CHEST,
      camera.position.z,
    ];

    for (const fighter of match.fighters) {
      if (fighter.isLocal || !fighter.isAlive) continue;
      const state = getBot(fighter.id);
      if (!state) continue;

      // Pemain yang sudah tumbang tidak bisa dilihat siapa pun; musuh kembali
      // berkeliling sampai ia muncul lagi.
      const canSeeTarget = local.isAlive
        ? hasLineOfSight([state.x, state.y + BOT_EYE, state.z], target)
        : false;

      const next = stepBot({
        position: { x: state.x, y: state.y, z: state.z },
        yaw: state.yaw,
        verticalVelocity: state.verticalVelocity,
        brain: state.brain,
        target,
        canSeeTarget,
        profile,
        colliders,
        bounds: PLAYER_BOUNDS,
        arena: map.playableBounds,
        delta,
        // Titik spawn dipakai sebagai titik patroli: semuanya sudah dijamin
        // terbuka, terjangkau, dan tersebar ke seluruh arena oleh
        // pemeriksaan geometri peta.
        waypoints: map.spawnPoints,
      });

      state.x = next.position.x;
      state.y = next.position.y;
      state.z = next.position.z;
      state.yaw = next.yaw;
      state.verticalVelocity = next.verticalVelocity;
      state.brain = next.brain;
      state.engaged = next.engaged;

      // Membidik dan menembak. Memburu saja tidak cukup: garis pandang harus
      // terbuka SAAT INI JUGA, jadi berlindung tetap memutus tembakan
      // sepenuhnya walau musuh masih ingat di mana pemain terakhir terlihat.
      if (!next.engaged || !canSeeTarget || !local.isAlive) {
        state.nextShotAt = 0;
        continue;
      }
      const weapon = findWeapon(fighter.weaponId);
      if (state.nextShotAt === 0) {
        state.nextShotAt = now + nextFireDelay(profile, weapon.damage);
        continue;
      }
      if (now < state.nextShotAt) continue;
      state.nextShotAt = now + nextFireDelay(profile, weapon.damage);

      // Peluang kena dipotong dua kali: oleh jarak, dan oleh seberapa jauh
      // moncongnya masih melenceng. Musuh yang baru berbalik badan menembak ke
      // arah yang salah dulu sebelum bidikannya benar-benar tertuju.
      const distance = Math.hypot(target[0] - state.x, target[2] - state.z);
      const chance =
        hitChance(profile, distance) * aimFactor(next.aimOffRadians);
      if (Math.random() > chance) continue;

      const isHeadshot = Math.random() < HEADSHOT_SHARE;
      const report = match.damageFighter({
        attackerId: fighter.id,
        targetId: local.id,
        damage: resolveShotDamage(weapon.damage, isHeadshot),
        isHeadshot,
        weaponName: weapon.name,
      });
      if (!report) continue;

      markFighterHit(local.id);

      // Sudut penyerang relatif arah pandang, supaya busur menunjuk ke arah
      // yang benar.
      camera.getWorldDirection(forward.current);
      const facing = Math.atan2(forward.current.x, forward.current.z);
      const toShooter = Math.atan2(
        state.x - camera.position.x,
        state.z - camera.position.z,
      );
      useCombatStore.getState().pushIncomingHit({
        angleRad: shortestAngle(facing, toShooter),
        severity: (report.healthLost + report.armorLost) / local.maxHealth,
        attackerName: fighter.name,
      });
    }

    function hasLineOfSight(origin: Vec3, to: Vec3): boolean {
      const dx = to[0] - origin[0];
      const dy = to[1] - origin[1];
      const dz = to[2] - origin[2];
      const length = Math.hypot(dx, dy, dz);
      if (length < 0.001) return true;

      const direction: Vec3 = [dx / length, dy / length, dz / length];
      const blocker = raycastArena(origin, direction, colliders, []);
      return blocker === null || blocker.distance >= length;
    }
  });

  return null;
}
