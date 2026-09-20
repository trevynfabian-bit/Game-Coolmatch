"use client";

import { useMemo } from "react";
import {
  boxFaceSizes,
  tiledTextures,
  type SurfaceKind,
} from "@/lib/textures/texture-engine";

/**
 * Material bertekstur untuk arena, dipisah dari yang merendernya.
 *
 * Sebelumnya perakitan ini hanya ada di dalam `ArenaMap`. Begitu prop punya
 * bentuk sendiri — drum bertabung, pilar berkaki — masing-masing butuh material
 * yang sama persis, dan menyalinnya berarti kekasaran yang harus satu dan
 * ruang warna peta kekasaran ditulis ulang di tiap berkas. Cukup satu yang
 * lupa untuk membuat satu prop memantul berbeda dari sisa arenanya.
 */

/**
 * Kekasaran material selalu satu.
 *
 * Nilai ini DIKALIKAN dengan peta kekasaran, jadi apa pun selain satu diam-diam
 * menggeser seluruh rentang yang sudah disusun di mesin tekstur — dan logam
 * yang seharusnya setengah mengilap ikut jadi sekasar beton.
 */
const KEKASARAN = 1;
const KELOGAMAN = 0.05;

/**
 * Satu material bertekstur untuk bentuk yang bukan balok — tabung drum,
 * batang pilar, apa pun yang keenam sisinya tidak berdiri sendiri.
 *
 * Ukuran bidangnya diminta sebagai satuan dunia, bukan pengulangan, supaya
 * pemanggilnya tidak perlu tahu berapa satuan yang ditempati satu petak
 * tekstur. Hanya mesin tekstur yang perlu tahu itu.
 */
export function Surface({
  kind,
  lebar,
  tinggi,
  color,
}: {
  kind: SurfaceKind;
  lebar: number;
  tinggi: number;
  color: string;
}) {
  const tekstur = useMemo(
    () => tiledTextures(kind, lebar, tinggi),
    [kind, lebar, tinggi],
  );

  return (
    <meshStandardMaterial
      color={color}
      map={tekstur?.map ?? null}
      roughnessMap={tekstur?.roughnessMap ?? null}
      roughness={KEKASARAN}
      metalness={KELOGAMAN}
    />
  );
}

/**
 * Enam material bertekstur untuk sebuah balok, satu per sisi.
 *
 * Enam, bukan satu, karena satu balok punya enam sisi yang ukurannya berbeda
 * sementara satu tekstur hanya punya satu pengulangan. Memaksakan satu angka
 * membuat sisi tipis sebuah tembok tampil sebagai beton yang tertarik
 * memanjang.
 *
 * `bahan` boleh berisi jenis yang berbeda per sisi. Itu yang dipakai peti:
 * sisi atas dan bawahnya adalah tutup, dan tutup peti dipaku melintang
 * terhadap dinding petinya.
 */
export function BoxSurface({
  bahan,
  size,
  color,
}: {
  bahan: SurfaceKind[];
  size: readonly [number, number, number];
  color: string;
}) {
  const sisi = useMemo(
    () =>
      boxFaceSizes(size).map(([lebar, tinggi], i) =>
        tiledTextures(bahan[i], lebar, tinggi),
      ),
    [bahan, size],
  );

  return (
    <>
      {sisi.map((tekstur, i) => (
        <meshStandardMaterial
          key={i}
          attach={`material-${i}`}
          color={color}
          map={tekstur?.map ?? null}
          roughnessMap={tekstur?.roughnessMap ?? null}
          roughness={KEKASARAN}
          metalness={KELOGAMAN}
        />
      ))}
    </>
  );
}
