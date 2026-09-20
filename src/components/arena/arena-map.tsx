"use client";

import { useMemo } from "react";
import {
  boxFaceSizes,
  tiledTextures,
  type SurfaceKind,
} from "@/lib/textures/texture-engine";
import type { ArenaMapInfo, MapBlock } from "@/types/game";

/** Warna balok yang datanya tidak menyebutkan warna sendiri. */
const WARNA_BAWAAN = "#6b6053";

/**
 * Bahan apa yang diwakili tiap jenis balok.
 *
 * Panggung dan tangganya sengaja sama-sama logam. Keduanya memang satu
 * bangunan — panggung berundak di tengah arena — dan memberi tangga bahan
 * yang berbeda dari panggung yang disambungnya membuatnya terbaca sebagai dua
 * benda yang kebetulan bersentuhan. Logam sekaligus memisahkannya dari tembok
 * beton di sekeliling, dan titik rebutan utama arena memang pantas terlihat
 * berbeda dari kejauhan.
 */
const BAHAN: Record<MapBlock["kind"], SurfaceKind> = {
  wall: "wall",
  crate: "crate",
  pillar: "pillar",
  platform: "metal",
  ramp: "metal",
};

/**
 * Bahan keenam sisi sebuah balok, urut seperti yang diminta BoxGeometry:
 * +X, -X, +Y, -Y, +Z, -Z.
 *
 * Hampir semua balok memakai satu bahan untuk semua sisinya. Peti tidak: sisi
 * atas dan bawahnya adalah TUTUP, dan tutup peti dipaku melintang terhadap
 * dinding petinya. Memakai gambar sisi untuk tutup menaruh sabuk yang
 * semestinya melingkari peti jadi tergeletak membelah tutupnya.
 */
function bahanSisi(kind: MapBlock["kind"]): SurfaceKind[] {
  const dasar = BAHAN[kind];
  if (kind !== "crate") return [dasar, dasar, dasar, dasar, dasar, dasar];
  return ["crate", "crate", "crateTop", "crateTop", "crate", "crate"];
}

/**
 * Satu balok penghalang, bertekstur per sisi.
 *
 * Enam material, bukan satu, karena satu balok punya enam sisi yang ukurannya
 * berbeda sementara satu tekstur hanya punya satu pengulangan. Tembok sepanjang
 * dua puluh satuan dan setebal setengah satuan memakai angka yang sama untuk
 * kedua sisi itu akan menampilkan sisi tipisnya sebagai beton yang tertarik
 * memanjang — melar dan langsung terlihat justru karena berbeda dari sisi di
 * sebelahnya.
 *
 * Warna balok tetap dari datanya. Teksturnya abu-abu dan dikalikan dengan warna
 * itu, jadi palet tiap peta — gudang senja kecokelatan, pabrik kebiruan —
 * masih yang menentukan rasa arenanya.
 */
function Block({ block }: { block: MapBlock }) {
  const sisi = useMemo(() => {
    const bahan = bahanSisi(block.kind);
    return boxFaceSizes(block.size).map(([lebar, tinggi], i) =>
      tiledTextures(bahan[i], lebar, tinggi),
    );
  }, [block.kind, block.size]);

  return (
    <mesh
      position={block.position}
      rotation={[0, block.rotationY ?? 0, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={block.size} />
      {sisi.map((tekstur, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          color={block.color ?? WARNA_BAWAAN}
          map={tekstur?.map ?? null}
          roughnessMap={tekstur?.roughnessMap ?? null}
          /*
            Satu, bukan angka per jenis bahan. Nilai ini DIKALIKAN dengan peta
            kekasaran, jadi apa pun selain satu diam-diam menggeser seluruh
            rentang yang sudah disusun di mesin tekstur — dan logam yang
            seharusnya setengah mengilap ikut jadi sekasar beton.
          */
          roughness={1}
          metalness={0.05}
        />
      ))}
    </mesh>
  );
}

/**
 * Merender geometri statis arena: lantai bertekstur dan seluruh balok
 * penghalang dari `ArenaMapInfo`.
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
