"use client";

import { useEffect, useState } from "react";
import { RadarMini } from "@/components/arena/hud/radar-mini";
import { getBot } from "@/lib/game/bot-runtime";
import { playerRuntime } from "@/lib/game/player-runtime";
import type { RadarBlip } from "@/lib/game/radar";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import type { ArenaMapInfo } from "@/types/game";

/** Radar diperbarui sepuluh kali per detik — cukup halus tanpa membebani React. */
const REFRESH_MS = 100;

interface RadarFrame {
  player: { x: number; z: number; heading: number };
  blips: RadarBlip[];
  /** Sisa detik UAV, dibulatkan ke atas; null bila UAV tidak aktif. */
  uavSeconds: number | null;
}

/**
 * Posisi musuh yang HIDUP saat ini, dibaca dari runtime bot. Warna blip
 * mengikuti warna penanda musuh di arena dan papan skor.
 */
function liveEnemyBlips(): RadarBlip[] {
  const blips: RadarBlip[] = [];
  for (const fighter of useMatchStore.getState().fighters) {
    if (fighter.isLocal || !fighter.isAlive) continue;
    const bot = getBot(fighter.id);
    if (!bot) continue;
    blips.push({ id: fighter.id, x: bot.x, z: bot.z, color: fighter.color, isFiring: bot.engaged });
  }
  return blips;
}

/**
 * Panel radar mini di pojok kanan-atas HUD.
 *
 * Tanpa UAV, radar hanya menampilkan denah peta dan arah pandang pemain.
 * Selama UAV aktif, posisi semua musuh yang hidup muncul dan diperbarui
 * terus, sapuan radar berputar, dan hitung mundur sisa waktunya tampil di
 * bawah radar.
 */
export function RadarPanel({ map }: { map: ArenaMapInfo }) {
  const uavEndsAt = useKillstreakStore((state) => state.active.uav);
  const [frame, setFrame] = useState<RadarFrame>({
    player: { x: 0, z: 0, heading: 0 },
    blips: [],
    uavSeconds: null,
  });

  useEffect(() => {
    const tick = () => {
      const [x, , z] = playerRuntime.position;
      const now = performance.now();
      const uavOn = uavEndsAt !== undefined && uavEndsAt > now;
      setFrame({
        player: { x, z, heading: playerRuntime.heading },
        blips: uavOn ? liveEnemyBlips() : [],
        uavSeconds: uavOn ? Math.ceil((uavEndsAt - now) / 1000) : null,
      });
    };
    tick();
    const timer = setInterval(tick, REFRESH_MS);
    return () => clearInterval(timer);
  }, [uavEndsAt]);

  const uavOn = frame.uavSeconds !== null;

  return (
    <div className="pointer-events-none absolute top-4 right-5 hidden lg:block">
      <RadarMini
        player={frame.player}
        blips={frame.blips}
        blocks={map.blocks}
        sweeping={uavOn}
        className="h-40 w-40 drop-shadow-lg"
      />
      {uavOn ? (
        <p
          className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-sky-300 uppercase"
          role="status"
          aria-label={`UAV aktif, ${frame.uavSeconds} detik lagi`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
          UAV <span className="font-mono tabular-nums">{frame.uavSeconds}s</span>
        </p>
      ) : (
        <p className="mt-1 text-center text-[9px] tracking-[0.25em] text-slate-500 uppercase">Radar</p>
      )}
    </div>
  );
}
