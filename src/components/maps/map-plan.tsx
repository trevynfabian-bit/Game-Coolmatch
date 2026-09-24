import type { ArenaMapInfo } from "@/types/game";

const KIND_FILL: Record<string, string> = {
  wall: "#64748b",
  crate: "#a16207",
  pillar: "#94a3b8",
  platform: "#475569",
  ramp: "#334155",
};

/**
 * Denah 2D sebuah peta dari atas: balok dari data peta yang sama dengan arena
 * 3D, plus titik spawn. Utara di atas.
 */
export function MapPlan({
  map,
  className,
  showSpawns = true,
}: {
  map: ArenaMapInfo;
  className?: string;
  showSpawns?: boolean;
}) {
  const { minX, maxX, minZ, maxZ } = map.playableBounds;
  const pad = 1.5;
  const width = maxX - minX + pad * 2;
  const depth = maxZ - minZ + pad * 2;

  return (
    <svg
      viewBox={`${minX - pad} ${minZ - pad} ${width} ${depth}`}
      className={className}
      role="img"
      aria-label={`Denah ${map.name}`}
    >
      <rect x={minX - pad} y={minZ - pad} width={width} height={depth} fill={map.floorColor} opacity="0.55" />
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
          fill={block.color && block.kind === "crate" ? block.color : (KIND_FILL[block.kind] ?? "#475569")}
          opacity={block.position[1] > block.size[1] / 2 + 0.1 ? 0.95 : 0.8}
        />
      ))}
      {showSpawns
        ? map.spawnPoints.map((point, index) => (
            <circle key={index} cx={point[0]} cy={point[2]} r="0.8" fill="#34d399" stroke="#022c22" strokeWidth="0.2" />
          ))
        : null}
    </svg>
  );
}
