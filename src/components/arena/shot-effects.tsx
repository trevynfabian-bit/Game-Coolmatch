"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type PointLight,
} from "three";
import {
  currentEffectCursor,
  pruneCombatEffects,
  readCombatEffects,
} from "@/lib/game/combat-effects";
import { EFFECT_POOLS, pickSlot } from "@/lib/game/effect-budget";
import {
  ENEMY_FLASH_SCALE,
  MUZZLE_FLASH,
  enemyFlashSeconds,
  flashFor,
} from "@/lib/game/muzzle-flash";
import {
  IMPACT_STYLE,
  impactFrame,
  tracerFor,
  tracerFrame,
  type ImpactStyle,
  type TracerStyle,
} from "@/lib/game/tracer-style";

/*
  Ukuran kolam tidak ditulis tangan di sini melainkan dihitung dari
  permainannya sendiri — laju tembak, jumlah butir, jumlah musuh terbanyak,
  dan umur tiap efek. Menambah senjata atau memperpanjang umur sebuah efek
  otomatis menaikkan kolamnya, tanpa seorang pun harus ingat menyetelnya.
*/
const TRACER_POOL = EFFECT_POOLS.tracer;
const IMPACT_POOL = EFFECT_POOLS.impact;

/**
 * Kolam kilatan moncong MUSUH di dunia. Beberapa musuh bisa menembak dalam
 * frame yang sama, jadi satu objek saja akan membuat kilatan mereka saling
 * menimpa dan hanya satu arah yang terlihat.
 */
const ENEMY_MUZZLE_POOL = EFFECT_POOLS.enemyMuzzle;
/**
 * Jari-jari bola kilatan musuh sebelum diskalakan per senjata. Bolanya
 * digambar sekali sebesar ini, lalu tiap kilatan menyesuaikan skalanya —
 * dengan begitu lima watak senjata memakai satu geometri yang sama.
 */
const ENEMY_MUZZLE_RADIUS = MUZZLE_FLASH.rifle.radius * ENEMY_FLASH_SCALE;

/** Satu jejak peluru yang sedang hidup. */
interface TracerSlot {
  /** Jam saat tembakannya dilepas, detik. */
  firedAt: number;
  /** Panjang lintasannya, satuan dunia. */
  total: number;
  style: TracerStyle;
  active: boolean;
}

/** Satu kilau tumbukan yang sedang hidup. */
interface ImpactSlot {
  firedAt: number;
  style: ImpactStyle;
  active: boolean;
}

/**
 * Efek visual tembakan: jejak peluru yang tumbuh dari moncong ke titik jatuh,
 * kilau tumbukan, dan kilatan moncong musuh. Semuanya memakai kolam objek
 * tetap yang dihidup-matikan di dalam useFrame, jadi menembak beruntun tidak
 * pernah memicu render ulang React.
 *
 * Apa yang digambar datang dari antrean efek kombat, bukan dari ref yang
 * dipegang sistem senjata. Komponen ini karena itu tidak tahu — dan tidak
 * perlu tahu — siapa yang menembak: pemain, musuh, atau sistem lain yang
 * belum ada. Ia hanya menggambar apa yang masuk antrean.
 *
 * Kilatan moncong PEMAIN tidak digambar di sini: ia menempel di ujung laras
 * viewmodel supaya ikut bergerak bersama ayunan senjatanya.
 */
