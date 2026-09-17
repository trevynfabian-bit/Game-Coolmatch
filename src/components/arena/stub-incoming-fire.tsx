"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { livePosition } from "@/lib/game/bot-runtime";
import { buildColliders } from "@/lib/game/collision";
import { difficultyProfile } from "@/lib/game/difficulty";
import { resolveShotDamage } from "@/lib/game/damage";
import { markFighterHit } from "@/lib/game/fighter-runtime";
import { raycastArena } from "@/lib/game/shooting";
import { findWeapon } from "@/lib/mock/weapons";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Difficulty, Fighter, Vec3 } from "@/types/game";

/**
 * SEMENTARA — sumber tembakan musuh tiruan.
 *
 * Musuh otomatis baru dibangun pada fase berikutnya, padahal HUD nyawa pemain
 * perlu bisa dicoba sekarang. Komponen ini menirukan tembakan masuk: memilih
 * bot hidup yang punya garis pandang ke pemain, lalu menerapkan kerusakan lewat
 * jalur yang sama persis dengan yang nanti dipakai AI
 * (`useMatchStore.damageFighter`).
 *
 * Laju dan ketepatannya mengikuti profil tingkat kesulitan yang dipilih pemain,
 * jadi Santai dan Susah benar-benar terasa berbeda di arena.
 *
 * Saat AI musuh mendarat, hapus komponen ini dan panggil jalur yang sama dari
 * sana — HUD, vignette, dan penunjuk arah tidak perlu diubah sama sekali.
 */

/**
 * Pengali jeda tembak terhadap angka pada profil kesulitan.
 *
 * Angka di profil itu berlaku PER BOT dengan AI penuh: bot yang bergerak,
 * mencari perlindungan, dan kadang kehilangan pemain dari pandangan. Di sini
 * hanya ada satu jam global yang selalu memilih bot dengan garis pandang
 * terbaik, jadi memakai angkanya apa adanya akan menumbangkan pemain dalam
 * hitungan detik. Pengali ini menahan laju itu sampai AI sungguhan mendarat —
 * saat itu pengali ini ikut hilang bersama komponennya.
 */
const STUB_FIRE_MULTIPLIER = 3;
/** Tinggi mata bot, dipakai sebagai titik asal tembakan tiruan. */
const BOT_EYE = 1.55;
/** Tinggi dada pemain, sasaran tembakan tiruan. */
const PLAYER_CHEST = 1.15;
/** Bagian dari tembakan yang kena dan mengarah ke kepala. */
const HEADSHOT_SHARE = 0.18;

/** Jeda menuju tembakan musuh berikutnya, mengikuti tingkat kesulitan. */
function nextGap(difficulty: Difficulty): number {
  const [min, max] = difficultyProfile(difficulty).fireIntervalSeconds;
  return (min + Math.random() * (max - min)) * STUB_FIRE_MULTIPLIER;
}

/** Sudut terpendek antara dua arah, dinormalkan ke rentang -PI..PI. */
function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(from - to), Math.cos(from - to));
}

export function StubIncomingFire({
  map,
  difficulty,
}: {
  map: ArenaMapInfo;
  difficulty: Difficulty;
}) {
  const camera = useThree((state) => state.camera);
  const colliders = useMemo(() => buildColliders(map), [map]);
  // Nol berarti belum dijadwalkan; jadwal pertama dibuat di frame pertama
  // supaya tidak ada pemanggilan fungsi tak murni saat render.
  const nextShotAt = useRef(0);
  const forward = useRef(new Vector3());

  useFrame(() => {
    const now = performance.now() / 1000;
    if (nextShotAt.current === 0) {
      nextShotAt.current = now + nextGap(difficulty);
      return;
    }
    if (now < nextShotAt.current) return;
    nextShotAt.current = now + nextGap(difficulty);

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
      // Musuh sudah berjalan sendiri, jadi titik tembaknya diambil dari posisi
      // hidupnya — bukan titik spawn yang tersimpan di store.
      const here = livePosition(shooter);
      const origin: Vec3 = [here[0], here[1] + BOT_EYE, here[2]];
      const dx = target[0] - origin[0];
      const dy = target[1] - origin[1];
      const dz = target[2] - origin[2];
      const length = Math.hypot(dx, dy, dz);
      if (length < 0.001) return false;

      const direction: Vec3 = [dx / length, dy / length, dz / length];
      const blocker = raycastArena(origin, direction, colliders, []);
      return blocker === null || blocker.distance >= length;
    };

    const alive = match.fighters.filter(
      (fighter) => !fighter.isLocal && fighter.isAlive,
    );
    if (alive.length === 0) return;

    // Hanya yang punya garis pandang yang boleh menembak. Musuh kini berjalan
    // sendiri dan mendatangi pemain, jadi garis pandang itu terbuka karena
    // mereka benar-benar bergerak ke sana — berlindung pun kembali berarti
    // sepenuhnya: selama tidak ada yang melihat, tidak ada yang menembak.
    const shooters = alive.filter(seesPlayer);
    if (shooters.length === 0) return;

    const shooter = shooters[Math.floor(Math.random() * shooters.length)];

    // Tidak setiap tembakan kena. Inilah yang paling terasa membedakan tingkat
    // kesulitan: pada Santai sebagian besar peluru meleset.
    const profile = difficultyProfile(difficulty);
    if (Math.random() > profile.accuracy) return;

    const weapon = findWeapon(shooter.weaponId);
    const isHeadshot = Math.random() < HEADSHOT_SHARE;

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
    const shooterAt = livePosition(shooter);
    const toShooter = Math.atan2(
      shooterAt[0] - camera.position.x,
      shooterAt[2] - camera.position.z,
    );

    useCombatStore.getState().pushIncomingHit({
      angleRad: shortestAngle(facing, toShooter),
      severity: (report.healthLost + report.armorLost) / local.maxHealth,
      attackerName: shooter.name,
    });
  });

  return null;
}
