import { WEAPON_SHAPES } from "@/lib/weapons/weapon-shape";
import type { WeaponType } from "@/types/game";

/** Lebar kanvas siluet dalam satuan viewBox. */
const W = 100;
const H = 40;
/** Satu unit proporsi senjata setara sekian satuan viewBox. */
const SCALE = 62;

/**
 * Siluet senjata sebagai SVG sederhana, digambar dari proporsi yang sama
 * dengan pratinjau 3D. Dipakai di kartu daftar senjata, di mana memuat kanvas
 * WebGL untuk tiap kartu jelas berlebihan.
 */
export function WeaponSilhouette({
  type,
  className,
}: {
  type: WeaponType;
  className?: string;
}) {
  const shape = WEAPON_SHAPES[type];

  const bodyW = shape.bodyLength * SCALE;
  const bodyH = shape.bodyHeight * SCALE;
  const barrelW = shape.barrelLength * SCALE;
  const barrelH = shape.barrelThickness * SCALE;
  const magH = shape.magazineDepth * SCALE;

  // Laras menjulur ke kiri dari badan; badan diletakkan agar seluruh senjata
  // muat rapi di tengah viewBox berapa pun panjangnya.
  const total = bodyW + barrelW + (shape.hasStock ? 14 : 0);
  const startX = (W - total) / 2;
  const barrelX = startX;
  const bodyX = startX + barrelW;
  const midY = H / 2 - 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      fill="none"
      aria-hidden
    >
      <rect
        x={barrelX}
        y={midY - barrelH / 2}
        width={barrelW}
        height={barrelH}
        rx={barrelH / 2}
        fill="currentColor"
        opacity="0.75"
      />

      <rect
        x={bodyX}
        y={midY - bodyH / 2}
        width={bodyW}
        height={bodyH}
        rx="2"
        fill="currentColor"
      />

      {magH > 0 ? (
        <rect
          x={bodyX + bodyW * 0.22}
          y={midY + bodyH / 2 - 1}
          width={bodyW * 0.2}
          height={magH}
          rx="1.5"
          fill="currentColor"
          opacity="0.85"
        />
      ) : null}

      <rect
        x={bodyX + bodyW * 0.6}
        y={midY + bodyH / 2 - 1}
        width={bodyW * 0.16}
        height={magH > 0 ? magH * 0.8 : 11}
        rx="1.5"
        fill="currentColor"
        opacity="0.7"
        transform={`rotate(12 ${bodyX + bodyW * 0.68} ${midY})`}
      />

      {shape.hasStock ? (
        <rect
          x={bodyX + bodyW}
          y={midY - bodyH / 2 + 1}
          width="14"
          height={bodyH * 0.85}
          rx="2"
          fill="currentColor"
          opacity="0.6"
        />
      ) : null}

      {shape.hasScope ? (
        <>
          <rect
            x={bodyX + bodyW * 0.18}
            y={midY - bodyH / 2 - 6}
            width={bodyW * 0.5}
            height="5"
            rx="2.5"
            fill="currentColor"
            opacity="0.8"
          />
          <rect
            x={bodyX + bodyW * 0.3}
            y={midY - bodyH / 2 - 2}
            width="3"
            height="3"
            fill="currentColor"
            opacity="0.8"
          />
        </>
      ) : null}
    </svg>
  );
}
