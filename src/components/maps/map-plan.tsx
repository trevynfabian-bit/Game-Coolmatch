import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { ArenaMapInfo } from "@/types/game";

const KIND_FILL: Record<string, string> = {
  wall: "#64748b",
  crate: "#a16207",
  pillar: "#94a3b8",
  platform: "#475569",
  ramp: "#334155",
};

export const MAP_PLAN_LEGEND = [
  { label: "Tembok", color: KIND_FILL.wall },
  { label: "Krat / kontainer", color: KIND_FILL.crate },
  { label: "Panggung", color: KIND_FILL.platform },
  { label: "Titik muncul", color: "#34d399" },
];

/**
 * Denah 2D tampak atas sebuah peta: balok dari data peta yang sama dengan
 * arena 3D, titik spawn, dan penanda utara. Balok yang lebih tinggi digambar
 * lebih pekat supaya ketinggian terbaca sekilas.
 *
 * Koordinat SVG = koordinat dunia (x ke kanan, z ke bawah), jadi `children`
 * bisa menggambar penanda tambahan — pemain, musuh, area serangan — langsung
 * memakai posisi dunia. Atribut SVG lain (mis. handler klik) diteruskan.
 */
export function MapPlan({
  map,
  className,
  showSpawns = true,
  children,
  ...svgProps
}: {
  map: ArenaMapInfo;
  className?: string;
  showSpawns?: boolean;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"svg">, "viewBox" | "children">) {
  const { minX, maxX, minZ, maxZ } = map.playableBounds;
  const pad = 1.5;
  const width = maxX - minX + pad * 2;
  const depth = maxZ - minZ + pad * 2;
  const tallest = Math.max(...map.blocks.map((block) => block.position[1] + block.size[1] / 2));

  return (
    <svg
      viewBox={`${minX - pad} ${minZ - pad} ${width} ${depth}`}
      className={className}
      role="img"
      aria-label={`Denah ${map.name}`}
      {...svgProps}
    >
      <rect x={minX - pad} y={minZ - pad} width={width} height={depth} fill={map.floorColor} opacity="0.55" />
      {map.blocks.map((block) => {
        const top = block.position[1] + block.size[1] / 2;
        return (
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
            fill={block.color && block.kind === "crate" ? block.color : (KIND_FILL[block.kind] ?? "#475569")}
            opacity={0.55 + 0.45 * Math.min(1, top / tallest)}
          />
        );
      })}
      {showSpawns
        ? map.spawnPoints.map((point, index) => (
            <circle key={index} cx={point[0]} cy={point[2]} r="0.8" fill="#34d399" stroke="#022c22" strokeWidth="0.2" />
          ))
        : null}
      <g transform={`translate(${maxX - 1.5} ${minZ + 1.5})`} aria-hidden>
        <circle r="1.6" fill="#0f172acc" />
        <path d="M0 -1.1 L0.6 0.5 L0 0.1 L-0.6 0.5 Z" fill="#e2e8f0" />
        <text y="1.35" textAnchor="middle" fontSize="0.9" fill="#94a3b8">
          U
        </text>
      </g>
      {children}
    </svg>
  );
}

/** Keterangan warna denah. */
export function MapPlanLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
      {MAP_PLAN_LEGEND.map((item) => (
        <li key={item.label} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
