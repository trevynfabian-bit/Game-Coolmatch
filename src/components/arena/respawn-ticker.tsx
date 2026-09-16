"use client";

import { useFrame } from "@react-three/fiber";
import {
  clearRespawnTimer,
  ensureRespawnTimer,
  tickRespawnTimer,
} from "@/lib/game/respawn-runtime";
import { pickSpawnPoint } from "@/lib/game/spawn";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import type { ArenaMapInfo, MatchSnapshot, Vec3 } from "@/types/game";

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
export function RespawnTicker({
  map,
  snapshot,
}: {
  map: ArenaMapInfo;
  snapshot: MatchSnapshot;
}) {
  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, MAX_DELTA);
    const match = useMatchStore.getState();
    // Di luar ronde berjalan tidak ada yang perlu dihidupkan: peralihan ronde
    // sendiri yang menghidupkan semua orang sekaligus.
    if (match.round.status !== "live") return;

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
      const enemies = match.fighters
        .filter((other) => other.id !== fighter.id && other.isAlive)
        .map((other) => other.position);
      const spawn: Vec3 = pickSpawnPoint(map.spawnPoints, enemies);

      clearRespawnTimer(fighter.id);
      match.respawnFighter(fighter.id, spawn);

      // Pemain lokal juga dapat magasin penuh dan layar yang bersih kembali.
      if (fighter.isLocal) {
        useCombatStore.getState().arm({
          ammoInMagazine: snapshot.ammoInMagazine,
          ammoReserve: snapshot.ammoReserve,
          magazineSize: useCombatStore.getState().magazineSize,
        });
      }
    }
  });

  return null;
}
