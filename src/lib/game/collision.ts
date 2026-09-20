import type { ArenaBounds, ArenaMapInfo, MapBlock } from "@/types/game";

/**
 * Sudut sebuah balok yang diputar, pada bidang XZ, urut berkeliling.
 *
 * Disimpan bersama kotak pembungkusnya, bukan menggantikannya. Kotak itu tetap
 * berguna sebagai saringan kasar yang murah — mayoritas penghalang tidak
 * diputar sama sekali, dan yang diputar pun hampir selalu jauh dari pemain.
 */
export type Footprint = [number, number][];

/** Kotak sejajar sumbu dalam koordinat dunia. */
export interface Aabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /**
   * Tapak sebenarnya, hanya diisi untuk balok yang DIPUTAR.
   *
   * Tanpa ini, krat berukuran tiga satuan yang diputar tiga puluh derajat
   * mendapat kotak pembungkus selebar 3,78 satuan — hampir empat puluh
   * sentimeter tembok tak terlihat di tiap sisinya. Pemain menabrak sesuatu
   * yang jelas-jelas tidak ada di layar, dan tidak punya cara menebak di mana
   * sebenarnya batasnya.
   */
  footprint?: Footprint;
  /**
   * Keterangan balok aslinya, hanya diisi untuk balok yang diputar.
   *
   * Dipakai uji sinar peluru. Tapak di atas menjawab pertanyaan "di mana
   * batasnya pada ketinggian ini", yang cukup untuk mendorong pemain; peluru
   * datang dari arah mana pun dan butuh balok utuh, bukan potongannya.
   */
  oriented?: { cx: number; cz: number; hx: number; hz: number; rot: number };
}

/** Jarak aman agar pemain tidak menempel persis di permukaan dan tersangkut. */
const SKIN = 0.001;

/**
 * Mengubah satu balok peta menjadi AABB dunia. Balok yang diputar pada sumbu Y
 * diperlebar ke kotak pembungkusnya — cukup akurat untuk arena kotak-kotak dan
 * jauh lebih murah daripada tabrakan berorientasi.
 */
function blockToAabb(block: MapBlock): Aabb {
  const [cx, cy, cz] = block.position;
  const [sx, sy, sz] = block.size;
  let hx = sx / 2;
  let hz = sz / 2;

  const rot = block.rotationY ?? 0;
  let footprint: Footprint | undefined;

  if (rot !== 0) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    footprint = (
      [
        [-hx, -hz],
        [hx, -hz],
        [hx, hz],
        [-hx, hz],
      ] as Footprint
    ).map(([lx, lz]) => [cx + lx * cos - lz * sin, cz + lx * sin + lz * cos]);

    const absCos = Math.abs(cos);
    const absSin = Math.abs(sin);
    const rx = hx * absCos + hz * absSin;
    const rz = hx * absSin + hz * absCos;
    hx = rx;
    hz = rz;
  }

  return {
    footprint,
    oriented:
      rot === 0
        ? undefined
        : { cx, cz, hx: sx / 2, hz: sz / 2, rot },
    minX: cx - hx,
    minY: cy - sy / 2,
    minZ: cz - hz,
    maxX: cx + hx,
    maxY: cy + sy / 2,
    maxZ: cz + hz,
  };
}

/** Semua penghalang solid sebuah peta, siap dipakai penyelesai tabrakan. */
export function buildColliders(map: ArenaMapInfo): Aabb[] {
  return map.blocks.map(blockToAabb);
}

export interface PlayerBounds {
  /** Jari-jari badan pemain pada bidang XZ. */
  radius: number;
  /** Tinggi total badan pemain dari telapak kaki. */
  height: number;
  /** Tinggi undakan yang masih bisa dinaiki tanpa melompat. */
  stepHeight: number;
}

export interface PlayerPosition {
  x: number;
  /** Ketinggian telapak kaki, bukan mata. */
  y: number;
  z: number;
}

/** Kotak pemain pada suatu posisi telapak kaki. */
function playerAabb(pos: PlayerPosition, bounds: PlayerBounds): Aabb {
  return {
    minX: pos.x - bounds.radius,
    minY: pos.y,
    minZ: pos.z - bounds.radius,
    maxX: pos.x + bounds.radius,
    maxY: pos.y + bounds.height,
    maxZ: pos.z + bounds.radius,
  };
}

/**
 * Memotong sebuah poligon cembung dengan satu setengah-bidang sejajar sumbu.
 *
 * Dipakai dua kali untuk mengurung tapak ke dalam pita yang ditempati badan
 * pemain. Yang tersisa sesudahnya adalah bagian penghalang yang benar-benar
 * berhadapan dengan pemain, dan hanya bagian itulah yang boleh mendorongnya.
 */
