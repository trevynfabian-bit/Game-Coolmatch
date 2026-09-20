"use client";

import { useMemo } from "react";
import {
  CrateProp,
  DrumProp,
  PillarProp,
} from "@/components/arena/arena-props";
import { BoxSurface } from "@/components/arena/surface-material";
import { tiledTextures, type SurfaceKind } from "@/lib/textures/texture-engine";
import type { ArenaMapInfo, MapBlock } from "@/types/game";

/** Warna balok yang datanya tidak menyebutkan warna sendiri. */
const WARNA_BAWAAN = "#6b6053";

/**
 * Bahan apa yang diwakili tiap jenis balok yang masih berupa kotak polos.
 *
 * Panggung dan tangganya sengaja sama-sama logam. Keduanya memang satu
 * bangunan — panggung berundak di tengah arena — dan memberi tangga bahan yang
 * berbeda dari panggung yang disambungnya membuatnya terbaca sebagai dua benda
 * yang kebetulan bersentuhan. Logam sekaligus memisahkannya dari tembok beton
 * di sekeliling.
 */
const BAHAN_KOTAK: Record<"wall" | "ramp" | "platform", SurfaceKind> = {
  wall: "wall",
  ramp: "metal",
  platform: "metal",
};

/**
 * Balok yang bentuknya memang kotak: tembok, tangga, dan panggung.
 *
 * Ketiganya tetap dirender sebagai kotak karena memang begitulah bentuknya.
 * Memberi tembok siluet yang lebih rumit tidak menambah apa pun selain
 * segitiga — yang menjelaskan sebuah tembok adalah permukaannya, dan itu sudah
 * dikerjakan teksturnya.
 */
function KotakPolos({ block }: { block: MapBlock }) {
  const bahan = BAHAN_KOTAK[block.kind as keyof typeof BAHAN_KOTAK] ?? "wall";
  const sisi = useMemo(
    () => [bahan, bahan, bahan, bahan, bahan, bahan],
    [bahan],
  );

  return (
    <mesh
      position={block.position}
      rotation={[0, block.rotationY ?? 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={block.size} />
      <BoxSurface
        bahan={sisi}
        size={block.size}
        color={block.color ?? WARNA_BAWAAN}
      />
    </mesh>
  );
}

/**
 * Satu penghalang arena, dirender sesuai jenisnya.
 *
 * Peti, drum, dan pilar punya komponen sendiri karena ketiganya punya bentuk;
 * sisanya tetap kotak. Pembagiannya di sini, bukan di dalam tiap prop, supaya
 * ada satu tempat yang bisa dibaca untuk mengetahui jenis mana dirender oleh
 * apa.
 */
function Block({ block }: { block: MapBlock }) {
  switch (block.kind) {
    case "crate":
      return <CrateProp block={block} />;
    case "drum":
      return <DrumProp block={block} />;
    case "pillar":
      return <PillarProp block={block} />;
    default:
      return <KotakPolos block={block} />;
  }
}

/**
 * Merender geometri statis arena: lantai bertekstur dan seluruh penghalang
 * dari `ArenaMapInfo`.
 *
 * Garis petak drei yang dulu melayang di atas lantai sudah dilepas. Ia dipasang
 * ketika lantainya masih bidang warna polos dan pemain butuh sesuatu untuk
 * mengukur jarak; sekarang lantainya sendiri berlempeng dan bernat, jadi garis
 * itu hanya menumpuk kisi kedua di atas kisi yang sudah ada — dan kisi yang
 * terang benderang di lantai beton justru yang paling cepat membuat arena
 * terlihat seperti papan rancangan alih-alih tempat.
 */
export function ArenaMap({ map }: { map: ArenaMapInfo }) {
  const [width, depth] = map.floorSize;
  const lantai = useMemo(
    () => tiledTextures("floor", width, depth),
    [width, depth],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={map.floorColor}
          map={lantai?.map ?? null}
          roughnessMap={lantai?.roughnessMap ?? null}
          roughness={1}
        />
      </mesh>

      {map.blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </group>
  );
}
