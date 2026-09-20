"use client";

import { BoxSurface, Surface } from "@/components/arena/surface-material";
import type { MapBlock } from "@/types/game";

/**
 * Prop arena: benda yang punya BENTUK, bukan sekadar balok bertekstur.
 *
 * Tekstur sudah membuat permukaan arena terbaca sebagai bahan, tetapi dari
 * jauh — dan dalam pertandingan, jauh adalah jarak yang paling sering — yang
 * lebih dulu sampai ke mata adalah siluetnya. Peti, drum, dan pilar yang
 * ketiganya berupa kotak akan tetap terlihat seperti tiga kotak seukuran
 * berbeda sampai pemain cukup dekat untuk membaca teksturnya.
 *
 * Semua prop TETAP MUAT di dalam kotak baloknya. Penyelesai tabrakan bekerja
 * dari kotak itu, bukan dari bentuk yang terlihat, jadi bagian mana pun yang
 * menjulur keluar akan bisa ditembus — dan tidak ada yang lebih cepat
 * mematahkan kepercayaan pemain pada sebuah penutup daripada peluru yang
 * menembus sesuatu yang jelas-jelas padat.
 */

/** Jumlah sisi tabung. Dua belas: bundar dari jauh, masih murah dari dekat. */
const SISI_TABUNG = 12;

const BAHAN_PETI = [
  "crate",
  "crate",
  "crateTop",
  "crateTop",
  "crate",
  "crate",
] as const;

/**
 * Peti kayu beserta rangka sudutnya.
 *
 * Empat tiang tipis di keempat sudut, sedikit lebih menonjol daripada badan
 * petinya. Itu yang memberi peti garis tepi yang tetap terbaca ketika petinya
 * berdiri di depan tembok berwarna mirip — tanpa tiang itu, peti dan tembok
 * di belakangnya melebur jadi satu bidang gelap, dan pemain baru menyadari ada
 * penutup di situ setelah menabraknya.
 */
export function CrateProp({ block }: { block: MapBlock }) {
  const [sx, sy, sz] = block.size;
  const warna = block.color ?? "#9c7440";

  // Tiang dibuat dari bahan peti yang sama, hanya lebih gelap, supaya ia
  // terbaca sebagai kayu yang sama — bukan logam yang ditempel belakangan.
  const tiang = Math.min(sx, sz) * 0.09;
  const sudut: [number, number][] = [
    [-sx / 2 + tiang / 2, -sz / 2 + tiang / 2],
    [sx / 2 - tiang / 2, -sz / 2 + tiang / 2],
    [-sx / 2 + tiang / 2, sz / 2 - tiang / 2],
    [sx / 2 - tiang / 2, sz / 2 - tiang / 2],
  ];

  return (
    <group
      position={block.position}
      rotation={[0, block.rotationY ?? 0, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={block.size} />
        <BoxSurface bahan={[...BAHAN_PETI]} size={block.size} color={warna} />
      </mesh>

      {sudut.map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]} castShadow receiveShadow>
          {/* Sedikit lebih tinggi daripada petinya, supaya tiangnya menonjol
              di tepi atas dan bawah alih-alih rata dengan papan. */}
          <boxGeometry args={[tiang, sy * 1.01, tiang]} />
          <Surface kind="crate" lebar={tiang} tinggi={sy} color={warna} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Drum logam bertabung, lengkap dengan dua cincin rusuknya.
 *
 * Satu-satunya prop yang bukan kotak, dan itu justru gunanya: di arena yang
 * seluruhnya tersusun dari balok, satu bentuk bundar langsung menjadi penanda
 * tempat. Pemain menyebut sudut arena dengan "di belakang drum" jauh sebelum
 * ia hafal nama petanya.
 *
 * Tabrakannya tetap kotak, mengikuti baloknya. Bagi pemain bedanya nyaris tak
 * terasa — ia berhenti beberapa sentimeter lebih awal di sisi lengkung — dan
 * membuat penyelesai tabrakan mengerti tabung hanya demi itu bukan pertukaran
 * yang sepadan.
 */
export function DrumProp({ block }: { block: MapBlock }) {
  const [sx, sy, sz] = block.size;
  const warna = block.color ?? "#7d7160";

  // Jari-jari diambil dari sisi TERSEMPIT supaya tabungnya tidak pernah
  // menyembul keluar dari kotak tabrakannya.
  const jari = Math.min(sx, sz) / 2;
  const keliling = 2 * Math.PI * jari;

  return (
    <group
      position={block.position}
      rotation={[0, block.rotationY ?? 0, 0]}
    >
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[jari, jari, sy, SISI_TABUNG]} />
        <Surface kind="metal" lebar={keliling} tinggi={sy} color={warna} />
      </mesh>

      {/* Dua cincin rusuk di sepertiga atas dan bawah, seperti drum minyak. */}
      {[sy * 0.22, -sy * 0.22].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <cylinderGeometry
            args={[jari * 1.04, jari * 1.04, sy * 0.07, SISI_TABUNG]}
          />
          <Surface
            kind="metal"
            lebar={keliling}
            tinggi={sy * 0.07}
            color={warna}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pilar beton dengan kaki dan kepala.
 *
 * Batangnya sedikit LEBIH RAMPING daripada baloknya, sedangkan kaki dan
 * kepalanya selebar balok penuh. Urutan itu penting dan bukan kebalikannya:
 * kalau kaki yang menjulur keluar kotak, pemain akan berdiri menembusnya, dan
 * pilar yang kakinya bisa diinjak dari dalam terasa seperti kerusakan.
 */
export function PillarProp({ block }: { block: MapBlock }) {
  const [sx, sy, sz] = block.size;
  const warna = block.color ?? "#756a5b";

  const ramping = 0.82;
  const bx = sx * ramping;
  const bz = sz * ramping;
  const kaki = sy * 0.06;
  const batang = sy - kaki * 2;

  return (
    <group
      position={block.position}
      rotation={[0, block.rotationY ?? 0, 0]}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[bx, batang, bz]} />
        <Surface kind="pillar" lebar={bx} tinggi={batang} color={warna} />
      </mesh>

      {[-(batang / 2 + kaki / 2), batang / 2 + kaki / 2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[sx, kaki, sz]} />
          <Surface kind="pillar" lebar={sx} tinggi={kaki} color={warna} />
        </mesh>
      ))}
    </group>
  );
}