function clipHalfPlane(
  poly: Footprint,
  sumbu: 0 | 1,
  batas: number,
  simpanYangLebihBesar: boolean,
): Footprint {
  const didalam = (t: [number, number]) =>
    simpanYangLebihBesar ? t[sumbu] >= batas : t[sumbu] <= batas;
  const hasil: Footprint = [];

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = didalam(a);
    const bIn = didalam(b);

    if (aIn) hasil.push(a);
    if (aIn !== bIn) {
      const t = (batas - a[sumbu]) / (b[sumbu] - a[sumbu]);
      hasil.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return hasil;
}

/**
 * Rentang tapak pada satu sumbu, dibatasi pita yang ditempati pemain pada
 * sumbu lainnya. Null berarti keduanya sama sekali tidak berhadapan.
 */
function rentangDalamPita(
  footprint: Footprint,
  sumbuPita: 0 | 1,
  pitaMin: number,
  pitaMax: number,
): [number, number] | null {
  let poly = clipHalfPlane(footprint, sumbuPita, pitaMin, true);
  if (poly.length === 0) return null;
  poly = clipHalfPlane(poly, sumbuPita, pitaMax, false);
  if (poly.length === 0) return null;

  const lain = sumbuPita === 0 ? 1 : 0;
  const nilai = poly.map((t) => t[lain]);
  return [Math.min(...nilai), Math.max(...nilai)];
}

/**
 * Benar bila badan pemain benar-benar bersinggungan dengan sebuah penghalang.
 *
 * Kotak pembungkus dipakai lebih dulu sebagai saringan murah; hanya penghalang
 * yang lolos saringan itu dan kebetulan diputar yang diuji terhadap tapak
 * sebenarnya.
 */
function overlapsExact(box: Aabb, collider: Aabb): boolean {
  if (!overlaps(box, collider)) return false;
  if (!collider.footprint) return true;

  const rentang = rentangDalamPita(
    collider.footprint,
    1,
    box.minZ + SKIN,
    box.maxZ - SKIN,
  );
  if (!rentang) return false;
  return rentang[0] < box.maxX - SKIN && rentang[1] > box.minX + SKIN;
}

function overlaps(a: Aabb, b: Aabb): boolean {
  return (
    a.minX < b.maxX - SKIN &&
    a.maxX > b.minX + SKIN &&
    a.minY < b.maxY - SKIN &&
    a.maxY > b.minY + SKIN &&
    a.minZ < b.maxZ - SKIN &&
    a.maxZ > b.minZ + SKIN
  );
}

/**
 * Rentang sebuah penghalang pada satu sumbu, sebatas pita yang ditempati
 * pemain pada sumbu lainnya.
 *
 * Untuk penghalang yang tidak diputar ini persis kotaknya. Untuk yang diputar,
 * yang dipakai adalah bagian yang benar-benar berhadapan dengan pemain —
 * sehingga pemain didorong keluar tepat di permukaan yang ia lihat, bukan di
 * sudut kotak pembungkus yang tidak ada wujudnya.
 */
function extentPada(
  collider: Aabb,
  box: Aabb,
  axis: "x" | "z",
): [number, number] {
  const kotak: [number, number] =
    axis === "x" ? [collider.minX, collider.maxX] : [collider.minZ, collider.maxZ];
  if (!collider.footprint) return kotak;

  const sumbuPita = axis === "x" ? 1 : 0;
  const pitaMin = axis === "x" ? box.minZ : box.minX;
  const pitaMax = axis === "x" ? box.maxZ : box.maxX;
  return rentangDalamPita(collider.footprint, sumbuPita, pitaMin, pitaMax) ?? kotak;
}

/**
 * Mendorong pemain keluar dari penghalang pada satu sumbu saja. Menyelesaikan
 * per sumbu inilah yang membuat pemain menyusur dinding, bukan mentok berhenti.
 */
function resolveAxis(
  pos: PlayerPosition,
  axis: "x" | "y" | "z",
  motion: number,
  colliders: Aabb[],
  bounds: PlayerBounds,
): boolean {
  if (motion === 0) return false;
  let hit = false;

  for (const collider of colliders) {
    const box = playerAabb(pos, bounds);
    if (!overlapsExact(box, collider)) continue;
    hit = true;

    if (axis === "x") {
      const [lo, hi] = extentPada(collider, box, "x");
      pos.x =
        motion > 0 ? lo - bounds.radius - SKIN : hi + bounds.radius + SKIN;
    } else if (axis === "z") {
      const [lo, hi] = extentPada(collider, box, "z");
      pos.z =
        motion > 0 ? lo - bounds.radius - SKIN : hi + bounds.radius + SKIN;
    } else {
      pos.y =
        motion > 0
          ? collider.minY - bounds.height - SKIN
          : collider.maxY + SKIN;
    }
  }

  return hit;
}

/** Benar bila ada permukaan solid tepat di bawah telapak kaki. */
function isGrounded(
  pos: PlayerPosition,
  colliders: Aabb[],
  bounds: PlayerBounds,
): boolean {
  if (pos.y <= 0.02) return true;
  const probe = playerAabb({ ...pos, y: pos.y - 0.06 }, bounds);
  return colliders.some((collider) => overlapsExact(probe, collider));
}

export interface MoveInput {
  /** Perpindahan yang diinginkan frame ini, sudah dikali delta time. */
  dx: number;
  dy: number;
  dz: number;
}

export interface MoveOutcome {
  position: PlayerPosition;
  /** Menjadi 0 saat menabrak lantai atau langit-langit. */
  verticalVelocity: number;
  grounded: boolean;
  /** Benar bila gerak mendatar tertahan dinding pada frame ini. */
  blocked: boolean;
}

/**
 * Menggerakkan pemain lalu menyelesaikan tabrakan: vertikal dulu supaya status
 * menjejak tanah diketahui, baru mendatar per sumbu dengan percobaan menaiki
 * undakan bila terhalang. Lantai arena di y = 0 diperlakukan sebagai batas
 * keras sehingga pemain tidak pernah jatuh menembus peta, dan bila `arena`
 * diberikan, posisi akhir dijepit ke dalam kotak area main.
 */
export function clampToArena(
  pos: PlayerPosition,
  arena: ArenaBounds,
  radius: number,
): boolean {
  let clamped = false;

  // Arena yang lebih sempit dari badan pemain akan membuat batas saling silang;
  // pusatkan pemain alih-alih menghasilkan posisi yang tidak masuk akal.
  const minX = arena.minX + radius;
  const maxX = arena.maxX - radius;
  const minZ = arena.minZ + radius;
  const maxZ = arena.maxZ - radius;

  if (minX > maxX) {
    const mid = (arena.minX + arena.maxX) / 2;
    if (pos.x !== mid) {
      pos.x = mid;
      clamped = true;
    }
  } else if (pos.x < minX) {
    pos.x = minX;
    clamped = true;
  } else if (pos.x > maxX) {
    pos.x = maxX;
    clamped = true;
  }

  if (minZ > maxZ) {
    const mid = (arena.minZ + arena.maxZ) / 2;
    if (pos.z !== mid) {
      pos.z = mid;
      clamped = true;
    }
  } else if (pos.z < minZ) {
    pos.z = minZ;
    clamped = true;
  } else if (pos.z > maxZ) {
    pos.z = maxZ;
    clamped = true;
  }

  return clamped;
}

export function movePlayer(
  start: PlayerPosition,
  input: MoveInput,
  verticalVelocity: number,
  colliders: Aabb[],
  bounds: PlayerBounds,
  arena?: ArenaBounds,
): MoveOutcome {
  const pos: PlayerPosition = { ...start };
  let vy = verticalVelocity;

  // --- Vertikal
  pos.y += input.dy;
  const hitVertical = resolveAxis(pos, "y", input.dy, colliders, bounds);
  if (pos.y < 0) {
    pos.y = 0;
  } else if (hitVertical) {
    vy = 0;
  }
  if (pos.y === 0 && vy < 0) vy = 0;

  const grounded = isGrounded(pos, colliders, bounds);

  // --- Mendatar, per sumbu supaya bisa menyusur dinding
  const originX = pos.x;
  const originZ = pos.z;

  pos.x += input.dx;
  const hitX = resolveAxis(pos, "x", input.dx, colliders, bounds);
  pos.z += input.dz;
  const hitZ = resolveAxis(pos, "z", input.dz, colliders, bounds);

  let blocked = hitX || hitZ;

  // --- Naik undakan: ulangi gerak mendatar dari ketinggian satu step.
  if (blocked && grounded && bounds.stepHeight > 0) {
    const stepped: PlayerPosition = {
      x: originX,
      y: pos.y + bounds.stepHeight,
      z: originZ,
    };

    // Batal bila ruang di atas kepala tidak cukup untuk naik.
    const headroom = playerAabb(stepped, bounds);
    const headBlocked = colliders.some((c) => overlaps(headroom, c));

    if (!headBlocked) {
      stepped.x += input.dx;
      resolveAxis(stepped, "x", input.dx, colliders, bounds);
      stepped.z += input.dz;
      resolveAxis(stepped, "z", input.dz, colliders, bounds);

      const gainedFlat =
        Math.hypot(stepped.x - originX, stepped.z - originZ) -
        Math.hypot(pos.x - originX, pos.z - originZ);

      if (gainedFlat > 0.0005) {
        // Turunkan kembali sampai menyentuh permukaan undakan.
        stepped.y -= bounds.stepHeight;
        resolveAxis(stepped, "y", -bounds.stepHeight, colliders, bounds);
        if (stepped.y < 0) stepped.y = 0;

        pos.x = stepped.x;
        pos.y = stepped.y;
        pos.z = stepped.z;
        blocked = false;
      }
    }
  }

  // Jaring pengaman terakhir: apa pun yang terjadi di atas, pemain tetap di
  // dalam kotak area main. Dijalankan paling akhir supaya tidak bisa ditembus
  // oleh langkah naik undakan maupun dorongan keluar penghalang.
  if (arena && clampToArena(pos, arena, bounds.radius)) {
    blocked = true;
  }

  return {
    position: pos,
    verticalVelocity: vy,
    grounded: isGrounded(pos, colliders, bounds),
    blocked,
  };
}
