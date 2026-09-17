"use client";

import { useFrame } from "@react-three/fiber";
import { refillActiveWeapon } from "@/lib/game/arm-player";
import { livePosition } from "@/lib/game/bot-runtime";
import {
  clearRespawnTimer,
  ensureRespawnTimer,
  tickRespawnTimer,
} from "@/lib/game/respawn-runtime";
import { pickSpawnPoint } from "@/lib/game/spawn";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Vec3 } from "@/types/game";

/** Batas delta time agar jeda tab tidak memunculkan semua orang sekaligus. */
const MAX_DELTA = 1 / 15;

/**
 * Menjalankan hitung mundur respawn semua petarung dan menghidupkan mereka
 * kembali saat waktunya habis.
 *
 * Hitung mundur pecahan hidup di respawn-runtime; store hanya diperbarui saat
 * detik bulat yang ditampilkan berubah, jadi HUD render ulang sekali per detik
 * alih-alih tiap frame.
 */
export function RespawnTicker({ map }: { map: ArenaMapInfo }) {
  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA);
    const match = useMatchStore.getState();
    // Di luar ronde berjalan tidak ada yang perlu dihidupkan: peralihan ronde
    // sendiri yang menghidupkan semua orang sekaligus.
    if (match.round.status !== "live") return;
    // Kursor yang dilepas berarti jeda, dan jeda berlaku untuk seluruh arena —
    // sama seperti musuh dan jam ronde yang ikut berhenti. Tanpa ini pemain
    // yang menjeda tepat setelah tumbang akan hidup kembali sendirinya selagi
    // tidak ada apa pun di arena yang bergerak.
    if (!usePlayerStore.getState().isLocked) return;

    for (const fighter of match.fighters) {
      if (fighter.isAlive) {
        clearRespawnTimer(fighter.id);
        continue;
      }

      ensureRespawnTimer(fighter.id, fighter.respawnInSeconds ?? 0);
      const remaining = tickRespawnTimer(fighter.id, delta);

      if (remaining > 0) {
        match.setRespawnCountdown(fighter.id, Math.ceil(remaining));
        continue;
      }

      // Muncul sejauh mungkin dari lawan yang masih hidup.
      //
      // Dua hal penting di sini. Pertama, daftar lawannya dibaca dari state
      // TERKINI, bukan dari potret `match` di atas: `respawnFighter` membuat
      // array petarung baru, jadi potret itu tidak pernah ikut berubah, dan
      // memakainya membuat beberapa petarung yang tumbang pada frame yang sama
      // melihat keadaan identik lalu muncul bertumpuk di satu titik.
      //
      // Kedua, yang dipakai adalah posisi HIDUP tiap orang, bukan posisi di
      // store. Posisi di store adalah tempat mereka terakhir diletakkan, dan
      // sejak musuh berjalan sendiri hampir tidak ada yang masih berdiri di
      // titik spawn-nya. Dengan posisi basi, seorang pemain yang sudah pindah
      // ke titik spawn lain justru mengundang musuh muncul tepat di depan
      // hidungnya — pada peta ini jaraknya bisa nol unit.
      const enemies = useMatchStore
        .getState()
        .fighters.filter((other) => other.id !== fighter.id && other.isAlive)
        .map((other) => livePosition(other));
      const spawn: Vec3 = pickSpawnPoint(map.spawnPoints, enemies);

      clearRespawnTimer(fighter.id);
      match.respawnFighter(fighter.id, spawn);

      // Pemain lokal juga dapat magasin penuh saat muncul kembali.
      if (fighter.isLocal) {
        refillActiveWeapon();
      }
    }
  });

  return null;
}
