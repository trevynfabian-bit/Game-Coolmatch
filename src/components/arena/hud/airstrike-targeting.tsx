"use client";

import { useEffect, useState } from "react";
import { getBot } from "@/lib/game/bot-runtime";
import { AIRSTRIKE, findKillstreak } from "@/lib/game/killstreak";
import { playerRuntime } from "@/lib/game/player-runtime";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useMatchStore } from "@/lib/store/match-store";
import type { ArenaMapInfo } from "@/types/game";

/**
 * Denah pemilihan sasaran serangan udara.
 *
 * Muncul saat pemain memanggil serangan udara: kursor dilepas, peta tampil
 * dari atas, dan pemain mengklik titik sasaran. Lingkaran pratinjau
 * menunjukkan luas area hantaman. Permainan TIDAK berhenti selama memilih,
 * jadi berlama-lama di denah itu berisiko. Esc atau "Batal" menutup denah
 * dan hadiahnya tetap siap dipakai.
 *
 * Posisi musuh hanya digambar bila UAV sedang aktif — serangan udara tanpa
 * UAV adalah tebakan terdidik.
 */
export function AirstrikeTargeting({ map }: { map: ArenaMapInfo }) {
  const targeting = useKillstreakStore((state) => state.targeting);
  const uavEndsAt = useKillstreakStore((state) => state.active.uav);
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const [picked, setPicked] = useState<{ x: number; z: number } | null>(null);
  const [snapshot, setSnapshot] = useState<{
    player: { x: number; z: number };
    enemies: { id: string; x: number; z: number; color: string }[];
  }>({ player: { x: 0, z: 0 }, enemies: [] });

  const open = targeting === "serangan_udara";

  // Posisi dibaca ulang beberapa kali per detik selama denah terbuka.
  useEffect(() => {
    if (!open) return;
    const read = () => {
      const uavOn = uavEndsAt !== undefined && uavEndsAt > performance.now();
      setSnapshot({
        player: { x: playerRuntime.position[0], z: playerRuntime.position[2] },
        enemies: uavOn
          ? useMatchStore
              .getState()
              .fighters.filter((f) => !f.isLocal && f.isAlive)
              .flatMap((f) => {
                const bot = getBot(f.id);
                return bot ? [{ id: f.id, x: bot.x, z: bot.z, color: f.color }] : [];
              })
          : [],
      });
    };
    read();
    const timer = setInterval(read, 200);
    return () => clearInterval(timer);
  }, [open, uavEndsAt]);

  // Selama denah terbuka kursor harus bebas. PointerLockControls menyimak klik
  // di level document dan bisa mengunci ulang kursor; kunci itu langsung
  // dilepas lagi supaya klik berikutnya tetap sampai ke denah.
  useEffect(() => {
    if (!open) return;
    const release = () => {
      if (document.pointerLockElement) document.exitPointerLock();
    };
    release();
    document.addEventListener("pointerlockchange", release);
    return () => document.removeEventListener("pointerlockchange", release);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") useKillstreakStore.getState().cancelTargeting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const { minX, maxX, minZ, maxZ } = map.playableBounds;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const reward = findKillstreak("serangan_udara");

  /** Mengubah posisi klik di SVG menjadi koordinat dunia. */
  function worldFromEvent(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = minX + ((event.clientX - rect.left) / rect.width) * width;
    const z = minZ + ((event.clientY - rect.top) / rect.height) * depth;
    return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
  }

  const close = () => {
    setPicked(null);
    useKillstreakStore.getState().cancelTargeting();
  };
  const launch = () => {
    if (!picked) return;
    useKillstreakStore.getState().launchStrike(picked);
    setPicked(null);
  };
  const marker = picked ?? hover;

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-slate-950/80 px-4 backdrop-blur-sm"
      onClick={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-serangan-udara"
    >
      <div className="w-full max-w-md">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: reward.color }}>
              Killstreak
            </p>
            <h2 id="judul-serangan-udara" className="text-xl font-bold text-white">
              Tandai sasaran serangan udara
            </h2>
          </div>
          <p className="text-right text-[11px] text-slate-400">
            Klik di denah
            <br />
            Esc untuk batal
          </p>
        </div>

        <svg
          viewBox={`${minX} ${minZ} ${width} ${depth}`}
          className="aspect-square w-full cursor-crosshair rounded-xl border border-white/15 bg-slate-900"
          onPointerMove={(event) => setHover(worldFromEvent(event))}
          onPointerLeave={() => setHover(null)}
          onClick={(event) => setPicked(worldFromEvent(event))}
        >
          <defs>
            <pattern id="denah-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M5 0H0V5" fill="none" stroke="#ffffff0d" strokeWidth="0.15" />
            </pattern>
          </defs>
          <rect x={minX} y={minZ} width={width} height={depth} fill="url(#denah-grid)" />
          {map.blocks.map((block) => (
            <rect
              key={block.id}
              x={block.position[0] - block.size[0] / 2}
              y={block.position[2] - block.size[2] / 2}
              width={block.size[0]}
              height={block.size[2]}
              transform={
                block.rotationY
                  ? `rotate(${(-block.rotationY * 180) / Math.PI} ${block.position[0]} ${block.position[2]})`
                  : undefined
              }
              fill={block.kind === "wall" ? "#475569" : "#334155"}
            />
          ))}

          {snapshot.enemies.map((enemy) => (
            <circle key={enemy.id} cx={enemy.x} cy={enemy.z} r="0.8" fill={enemy.color} stroke="#0f172a" strokeWidth="0.2" />
          ))}

          <circle cx={snapshot.player.x} cy={snapshot.player.z} r="0.9" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.25" />

          {marker ? (
            <g pointerEvents="none">
              <circle
                cx={marker.x}
                cy={marker.z}
                r={AIRSTRIKE.radius}
                fill={`${reward.color}33`}
                stroke={reward.color}
                strokeWidth="0.3"
                strokeDasharray={picked ? undefined : "1 0.6"}
              />
              <path
                d={`M${marker.x - 1} ${marker.z}H${marker.x + 1}M${marker.x} ${marker.z - 1}V${marker.z + 1}`}
                stroke={reward.color}
                strokeWidth="0.3"
              />
            </g>
          ) : null}
        </svg>

        {picked &&
        Math.hypot(picked.x - snapshot.player.x, picked.z - snapshot.player.z) < AIRSTRIKE.radius ? (
          <p className="mt-2 text-center text-xs text-rose-300">
            Awas: kamu berada di dalam area hantaman.
          </p>
        ) : (
          <p className="mt-2 text-center text-xs text-slate-500">
            {uavEndsAt !== undefined ? "UAV aktif: posisi musuh terlihat." : "Tanpa UAV, posisi musuh tidak terlihat."}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-white/30"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={launch}
            disabled={!picked}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: reward.color }}
          >
            Luncurkan
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Sesudah meluncurkan, klik arena untuk kembali bertempur.
        </p>
      </div>
    </div>
  );
}
