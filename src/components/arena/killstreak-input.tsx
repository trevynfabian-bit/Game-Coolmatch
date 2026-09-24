"use client";

import { useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { STREAK_ACTIONS, type MoveAction } from "@/lib/game/controls";
import { callKillstreak } from "@/lib/game/killstreak";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Tombol 6, 7, 8 memanggil hadiah killstreak sesuai urutan loadout, dan loop
 * frame mengakhiri hadiah yang waktunya habis. Hanya bekerja saat kursor
 * terkunci dan ronde berjalan — hadiah tidak bisa dipanggil di layar jeda.
 */
export function KillstreakInput() {
  const [subscribeKeys] = useKeyboardControls<MoveAction>();

  useEffect(() => {
    const unsubscribes = STREAK_ACTIONS.map((action, index) =>
      subscribeKeys(
        (state) => state[action],
        (pressed) => {
          if (!pressed) return;
          if (!usePlayerStore.getState().isLocked) return;
          if (useMatchStore.getState().round.status !== "live") return;
          const streaks = useKillstreakStore.getState();
          const id = streaks.loadout[index];
          if (id) callKillstreak(id, streaks);
        },
      ),
    );
    return () => unsubscribes.forEach((off) => off());
  }, [subscribeKeys]);

  useFrame(() => {
    useKillstreakStore.getState().expire(performance.now());
  });

  return null;
}
