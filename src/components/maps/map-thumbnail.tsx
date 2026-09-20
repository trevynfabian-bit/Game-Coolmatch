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

      {map.blocks.map((block) => {
        const [x, , z] = block.position;
        const [sx, , sz] = block.size;
        // Balok rendah digambar tembus pandang: ia menandai lantai yang bisa
        // dinaiki, bukan penghalang.
        const opacity = isSolid(block) ? 0.95 : 0.45;
        const fill = block.color ?? "#6b6053";

        // Drum digambar bundar, sebagaimana wujudnya di arena. Denah yang
        // menggambarnya kotak membuatnya tidak bisa dibedakan dari krat —
        // padahal keduanya justru dipakai pemain untuk mengenali tempat.
        if (block.kind === "drum") {
          return (
            <circle
              key={block.id}
              cx={x}
              cy={z}
              r={Math.min(sx, sz) / 2}
              fill={fill}
              opacity={opacity}
            />
          );
        }

        /*
          Putarannya ikut digambar. Denah yang mengabaikannya menunjukkan krat
          yang lurus padahal di arena ia miring, dan sejak tabrakan mengikuti
          tapak sebenarnya, selisih itu bukan lagi soal gambar: pemain
          merencanakan jalur dari denah ini, lalu menemukan celah yang
          dilihatnya ternyata tertutup.
        */
        const derajat = ((block.rotationY ?? 0) * 180) / Math.PI;

        return (
          <rect
            key={block.id}
            x={x - sx / 2}
            y={z - sz / 2}
            width={sx}
            height={sz}
            fill={fill}
            opacity={opacity}
            transform={derajat === 0 ? undefined : `rotate(${derajat} ${x} ${z})`}
          />
        );
      })}

      {/* Lampu arena: menandai tempat yang terang, dan dengan sendirinya juga
          tempat yang gelap. Digambar sebelum titik spawn supaya penanda spawn
          tetap yang paling terbaca. */}
      {(map.lighting.lamps ?? []).map((lamp) => (
        <g key={lamp.id}>
          <circle
            cx={lamp.position[0]}
            cy={lamp.position[2]}
            r={Math.max(1.6, width * 0.035)}
            fill={lamp.color}
            opacity={0.14}
          />
          <circle
            cx={lamp.position[0]}
            cy={lamp.position[2]}
            r={Math.max(0.5, width * 0.011)}
            fill={lamp.color}
            opacity={0.85}
          />
        </g>
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
