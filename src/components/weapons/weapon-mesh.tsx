"use client";

import { WEAPON_SHAPES } from "@/lib/weapons/weapon-shape";
import type { Weapon } from "@/types/game";

/**
 * Model senjata low-poly, dirakit dari proporsi per jenis.
 *
 * Satu model untuk dua pemakai: pratinjau di halaman Pilih Senjata dan
 * senjata yang dipegang musuh di arena. Sebelumnya musuh memegang satu balok
 * gelap yang sama untuk semua jenis, sehingga pemain tidak pernah bisa membaca
 * dari kejauhan apakah yang datang membawa pistol atau senapan runduk —
 * padahal itu informasi yang menentukan apakah ia harus mendekat atau lari.
 *
 * Moncongnya menghadap -Z, mengikuti kebiasaan kamera three.js; pemakai yang
 * "depannya" +Z tinggal membalik pembungkusnya.
 */
export function WeaponMesh({ weapon }: { weapon: Weapon }) {
  const shape = WEAPON_SHAPES[weapon.type];
  const bodyZ = 0;
  const barrelZ = -(shape.bodyLength / 2 + shape.barrelLength / 2);

  return (
    <group>
      <mesh position={[0, 0, bodyZ]} castShadow>
        <boxGeometry args={[shape.bodyHeight * 0.8, shape.bodyHeight, shape.bodyLength]} />
        <meshStandardMaterial color="#5a6675" roughness={0.45} metalness={0.5} />
      </mesh>

      <mesh position={[0, 0, barrelZ]} castShadow>
        <boxGeometry
          args={[shape.barrelThickness, shape.barrelThickness, shape.barrelLength]}
        />
        <meshStandardMaterial color="#39434f" roughness={0.35} metalness={0.65} />
      </mesh>

      {shape.magazineDepth > 0 ? (
        <mesh
          position={[0, -shape.bodyHeight / 2 - shape.magazineDepth / 2 + 0.02, 0.02]}
          rotation={[0.16, 0, 0]}
          castShadow
        >
          <boxGeometry
            args={[shape.bodyHeight * 0.6, shape.magazineDepth, shape.bodyLength * 0.2]}
          />
          <meshStandardMaterial color="#454f5c" roughness={0.6} metalness={0.3} />
        </mesh>
      ) : null}

      <mesh
        position={[0, -shape.bodyHeight / 2 - 0.09, shape.bodyLength * 0.3]}
        rotation={[-0.34, 0, 0]}
        castShadow
      >
        <boxGeometry args={[shape.bodyHeight * 0.55, 0.2, shape.bodyLength * 0.14]} />
        <meshStandardMaterial color="#7a6145" roughness={0.8} metalness={0.05} />
      </mesh>

      {shape.hasStock ? (
        <mesh
          position={[0, -0.01, shape.bodyLength / 2 + 0.11]}
          castShadow
        >
          <boxGeometry args={[shape.bodyHeight * 0.65, shape.bodyHeight * 0.9, 0.22]} />
          <meshStandardMaterial color="#7a6145" roughness={0.8} metalness={0.05} />
        </mesh>
      ) : null}

      {shape.hasScope ? (
        <mesh position={[0, shape.bodyHeight / 2 + 0.06, -0.05]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 12]} />
          <meshStandardMaterial color="#323b47" roughness={0.3} metalness={0.7} />
        </mesh>
      ) : null}

      <mesh position={[0, shape.bodyHeight / 2 + 0.03, shape.bodyLength * 0.18]}>
        <boxGeometry args={[0.03, 0.045, 0.1]} />
        <meshStandardMaterial
          color={shape.accent}
          emissive={shape.accent}
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
