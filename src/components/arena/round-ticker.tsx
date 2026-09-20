"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { setRoundClock, tickRoundClock } from "@/lib/game/round-runtime";
import { refillActiveWeapon } from "@/lib/game/arm-player";
import { spreadSpawns } from "@/lib/game/match-reset";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { closeRound } from "@/lib/game/session-runtime";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo } from "@/types/game";

/** Batas delta time agar jeda tab tidak melompati satu ronde penuh. */
const MAX_DELTA = 1 / 10;

/**
 * Menjalankan jam ronde dan seluruh peralihannya.
 *
 * Pertandingan menunggu di `warmup` sampai pemain benar-benar masuk arena,
 * lalu ronde berakhir saat waktunya habis atau ada yang mencapai batas kill.
 * Sesudah itu masuk jeda singkat, lalu ronde berikutnya dimulai dengan semua
 * petarung hidup penuh di titik spawn yang saling berjauhan. Pertandingan
 * ditutup pada ronde terakhir — atau lebih awal bila gelar sudah terkunci.
 *
 * Jam pecahannya hidup di round-runtime; store hanya diperbarui saat detik
 * bulat berubah, jadi HUD render ulang sekali per detik alih-alih tiap frame.
 */
export function RoundTicker({ map }: { map: ArenaMapInfo }) {
  /**
   * Penanda pertandingan yang jam-nya sudah disetel, berisi matchId dan
   * generation. Penyetelan sengaja dilakukan di dalam loop frame, BUKAN lewat
   * useEffect: loop bisa berjalan sebelum effect sempat jalan, dan jam yang
   * masih nol akan langsung mengakhiri ronde. Generation membuatnya ikut
   * menyetel ulang saat pemain menekan "Main lagi", yang tidak mengubah
   * matchId.
   */
  const seededFor = useRef<string | null>(null);
  /**
   * Benar selagi fakta ronde sudah dikirim ke sesi dan kesimpulannya belum
   * kembali. Rondenya masih "live" selama itu, jadi tanpa penanda ini frame
   * berikutnya akan mengirim ronde yang sama sekali lagi.
   */
  const closing = useRef(false);

  useFrame((_state, rawDelta) => {
    const match = useMatchStore.getState();

    const seedKey = `${match.matchId}:${match.generation}`;
    if (seededFor.current !== seedKey) {
      seededFor.current = seedKey;
      closing.current = false;
      setRoundClock(match.round.secondsLeft);
      return;
    }

    const { status } = match.round;
    if (status === "ended") return;

    /**
     * Pertandingan belum dimulai sampai pemain mengunci kursor. Tanpa gerbang
     * ini jam ronde sudah mengalir selagi layar ajakan main masih terbuka —
     * pemain yang membaca petunjuk kontrol lebih lama akan mendapati rondenya
     * sudah terpotong padahal belum sempat melangkah.
     */
    if (status === "warmup") {
      if (!usePlayerStore.getState().isLocked) return;
      match.beginMatch();
      setRoundClock(useMatchStore.getState().round.secondsLeft);
      return;
    }

    /**
     * Kursor yang dilepas berarti pemain menjeda. Musuh sudah berhenti sendiri
     * saat itu terjadi, jadi jam ikut berhenti; kalau tidak, ronde bisa habis
     * atau berganti sementara tidak ada satu pun yang bergerak di arena.
     */
    if (!usePlayerStore.getState().isLocked) return;

    const delta = Math.min(rawDelta, MAX_DELTA);
    const remaining = tickRoundClock(delta);
    match.setRoundClock(Math.ceil(remaining));

    if (status === "live") {
      if (closing.current || !match.shouldEndRound()) return;
      closing.current = true;

      /*
        Fakta ronde ini — siapa membunuh berapa kali — dikirim ke sesi, dan
        kesimpulan sesilah yang menutup rondenya: pemenang, roster, dan apakah
        pertandingan selesai. Arena tidak mengklaim "si anu menang". Bila sesi
        tidak menjawab, arena menyimpulkan sendiri dengan aturan yang sama
        supaya pertandingan tidak tersangkut di ujung ronde.
      */
      const seed = seedKey;
      void closeRound({
        roundNumber: match.round.current,
        kills: match.fighters.map((fighter) => ({
          participantName: fighter.name,
          roundKills: fighter.roundKills,
        })),
      }).then((outcome) => {
        closing.current = false;
        const now = useMatchStore.getState();
        // Pertandingan sudah diganti selagi menunggu: kesimpulannya basi.
        if (`${now.matchId}:${now.generation}` !== seed) return;

        now.finishRound(outcome ?? undefined);
        // finishRound sudah menetapkan panjang jeda; jam disetel ulang ke sana.
        const after = useMatchStore.getState().round;
        setRoundClock(after.secondsLeft);

        // Pertandingan usai: lepaskan kursor supaya tombol di layar akhir bisa
        // diklik tanpa pemain harus menekan Esc lebih dulu.
        if (after.status === "ended" && document.pointerLockElement) {
          document.exitPointerLock();
        }
      });
      return;
    }

    // status === "intermission"
    if (remaining > 0) return;

    const spawns = spreadSpawns(map, match.fighters);

    resetRespawnTimers();
    match.beginNextRound(spawns);
    setRoundClock(useMatchStore.getState().round.secondsLeft);

    refillActiveWeapon();
  });

  return null;
}
