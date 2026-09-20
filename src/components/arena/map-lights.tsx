"use client";

import type { MapLamp, MapLighting } from "@/types/game";

/**
 * Satu lampu di dalam arena, beserta bola lampunya.
 *
 * Bolanya dibuat dari material dasar, bukan material standar. Bola lampu tidak
 * PANTULAN cahaya, ia SUMBERNYA: material standar akan menghitung bagaimana
 * cahaya jatuh padanya, dan hasilnya bola redup yang menggantung di bawah
 * lampu terang — persis kebalikan dari yang seharusnya terlihat.
 */
function Lamp({ lamp }: { lamp: MapLamp }) {
  return (
    <group position={lamp.position}>
      <pointLight
        color={lamp.color}
        intensity={lamp.intensity}
        distance={lamp.distance}
        decay={2}
      />
      {lamp.bulb > 0 && (
        <mesh>
          <sphereGeometry args={[lamp.bulb, 10, 8]} />
          <meshBasicMaterial color={lamp.color} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Lampu sebuah peta, disusun dari temanya sendiri.
 *
 * Satu komponen untuk arena dan lorong latihan sekaligus. Sebelumnya keduanya
 * menuliskan susunan lampunya masing-masing, dengan angka yang ditanam di
 * dalam kanvas — sehingga ketiga arena yang bentuknya jelas berbeda tetap
 * disinari matahari senja yang sama.
 *
 * Tiga sumber GLOBAL, dan tidak lebih: cahaya langit-ke-tanah memberi warna
 * dasar, cahaya rata mengangkat sudut yang tidak tersentuh apa pun, dan satu
 * sumber berarah menghasilkan bayangan. Hanya sumber berarah itu yang
 * berbayang, sebab tiap tambahannya berarti satu render peta bayangan lagi
 * per frame.
 *
 * Di atas ketiganya berdiri lampu-lampu setempat. Sumber global menerangi
 * semuanya sama rata dan karena itu tidak pernah menjadikan satu tempat
 * berbeda dari tempat lain; lampu setempatlah yang memberi arena kolam terang
 * yang bisa dihindari dan bayangan di luarnya yang bisa ditunggui.
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

      {(lighting.lamps ?? []).map((lamp) => (
        <Lamp key={lamp.id} lamp={lamp} />
      ))}
    </>
  );
}
