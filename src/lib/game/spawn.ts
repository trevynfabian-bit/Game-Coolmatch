import type { Vec3 } from "@/types/game";

function distanceSquared(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Memilih titik spawn yang paling aman: titik yang jarak terdekatnya ke lawan
 * paling jauh. Ini cara sederhana yang efektif mencegah pemain muncul kembali
 * tepat di depan moncong senjata seseorang.
 *
 * Bila tidak ada lawan hidup sama sekali, titik pertama dipakai — itu titik
 * spawn bawaan peta.
 */
export function pickSpawnPoint(spawnPoints: Vec3[], avoid: Vec3[]): Vec3 {
  if (spawnPoints.length === 0) return [0, 0, 0];
  if (avoid.length === 0) return spawnPoints[0];

  let best = spawnPoints[0];
  let bestScore = -Infinity;

  for (const point of spawnPoints) {
    let nearest = Infinity;
    for (const enemy of avoid) {
      nearest = Math.min(nearest, distanceSquared(point, enemy));
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      best = point;
    }
  }

  return best;
}
