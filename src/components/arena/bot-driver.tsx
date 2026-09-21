"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  BOT_EYE_HEIGHT,
  PLAYER_CHEST_HEIGHT,
  alertBrain,
  stepBot,
} from "@/lib/game/bot-ai";
import {
  flinchFire,
  freshFireState,
  inFiringRange,
  stepFire,
} from "@/lib/game/bot-combat";
import {
  getBot,
  liveColliders,
  livePosition,
  syncBots,
} from "@/lib/game/bot-runtime";
import {
  playElimination,
  playShotAt,
  playTakenHit,
} from "@/lib/audio/audio-engine";
import { emitCombatEffect } from "@/lib/game/combat-effects";
import { buildColliders } from "@/lib/game/collision";
import { ENEMY_MUZZLE_FORWARD } from "@/lib/game/muzzle-flash";
import { PLAYER_BOUNDS } from "@/lib/game/controls";
import { difficultyProfile } from "@/lib/game/difficulty";
import { markFighterHit } from "@/lib/game/fighter-runtime";
import { incomingAngle, resolveIncomingShot } from "@/lib/game/incoming-fire";
import { reportHit, reportKill } from "@/lib/game/session-runtime";
import { raycastArena } from "@/lib/game/shooting";
import { findWeapon } from "@/lib/mock/weapons";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Difficulty, Vec3 } from "@/types/game";