export function ShotEffects() {
  const tracerRefs = useRef<(Mesh | null)[]>([]);
  const impactRefs = useRef<(Mesh | null)[]>([]);
  const enemyMuzzleRefs = useRef<(Mesh | null)[]>([]);
  const enemyLightRefs = useRef<(PointLight | null)[]>([]);

  const tracerSlots = useRef<TracerSlot[]>(
    Array.from({ length: TRACER_POOL }, () => ({
      firedAt: 0,
      total: 0,
      style: tracerFor("rifle"),
      active: false,
    })),
  );
  const impactSlots = useRef<ImpactSlot[]>(
    Array.from({ length: IMPACT_POOL }, () => ({
      firedAt: 0,
      style: IMPACT_STYLE.world,
      active: false,
    })),
  );
  const enemyMuzzleSlots = useRef(
    Array.from({ length: ENEMY_MUZZLE_POOL }, () => ({
      firedAt: 0,
      expiresAt: 0,
      active: false,
    })),
  );
  /**
   * Batas baca antrean efek. Dimulai dari kejadian TERAKHIR yang sudah ada,
   * bukan dari nol: efek yang terjadi sebelum arena terpasang — misalnya di
   * pertandingan sebelumnya — tidak perlu digambar susulan sekaligus.
   */
  const cursor = useRef(currentEffectCursor());

  const from = useMemo(() => new Vector3(), []);
  const to = useMemo(() => new Vector3(), []);
  const arah = useMemo(() => new Vector3(), []);
  const titik = useMemo(() => new Vector3(), []);

  /**
   * Menyiapkan satu jejak. Arah dan panjangnya dipasang sekali di sini;
   * pertumbuhannya tiap frame hanya mengubah skala dan posisi tengahnya, jadi
   * tidak ada perhitungan arah yang diulang enam puluh kali per detik.
   */
  const spawnTracer = (
    a: readonly number[],
    b: readonly number[],
    weapon: Parameters<typeof tracerFor>[0],
  ) => {
    // Petak yang menganggur didahulukan; bila semua terpakai, yang paling
    // TUA yang dipakai ulang — itulah yang paling dekat ke akhir umurnya.
    const index = pickSlot(tracerSlots.current);
    const mesh = tracerRefs.current[index];
    if (!mesh) return;

    from.set(a[0], a[1], a[2]);
    to.set(b[0], b[1], b[2]);
    const length = from.distanceTo(to);
    if (length < 0.05) return;

    const style = tracerFor(weapon);
    /*
      Posisi dipasang SEBELUM lookAt, dan arahnya disimpan sendiri.
      `lookAt` menghitung putaran dari posisi objek SAAT ITU — memanggilnya
      lebih dulu berarti jejaknya menghadap ke arah yang dihitung dari tempat
      pemakaian slot ini sebelumnya. Arahnya juga tidak dibaca ulang dari
      matriks dunia tiap frame: matriks itu baru diperbarui saat render, jadi
      pada frame pertama ia masih berisi keadaan lama.
    */
    mesh.position.copy(from);
    mesh.lookAt(to);
    mesh.visible = true;
    const material = mesh.material as MeshBasicMaterial;
    material.color.set(style.color);
    material.opacity = style.opacity;

    const slot = tracerSlots.current[index];
    slot.firedAt = performance.now() / 1000;
    slot.total = length;
    slot.style = style;
    slot.active = true;
    arah.subVectors(to, from).normalize();
    mesh.userData.from = [from.x, from.y, from.z];
    mesh.userData.dir = [arah.x, arah.y, arah.z];
  };

  const spawnImpact = (point: readonly number[], onFighter: boolean) => {
    const index = pickSlot(impactSlots.current);
    const mesh = impactRefs.current[index];
    if (!mesh) return;

    const style = onFighter ? IMPACT_STYLE.fighter : IMPACT_STYLE.world;
    mesh.position.set(point[0], point[1], point[2]);
    mesh.scale.setScalar(0.05);
    mesh.visible = true;
    const material = mesh.material as MeshBasicMaterial;
    material.color.set(style.color);
    material.opacity = 1;

    const slot = impactSlots.current[index];
    slot.firedAt = performance.now() / 1000;
    slot.style = style;
    slot.active = true;
  };

  const spawnEnemyMuzzle = (
    point: readonly number[],
    weapon: Parameters<typeof flashFor>[0],
  ) => {
    const index = pickSlot(enemyMuzzleSlots.current);
    const mesh = enemyMuzzleRefs.current[index];
    if (!mesh) return;

    // Watak senjatanya menentukan besar dan terangnya: kilatan sniper harus
    // menjadi petunjuk yang jauh lebih mudah dibaca daripada kilatan SMG.
    const voice = flashFor(weapon);
    mesh.position.set(point[0], point[1], point[2]);
    mesh.scale.setScalar(voice.radius / MUZZLE_FLASH.rifle.radius);
    mesh.visible = true;
    const light = enemyLightRefs.current[index];
    if (light) {
      light.position.set(point[0], point[1], point[2]);
      light.intensity = voice.intensity * ENEMY_FLASH_SCALE;
    }
    const sekarang = performance.now() / 1000;
    enemyMuzzleSlots.current[index] = {
      firedAt: sekarang,
      expiresAt: sekarang + enemyFlashSeconds(weapon),
      active: true,
    };
  };

  useFrame(() => {
    const now = performance.now() / 1000;

    // Kejadian baru sejak frame lalu diubah jadi objek yang terlihat.
    const bacaan = readCombatEffects(cursor.current);
    cursor.current = bacaan.cursor;
    for (const event of bacaan.events) {
      switch (event.kind) {
        case "tracer":
          spawnTracer(event.from, event.to, event.weapon);
          break;
        case "percikan":
          spawnImpact(event.at3, event.onFighter);
          break;
        case "moncong":
          /*
            Hanya kilatan yang punya posisi DUNIA yang digambar di sini —
            itulah kilatan musuh. Kilatan pemain menempel pada ujung laras
            viewmodel dan digambar komponen senjata itu sendiri, supaya ikut
            bergerak bersama ayunannya.
          */
          if (event.at3 !== null) spawnEnemyMuzzle(event.at3, event.weapon);
          break;
        default:
          break;
      }
    }
    /*
      Antrean dibersihkan tiap frame, bukan hanya saat ada kejadian baru.
      Kejadian yang tertinggal membuat tiap pembacaan menyaring lebih banyak
      daripada yang perlu — dan pembacaan itu terjadi enam puluh kali per
      detik oleh beberapa penggambar sekaligus.
    */
    pruneCombatEffects(1, now);

    // --- jejak peluru: tumbuh dari moncong, lalu memudar ---
    for (let i = 0; i < TRACER_POOL; i++) {
      const slot = tracerSlots.current[i];
      if (!slot.active) continue;
      const mesh = tracerRefs.current[i];
      if (!mesh) continue;

      const frame = tracerFrame(slot.total, now - slot.firedAt, slot.style);
      if (frame.done) {
        mesh.visible = false;
        slot.active = false;
        continue;
      }

      // Kotak jejak berpusat di tengah bagian yang sudah terbentuk, jadi
      // ujung belakangnya tetap menempel di moncong selama ia tumbuh.
      const awal = (mesh.userData.from as number[] | undefined) ?? [0, 0, 0];
      const dir = (mesh.userData.dir as number[] | undefined) ?? [0, 0, 1];
      titik
        .set(awal[0], awal[1], awal[2])
        .addScaledVector(arah.set(dir[0], dir[1], dir[2]), frame.head / 2);
      mesh.position.copy(titik);
      mesh.scale.set(1, 1, Math.max(0.001, frame.head));
      (mesh.material as MeshBasicMaterial).opacity = frame.alpha;
    }

    // --- kilau tumbukan: mekar cepat lalu surut ---
    for (let i = 0; i < IMPACT_POOL; i++) {
      const slot = impactSlots.current[i];
      if (!slot.active) continue;
      const mesh = impactRefs.current[i];
      if (!mesh) continue;

      const frame = impactFrame(now - slot.firedAt, slot.style);
      if (frame.done) {
        mesh.visible = false;
        slot.active = false;
        continue;
      }
      mesh.scale.setScalar(frame.scale * (slot.style.radius / 0.1));
      (mesh.material as MeshBasicMaterial).opacity = frame.alpha;
    }

    for (let i = 0; i < ENEMY_MUZZLE_POOL; i++) {
      const slot = enemyMuzzleSlots.current[i];
      if (!slot.active) continue;
      if (now < slot.expiresAt) continue;
      slot.active = false;
      const mesh = enemyMuzzleRefs.current[i];
      if (mesh) mesh.visible = false;
      const light = enemyLightRefs.current[i];
      if (light) light.intensity = 0;
    }
  });

  return (
    <group>
      {Array.from({ length: TRACER_POOL }, (_, i) => (
        <mesh
          key={`tracer-${i}`}
          ref={(node) => {
            tracerRefs.current[i] = node;
          }}
          visible={false}
        >
          <boxGeometry args={[0.036, 0.036, 1]} />
          <meshBasicMaterial color="#ffe8a3" transparent opacity={0.85} />
        </mesh>
      ))}

      {Array.from({ length: IMPACT_POOL }, (_, i) => (
        <mesh
          key={`impact-${i}`}
          ref={(node) => {
            impactRefs.current[i] = node;
          }}
          visible={false}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} />
        </mesh>
      ))}

      {Array.from({ length: ENEMY_MUZZLE_POOL }, (_, i) => (
        <group key={`moncong-musuh-${i}`}>
          <mesh
            ref={(node) => {
              enemyMuzzleRefs.current[i] = node;
            }}
            visible={false}
          >
            <sphereGeometry args={[ENEMY_MUZZLE_RADIUS, 8, 8]} />
            <meshBasicMaterial
              color={MUZZLE_FLASH.rifle.color}
              transparent
              opacity={0.95}
            />
          </mesh>
          <pointLight
            ref={(node) => {
              enemyLightRefs.current[i] = node;
            }}
            intensity={0}
            distance={MUZZLE_FLASH.rifle.distance}
            decay={2}
            color={MUZZLE_FLASH.rifle.color}
          />
        </group>
      ))}
    </group>
  );
}
