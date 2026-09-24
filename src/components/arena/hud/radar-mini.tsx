"use client";

import { useId } from "react";
import { toRadar, RADAR_RANGE, type RadarBlip } from "@/lib/game/radar";
import type { MapBlock } from "@/types/game";

const SIZE = 100;
const R = SIZE / 2;

/**
 * Radar mini melingkar. Pemain selalu di tengah menghadap ke atas; dinding
 * peta dan blip musuh diputar mengikuti arah pandangnya. Blip di luar
 * jangkauan dijepit ke tepi supaya arah musuh tetap terbaca.
 *
 * Komponen ini murni tampilan: pemanggil yang menentukan kapan render ulang
 * (mis. beberapa kali per detik) dan blip mana yang boleh terlihat.
 */
export function RadarMini({
  player,
  blips,
  blocks,
  sweeping,
  className,
}: {
  player: { x: number; z: number; heading: number };
  blips: RadarBlip[];
  /** Balok peta untuk digambar samar sebagai denah. */
  blocks: MapBlock[];
  /** Benar saat UAV aktif: sapuan radar berputar dan cincin menyala. */
  sweeping: boolean;
  className?: string;
}) {
  const clipId = `radar-${useId().replace(/:/g, "")}`;
  const scale = R / RADAR_RANGE;
  const rotateDeg = (player.heading * 180) / Math.PI;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} role="img" aria-label="Radar mini">
      <defs>
        <clipPath id={clipId}>
          <circle cx={R} cy={R} r={R - 1} />
        </clipPath>
        <radialGradient id={`${clipId}-bg`}>
          <stop offset="0" stopColor="#0f2a1f" stopOpacity="0.85" />
          <stop offset="1" stopColor="#020617" stopOpacity="0.85" />
        </radialGradient>
      </defs>

      <circle cx={R} cy={R} r={R - 1} fill={`url(#${clipId}-bg)`} />

      <g clipPath={`url(#${clipId})`}>
        {/* Denah peta: dunia digeser ke posisi pemain lalu diputar. Sumbu x
            dunia dibalik karena sumbu kanan pemain = -x saat menghadap +Z. */}
        <g
          transform={`translate(${R} ${R}) rotate(${rotateDeg}) scale(${-scale} ${-scale}) translate(${-player.x} ${-player.z})`}
        >
          {blocks.map((block) => (
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
              fill={block.kind === "wall" ? "#334155" : "#1e293b"}
              opacity="0.8"
            />
          ))}
        </g>

        {/* Cincin jarak. */}
        <circle cx={R} cy={R} r={R * 0.5} fill="none" stroke="#34d39922" />
        <line x1={R} y1="0" x2={R} y2={SIZE} stroke="#34d39914" />
        <line x1="0" y1={R} x2={SIZE} y2={R} stroke="#34d39914" />

        {sweeping ? (
          <g className="radar-sweep" style={{ transformOrigin: `${R}px ${R}px` }}>
            <path d={`M${R} ${R} L${R} 1 A${R - 1} ${R - 1} 0 0 1 ${R + (R - 1) * Math.sin(Math.PI / 5)} ${R - (R - 1) * Math.cos(Math.PI / 5)} Z`} fill="#34d39933" />
          </g>
        ) : null}

        {blips.map((blip) => {
          const point = toRadar(blip.x - player.x, blip.z - player.z, player.heading);
          const length = Math.hypot(point.x, point.y);
          // Di luar jangkauan: jepit ke tepi dan tampilkan lebih kecil.
          const clamp = length > 0.92 ? 0.92 / length : 1;
          const cx = R + point.x * clamp * R;
          const cy = R + point.y * clamp * R;
          return (
            <circle
              key={blip.id}
              cx={cx}
              cy={cy}
              r={clamp < 1 ? 2.2 : 3.2}
              fill={blip.color}
              stroke="#0f172a"
              strokeWidth="0.8"
              opacity={clamp < 1 ? 0.6 : 1}
            >
              {blip.isFiring ? <animate attributeName="r" values="3.2;4.6;3.2" dur="0.5s" repeatCount="indefinite" /> : null}
            </circle>
          );
        })}
      </g>

      {/* Pemain: segitiga di tengah menghadap ke atas. */}
      <path d={`M${R} ${R - 5} L${R + 3.5} ${R + 3.5} L${R} ${R + 1.5} L${R - 3.5} ${R + 3.5} Z`} fill="#e2e8f0" />
      <circle cx={R} cy={R} r={R - 1} fill="none" stroke={sweeping ? "#34d399aa" : "#ffffff26"} strokeWidth="1.2" />
    </svg>
  );
}
