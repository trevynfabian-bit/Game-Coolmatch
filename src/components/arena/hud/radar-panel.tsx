"use client";

import { useEffect, useState } from "react";
import { RadarMini } from "@/components/arena/hud/radar-mini";
import { playerRuntime } from "@/lib/game/player-runtime";
import type { RadarBlip } from "@/lib/game/radar";
import type { ArenaMapInfo } from "@/types/game";

/** Blip musuh tiruan untuk fase frontend, di sekitar titik-titik spawn peta. */
const MOCK_BLIPS: RadarBlip[] = [
  { id: "mock-1", x: -15, z: -16, color: "#f97316" },
  { id: "mock-2", x: 15, z: -16, color: "#ef4444", isFiring: true },
  { id: "mock-3", x: 18, z: 7, color: "#a855f7" },
  { id: "mock-4", x: 0, z: 19, color: "#22c55e" },
];

/** Radar diperbarui sepuluh kali per detik — cukup halus tanpa membebani React. */
const REFRESH_MS = 100;

/**
 * Panel radar mini di pojok kanan-atas HUD. Membaca posisi dan arah pemain
 * dari runtime beberapa kali per detik. Untuk fase frontend blip musuhnya
 * tiruan; integrasi UAV mengisinya dengan posisi musuh sungguhan.
 */
export function RadarPanel({ map }: { map: ArenaMapInfo }) {
  const [player, setPlayer] = useState({ x: 0, z: 0, heading: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const [x, , z] = playerRuntime.position;
      setPlayer((prev) =>
        prev.x === x && prev.z === z && prev.heading === playerRuntime.heading
          ? prev
          : { x, z, heading: playerRuntime.heading },
      );
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute top-4 right-5 hidden lg:block">
      <RadarMini player={player} blips={MOCK_BLIPS} blocks={map.blocks} sweeping className="h-40 w-40 drop-shadow-lg" />
      <p className="mt-1 text-center text-[9px] tracking-[0.25em] text-emerald-300/80 uppercase">Radar</p>
    </div>
  );
}
