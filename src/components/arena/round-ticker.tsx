"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { setRoundClock, tickRoundClock } from "@/lib/game/round-runtime";
import { spreadSpawns } from "@/lib/game/match-reset";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import type { ArenaMapInfo, MatchSnapshot } from "@/types/game";

/** Batas delta time agar jeda tab tidak melompati satu ronde penuh. */
const MAX_DELTA = 1 / 10;

/**
 * Menjalankan jam ronde dan seluruh peralihannya.
 *
 * Ronde berakhir saat waktunya habis atau ada yang mencapai batas kill. Sesudah
 * itu masuk jeda singkat, lalu ronde berikutnya dimulai dengan semua petarung
 * hidup penuh di titik spawn yang saling berjauhan. Ronde terakhir mengakhiri
 * pertandingan.
 *
 * Jam pecahannya hidup di round-runtime; store hanya diperbarui saat detik
 * bulat berubah, jadi HUD render ulang sekali per detik alih-alih tiap frame.
 */
export function RoundTicker({
  map,
  snapshot,
}: {
  map: ArenaMapInfo;
  snapshot: MatchSnapshot;
}) {
  /**
   * Penanda pertandingan yang jam-nya sudah disetel, berisi matchId dan
   * generation. Penyetelan sengaja dilakukan di dalam loop frame, BUKAN lewat
   * useEffect: loop bisa berjalan sebelum effect sempat jalan, dan jam yang
   * masih nol akan langsung mengakhiri ronde. Generation membuatnya ikut
   * menyetel ulang saat pemain menekan "Main lagi", yang tidak mengubah
   * matchId.
   */
  const seededFor = useRef<string | null>(null);

  useFrame((_state, rawDelta) => {
    const match = useMatchStore.getState();

    const seedKey = `${match.matchId}:${match.generation}`;
    if (seededFor.current !== seedKey) {
      seededFor.current = seedKey;
      setRoundClock(match.round.secondsLeft);
      return;
    }

    const { status } = match.round;
    if (status === "ended" || status === "warmup") return;

    const delta = Math.min(rawDelta, MAX_DELTA);
    const remaining = tickRoundClock(delta);
    match.setRoundClock(Math.ceil(remaining));

    if (status === "live") {
      if (match.shouldEndRound()) {
        match.finishRound();
        // finishRound sudah menetapkan panjang jeda; jam disetel ulang ke sana.
        const after = useMatchStore.getState().round;
        setRoundClock(after.secondsLeft);

        // Pertandingan usai: lepaskan kursor supaya tombol di layar akhir bisa
        // diklik tanpa pemain harus menekan Esc lebih dulu.
        if (after.status === "ended" && document.pointerLockElement) {
          document.exitPointerLock();
        }
      }
      return;
    }

    // status === "intermission"
    if (remaining > 0) return;

    const spawns = spreadSpawns(map, match.fighters);

    resetRespawnTimers();
    match.beginNextRound(spawns);
    setRoundClock(useMatchStore.getState().round.secondsLeft);

    useCombatStore.getState().arm({
      ammoInMagazine: snapshot.ammoInMagazine,
      ammoReserve: snapshot.ammoReserve,
      magazineSize: useCombatStore.getState().magazineSize,
    });
  });

  return null;
}