/** Batas delta agar tab yang sempat tidak aktif tidak melontarkan musuh. */
const MAX_DELTA = 1 / 15;

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
    // Arah pandang pemain, dihitung sekali per frame: dipakai menempatkan
    // bunyi tembakan musuh di kiri atau kanan, dan busur arah kena.
    camera.getWorldDirection(forward.current);
    const facing = Math.atan2(forward.current.x, forward.current.z);
    // Pemain diikuti dari kamera, karena di situlah posisi hidupnya berada.
    const target: Vec3 = [
      camera.position.x,
      local.position[1] + PLAYER_CHEST_HEIGHT,
      camera.position.z,
    ];

    for (const fighter of match.fighters) {
      if (fighter.isLocal || !fighter.isAlive) continue;
      const state = getBot(fighter.id);
      if (!state) continue;

      // Pemain yang sudah tumbang tidak bisa dilihat siapa pun; musuh kembali
      // berkeliling sampai ia muncul lagi.
      const canSeeTarget = local.isAlive
        ? hasLineOfSight([state.x, state.y + BOT_EYE_HEIGHT, state.z], target)
        : false;

      // Kena tembak sejak frame lalu: musuh sadar dari mana peluru datang.
      let brain = state.brain;
      if (state.noticed) {
        brain = alertBrain(brain, state.noticed, profile);
        state.noticed = null;
      }

      const next = stepBot({
        position: { x: state.x, y: state.y, z: state.z },
        yaw: state.yaw,
        verticalVelocity: state.verticalVelocity,
        brain,
        stagger: state.stagger,
        target,
        canSeeTarget,
        profile,
        // Peta DITAMBAH petarung lain. Garis pandang di atas sengaja memakai
        // peta saja: badan musuh lain tidak boleh menyembunyikan pemain, dan
        // musuh yang berbaris di belakang temannya tetap harus tahu pemain
        // ada di depan.
        colliders: [
          ...colliders,
          ...liveColliders(match.fighters, fighter.id, PLAYER_BOUNDS),
        ],
        bounds: PLAYER_BOUNDS,
        arena: map.playableBounds,
        delta,
        // Titik spawn dipakai sebagai titik patroli: semuanya sudah dijamin
        // terbuka, terjangkau, dan tersebar ke seluruh arena oleh
        // pemeriksaan geometri peta.
        waypoints: map.spawnPoints,
        others: match.fighters
          .filter((f) => !f.isLocal && f.isAlive && f.id !== fighter.id)
          .map(livePosition),
      });

      state.x = next.position.x;
      state.y = next.position.y;
      state.z = next.position.z;
      state.yaw = next.yaw;
      state.verticalVelocity = next.verticalVelocity;
      state.brain = next.brain;
      state.engaged = next.engaged;
      state.stagger = next.stagger;

      // Membidik dan menembak. Memburu saja tidak cukup: garis pandang harus
      // terbuka SAAT INI JUGA, jadi berlindung tetap memutus tembakan
      // sepenuhnya walau musuh masih ingat di mana pemain terakhir terlihat —
      // dan jaraknya harus masuk jangkauan senjata yang dibawanya.
      const weapon = findWeapon(fighter.weaponId);
      const distance = Math.hypot(target[0] - state.x, target[2] - state.z);
      let fire = state.fire ?? freshFireState(weapon);
      // Terhuyung mengundur tembakan yang sudah dijadwalkan sampai ia pulih.
      if (next.stagger && next.stagger.remaining > 0) {
        fire = flinchFire(fire, now + next.stagger.remaining);
      }
      const pelatuk = stepFire(fire, {
        now,
        canFire:
          next.engaged &&
          canSeeTarget &&
          local.isAlive &&
          inFiringRange(weapon, distance),
        profile,
        weapon,
      });
      state.fire = pelatuk.state;
      if (!pelatuk.fire) continue;

      /*
        Letupan dibunyikan untuk SETIAP tarikan pelatuk musuh, bukan hanya
        yang kena. Tembakan yang meleset justru yang paling berguna
        didengar: itulah tanda ada yang menembak ke arahmu dari suatu tempat,
        dan watak bunyinya memberi tahu senjata apa yang dipegangnya sebelum
        pemain sempat melihat siapa pun.
      */
      playShotAt(weapon.type, {
        distance,
        angleRad: incomingAngle(
          facing,
          [camera.position.x, 0, camera.position.z],
          [state.x, 0, state.z],
        ),
      });

      /*
        Kilatan moncongnya ikut menyala di dunia, sedikit di depan dada ke
        arah hadapnya. Inilah satu-satunya petunjuk terlihat dari mana peluru
        datang: sebelum ini musuh menembak tanpa jejak visual sama sekali,
        dan pemain yang kena tembak dari kegelapan tidak punya cara menebak
        harus menoleh ke mana.
      */
      emitCombatEffect({
        kind: "moncong",
        owner: "musuh",
        weapon: weapon.type,
        at3: [
          state.x + Math.sin(state.yaw) * ENEMY_MUZZLE_FORWARD,
          state.y + BOT_EYE_HEIGHT - 0.15,
          state.z + Math.cos(state.yaw) * ENEMY_MUZZLE_FORWARD,
        ],
      });

      // Peluru dihitung dari keadaan penembak yang sungguhan: peluang kena
      // dari ketepatan profil, jarak, dan seberapa jauh moncongnya masih
      // melenceng; lalu lintasannya ditelusuri ke satu titik di badan pemain
      // melewati penghalang peta, sehingga bagian badan yang berlindung di
      // balik krat memang tidak bisa kena, dan kerusakannya meluruh dengan
      // jarak sesuai senjatanya.
      const peluru = resolveIncomingShot({
        shooter: {
          position: [state.x, state.y, state.z],
          eyeHeight: BOT_EYE_HEIGHT,
          weapon,
          profile,
          aimOffRadians: next.aimOffRadians,
        },
        target: [camera.position.x, local.position[1], camera.position.z],
        colliders,
      });
      /*
        Jejak pelurunya digambar untuk tembakan yang KENA maupun yang meleset.
        Justru yang meleset paling berguna: garis yang lewat di samping kepala
        adalah satu-satunya cara pemain tahu ia sedang ditembaki dari arah itu
        sebelum nyawanya berkurang. Yang meleset digeser sedikit dari titik
        bidik supaya benar-benar terlihat lewat, bukan berhenti di badan.
      */
      const meleset = peluru.hit ? 0 : 0.5 + Math.random() * 0.5;
      emitCombatEffect({
        kind: "tracer",
        owner: "musuh",
        weapon: weapon.type,
        from: [
          state.x + Math.sin(state.yaw) * ENEMY_MUZZLE_FORWARD,
          state.y + BOT_EYE_HEIGHT - 0.15,
          state.z + Math.cos(state.yaw) * ENEMY_MUZZLE_FORWARD,
        ],
        to: [
          peluru.aimPoint[0] + (Math.random() - 0.5) * 2 * meleset,
          peluru.aimPoint[1] + (Math.random() - 0.5) * 2 * meleset,
          peluru.aimPoint[2] + (Math.random() - 0.5) * 2 * meleset,
        ],
      });

      if (!peluru.hit) continue;

      const isHeadshot = peluru.isHeadshot;
      const report = match.damageFighter({
        attackerId: fighter.id,
        targetId: local.id,
        damage: peluru.damage,
        isHeadshot,
        weaponName: weapon.name,
      });
      if (!report) continue;

      reportHit({
        shooterName: fighter.name,
        targetName: local.name,
        damage: Math.max(1, Math.round(report.healthLost + report.armorLost)),
        isHeadshot,
      });
      if (report.isLethal) {
        // Nada yang JATUH: pemain sendiri yang tumbang, dan itu harus
        // terdengar berbeda dari lawan yang tumbang sedetik sebelumnya.
        playElimination("sendiri");
        reportKill({
          killerName: fighter.name,
          victimName: local.name,
          isHeadshot,
        });
      }
      /*
        Kena tembak akhirnya terdengar, bukan hanya terlihat. Kabut merah di
        tepi layar hanya tertangkap kalau pemain kebetulan tidak sedang
        menatap bidikannya; dentum ini selalu sampai, dan kerasnya
        memberitahu seberapa parah lukanya.
      */
      playTakenHit(
        (report.healthLost + report.armorLost) / local.maxHealth,
        report.armorLost > 0 && report.armorLost >= report.healthLost,
      );
      markFighterHit(local.id);

      // Sudut penyerang relatif arah pandang, supaya busur menunjuk ke arah
      // yang benar.
      useCombatStore.getState().pushIncomingHit({
        angleRad: incomingAngle(
          facing,
          [camera.position.x, 0, camera.position.z],
          [state.x, 0, state.z],
        ),
        severity: (report.healthLost + report.armorLost) / local.maxHealth,
        attackerId: fighter.id,
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
