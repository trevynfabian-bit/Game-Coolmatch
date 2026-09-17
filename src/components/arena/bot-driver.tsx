"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { stepBot } from "@/lib/game/bot-ai";
import { getBot, syncBots } from "@/lib/game/bot-runtime";
import { buildColliders } from "@/lib/game/collision";
import { PLAYER_BOUNDS } from "@/lib/game/controls";
import { difficultyProfile } from "@/lib/game/difficulty";
import { raycastArena } from "@/lib/game/shooting";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Difficulty, Vec3 } from "@/types/game";

/** Batas delta agar tab yang sempat tidak aktif tidak melontarkan musuh. */
const MAX_DELTA = 1 / 15;

/** Tinggi mata musuh, dipakai sebagai titik asal pemeriksaan garis pandang. */
const BOT_EYE = 1.55;
/** Tinggi dada pemain, sasaran pemeriksaan garis pandang. */
const PLAYER_CHEST = 1.15;

/**
 * Menggerakkan semua musuh otomatis tiap frame.
 *
 * Keputusannya ada di `stepBot`; komponen ini hanya menyiapkan bahan — siapa
 * yang hidup, di mana pemain, dan apakah garis pandangnya terbuka — lalu
 * menyimpan hasilnya ke runtime musuh. Tidak ada state React yang disentuh per
 * frame, jadi penanda petarung tidak ikut dirender ulang; penanda itu membaca
 * posisi terbaru sendiri di dalam `useFrame` miliknya.
 *
 * Musuh hanya bergerak saat ronde berjalan dan pemain benar-benar bermain,
 * sama seperti bagian arena lain yang berdetak.
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

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA);
    const match = useMatchStore.getState();

    syncBots(match.fighters);

    if (match.round.status !== "live") return;
    if (!usePlayerStore.getState().isLocked) return;

    const local = match.fighters.find((fighter) => fighter.isLocal);
    if (!local) return;

    const profile = difficultyProfile(difficulty);
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
      });

      state.x = next.position.x;
      state.y = next.position.y;
      state.z = next.position.z;
      state.yaw = next.yaw;
      state.verticalVelocity = next.verticalVelocity;
      state.brain = next.brain;
      state.engaged = next.engaged;
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
