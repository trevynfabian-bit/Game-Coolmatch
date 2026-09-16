import type { ArenaMapInfo, MapBlock } from "@/types/game";

/** Kotak sejajar sumbu dalam koordinat dunia. */
export interface Aabb {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
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
  if (rot !== 0) {
    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const rx = hx * cos + hz * sin;
    const rz = hx * sin + hz * cos;
    hx = rx;
    hz = rz;
  }

  return {
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
    if (!overlaps(box, collider)) continue;
    hit = true;

    if (axis === "x") {
      pos.x =
        motion > 0
          ? collider.minX - bounds.radius - SKIN
          : collider.maxX + bounds.radius + SKIN;
    } else if (axis === "z") {
      pos.z =
        motion > 0
          ? collider.minZ - bounds.radius - SKIN
          : collider.maxZ + bounds.radius + SKIN;
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
  return colliders.some((collider) => overlaps(probe, collider));
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
 * keras sehingga pemain tidak pernah jatuh menembus peta.
 */
export function movePlayer(
  start: PlayerPosition,
  input: MoveInput,
  verticalVelocity: number,
  colliders: Aabb[],
  bounds: PlayerBounds,
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

  return {
    position: pos,
    verticalVelocity: vy,
    grounded: isGrounded(pos, colliders, bounds),
    blocked,
  };
}
