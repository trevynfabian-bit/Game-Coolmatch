"use client";

import { useEffect } from "react";
import { playCue } from "@/lib/audio/sfx";
import { useMatchStore } from "@/lib/store/match-store";

/**
 * Penanda suara untuk peristiwa pertandingan yang tidak punya titik picu di
 * sistem senjata: pemain tumbang dan muncul lagi, ronde mulai dan selesai,
 * serta menang atau kalah di akhir pertandingan.
 */
export function CombatAudio() {
  useEffect(
    () =>
      useMatchStore.subscribe((state, previous) => {
        if (state.generation !== previous.generation) {
          playCue("ronde_mulai");
          return;
        }
        const local = state.fighters.find((fighter) => fighter.isLocal);
        const before = previous.fighters.find((fighter) => fighter.isLocal);
        if (local && before) {
          if (before.isAlive && !local.isAlive) playCue("tumbang");
          if (!before.isAlive && local.isAlive) playCue("muncul");
        }

        const status = state.round.status;
        if (status === previous.round.status) return;
        if (status === "live" && previous.round.status === "intermission") playCue("ronde_mulai");
        if (status === "intermission") playCue("ronde_selesai");
        if (status === "ended") playCue(state.round.matchWinner === local?.name ? "menang" : "kalah");
      }),
    [],
  );
  return null;
}
