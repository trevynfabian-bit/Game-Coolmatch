import type { ArenaMapInfo, MapBlock } from "@/types/game";

/**
 * Tinggi minimal sebuah balok agar digambar pekat.
 *
 * Yang lebih rendah — panggung, helipad, ramp landai — bisa dinaiki tetapi
 * tidak menghalangi pandangan, jadi digambar samar. Bedanya penting: tanpa itu
 * helipad selebar 14 satuan akan terlihat seperti tembok raksasa di tengah
 * arena, padahal ia justru tempat paling terbuka di peta itu.
 */
const SOLID_HEIGHT = 1.5;

function isSolid(block: MapBlock): boolean {
  return block.position[1] + block.size[1] / 2 >= SOLID_HEIGHT;
}

/**
 * Denah peta tampak atas.
 *
 * Digambar dari balok peta yang SESUNGGUHNYA, bukan dari berkas gambar. Tiga
 * alasannya. Denah yang digambar tangan akan basi begitu petanya diubah,
 * sementara yang ini selalu menggambarkan keadaan sekarang. Ia juga tidak
 * menambah satu pun aset yang harus diunduh — hanya beberapa kotak SVG.
 * Dan yang paling penting, ia benar-benar memperlihatkan bentuk arenanya:
 * jalur-jalur sempit Lorong Pabrik dan atap Atap Kota yang nyaris kosong
 * langsung terbaca, jauh sebelum pemain sempat membaca deskripsinya.
 *
 * Satuan SVG-nya adalah satuan dunia apa adanya lewat `viewBox`, sehingga
 * posisi dan ukuran tiap balok bisa dipakai langsung tanpa dikonversi — dan
 * tidak ada faktor skala yang bisa salah.
 */
export function MapThumbnail({
  map,
  className = "",
  showScale = false,
}: {
  map: ArenaMapInfo;
  className?: string;
  /**
   * Menggambar garis bantu tiap sepuluh satuan dunia.
   *
   * Hanya berguna pada tampilan besar: di ukuran kartu, garisnya lebih tipis
   * daripada balok terkecil dan justru membuat denahnya ramai. Di layar
   * pratinjau, garis itulah yang memberi arti pada angka "43m" — tanpanya
   * ketiga peta terlihat sama besar karena sama-sama memenuhi kotaknya.
   */
  showScale?: boolean;
}) {
  const [width, depth] = map.floorSize;
  const half = Math.max(width, depth) / 2;
  const scaleLines = showScale
    ? Array.from({ length: Math.floor(half / 10) * 2 + 1 }, (_, i) => (i - Math.floor(half / 10)) * 10)
    : [];

  return (
    <svg
      viewBox={`${-width / 2} ${-depth / 2} ${width} ${depth}`}
      className={`block h-auto w-full ${className}`}
      role="img"
      aria-label={`Denah tampak atas peta ${map.name}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Lantai arena, memakai warna lantai peta itu sendiri. */}
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        fill={map.floorColor}
      />

      {/* Garis bantu digambar di bawah balok supaya tidak memotong bentuknya. */}
      {scaleLines.map((v) => (
        <g key={`skala-${v}`} stroke="#ffffff" strokeOpacity={0.07} strokeWidth={0.15}>
          <line x1={v} y1={-depth / 2} x2={v} y2={depth / 2} />
          <line x1={-width / 2} y1={v} x2={width / 2} y2={v} />
        </g>
      ))}

      {map.blocks.map((block) => (
        <rect
          key={block.id}
          x={block.position[0] - block.size[0] / 2}
          y={block.position[2] - block.size[2] / 2}
          width={block.size[0]}
          height={block.size[2]}
          fill={block.color ?? "#6b6053"}
          // Balok rendah digambar tembus pandang: ia menandai lantai yang bisa
          // dinaiki, bukan penghalang.
          opacity={isSolid(block) ? 0.95 : 0.45}
        />
      ))}

      {/* Titik spawn: menunjukkan dari mana pertarungan dimulai dan seberapa
          menyebar titik awalnya. */}
      {map.spawnPoints.map((point) => (
        <circle
          key={point.join(",")}
          cx={point[0]}
          cy={point[2]}
          r={Math.max(0.8, width * 0.02)}
          fill="#34d399"
          opacity={0.75}
        />
      ))}
    </svg>
  );
}
