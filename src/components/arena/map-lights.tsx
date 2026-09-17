"use client";

import type { MapLighting } from "@/types/game";

/**
 * Lampu sebuah peta, disusun dari temanya sendiri.
 *
 * Satu komponen untuk arena dan lorong latihan sekaligus. Sebelumnya keduanya
 * menuliskan susunan lampunya masing-masing, dengan angka yang ditanam di
 * dalam kanvas — sehingga ketiga arena yang bentuknya jelas berbeda tetap
 * disinari matahari senja yang sama, dan pabrik tertutup maupun atap gedung
 * malam hari sama-sama terlihat seperti gudang.
 *
 * Tiga sumber, dan tidak lebih. Cahaya langit-ke-tanah memberi warna dasar,
 * cahaya rata mengangkat sudut yang tidak tersentuh apa pun, dan satu sumber
 * berarah menghasilkan bayangan. Hanya sumber berarah itu yang berbayang:
 * setiap tambahannya berarti satu kali render peta bayangan lagi per frame,
 * dan arena ini harus tetap ringan di browser.
 */
export function MapLights({ lighting }: { lighting: MapLighting }) {
  const { key, fill } = lighting;

  return (
    <>
      <hemisphereLight
        args={[
          lighting.skyLight,
          lighting.groundLight,
          lighting.hemisphereIntensity,
        ]}
      />
      <ambientLight intensity={lighting.ambientIntensity} />
      <directionalLight
        position={key.position}
        intensity={key.intensity}
        color={key.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={key.shadowBox.left}
        shadow-camera-right={key.shadowBox.right}
        shadow-camera-top={key.shadowBox.top}
        shadow-camera-bottom={key.shadowBox.bottom}
        shadow-camera-near={1}
        shadow-camera-far={key.shadowBox.far}
      />
      <directionalLight
        position={fill.position}
        intensity={fill.intensity}
        color={fill.color}
      />
    </>
  );
}
