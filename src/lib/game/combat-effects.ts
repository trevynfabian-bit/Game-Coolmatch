import type { Vec3 } from "@/types/game";

/**
 * Pengelola efek visual kombat: satu tempat yang tahu seluruh kilatan,
 * percikan, dan garis peluru di arena.
 *
 * Sebelumnya tiap efek dimiliki komponen yang memicunya: sistem senjata
 * memegang ref ke komponen efek dan memanggil metodenya langsung. Itu bekerja
 * selama hanya SATU sistem yang mengeluarkan efek — dan berhenti bekerja
 * begitu ada sistem kedua. Musuh yang menembak, ronde yang berganti, atau
 * penanda kena tidak bisa ikut menggambar apa pun tanpa lebih dulu dioper ref
 * yang sama melalui pohon komponen yang tidak ada hubungannya.
 *
 * Di sini efek dikirim sebagai KEJADIAN ke satu antrean bersama. Pengirimnya
 * tidak perlu tahu siapa yang menggambar, dan penggambarnya tidak perlu tahu
 * siapa yang memicu; keduanya bahkan boleh tidak ada — efek yang dikirim saat
 * arena belum terpasang hanya lewat begitu saja tanpa membuat apa pun gagal.
 *
 * Hidup di luar React dengan alasan yang sama seperti keadaan bot dan pemain:
 * tembakan beruntun mengirim puluhan kejadian per detik, dan menyalurkannya
 * lewat state React berarti puluhan render ulang per detik untuk sesuatu yang
 * hanya digambar di dalam loop frame.
 */

export type CombatEffectKind = "tracer" | "percikan" | "moncong" | "getar";

/** Siapa yang menyebabkan efeknya; dipakai membedakan tampilannya. */
export type EffectOwner = "pemain" | "musuh";

interface BaseEffect {
  /** Nomor urut yang selalu naik; dipakai pembaca untuk menandai batas baca. */
  id: number;
  /** Jam halaman saat efek dikirim, detik. */
  at: number;
  owner: EffectOwner;
}

export interface TracerEffect extends BaseEffect {
  kind: "tracer";
  from: Vec3;
  to: Vec3;
}

export interface ImpactEffect extends BaseEffect {
  kind: "percikan";
  at3: Vec3;
  /** Kena badan petarung, bukan dinding atau krat. */
  onFighter: boolean;
}

export interface MuzzleEffect extends BaseEffect {
  kind: "moncong";
  /** Posisi dunia moncongnya; null berarti menempel pada kamera pemain. */
  at3: Vec3 | null;
}

export interface ShakeEffect extends BaseEffect {
  kind: "getar";
  /** Kuat getaran 0..1; penggambarnya yang menentukan artinya dalam piksel. */
  strength: number;
}

export type CombatEffect =
  | TracerEffect
  | ImpactEffect
  | MuzzleEffect
  | ShakeEffect;

/**
 * Kapasitas antrean.
 *
 * Dibatasi supaya frame yang tersendat tidak berubah menjadi kebocoran: saat
 * tab tidak aktif, loop frame berhenti sementara tembakan yang sudah
 * dijadwalkan tetap dikirim. Tanpa batas, antreannya tumbuh sepanjang jeda
 * dan seluruhnya digambar sekaligus pada frame pertama sesudah tab kembali.
 * Yang TERTUA yang dibuang: efek lama memang sudah tidak berguna.
 */
export const EFFECT_QUEUE_CAP = 96;

interface Antrean {
  items: CombatEffect[];
  nextId: number;
  /** Berapa kejadian yang pernah dibuang karena antreannya penuh. */
  dropped: number;
}

const queue: Antrean = { items: [], nextId: 1, dropped: 0 };

/** Kejadian efek tanpa nomor urut dan waktunya — itu diisi di sini. */
export type EffectRequest =
  | { kind: "tracer"; owner?: EffectOwner; from: Vec3; to: Vec3 }
  | { kind: "percikan"; owner?: EffectOwner; at3: Vec3; onFighter: boolean }
  | { kind: "moncong"; owner?: EffectOwner; at3?: Vec3 | null }
  | { kind: "getar"; owner?: EffectOwner; strength: number };

/**
 * Mengirim satu efek ke antrean. Mengembalikan nomor urutnya, yang berguna
 * untuk pengujian dan penelusuran.
 */
export function emitCombatEffect(
  request: EffectRequest,
  now = performance.now() / 1000,
): number {
  const id = queue.nextId++;
  const owner = request.owner ?? "pemain";

  let effect: CombatEffect;
  switch (request.kind) {
    case "tracer":
      effect = {
        id,
        at: now,
        owner,
        kind: "tracer",
        from: request.from,
        to: request.to,
      };
      break;
    case "percikan":
      effect = {
        id,
        at: now,
        owner,
        kind: "percikan",
        at3: request.at3,
        onFighter: request.onFighter,
      };
      break;
    case "moncong":
      effect = {
        id,
        at: now,
        owner,
        kind: "moncong",
        at3: request.at3 ?? null,
      };
      break;
    case "getar":
      effect = {
        id,
        at: now,
        owner,
        kind: "getar",
        // Dijepit di gerbang masuk: penggambarnya tidak perlu mengulang
        // pemeriksaan yang sama, dan nilai ngawur tidak pernah masuk antrean.
        strength: Number.isFinite(request.strength)
          ? Math.min(1, Math.max(0, request.strength))
          : 0,
      };
      break;
  }

  queue.items.push(effect);
  while (queue.items.length > EFFECT_QUEUE_CAP) {
    queue.items.shift();
    queue.dropped++;
  }
  return id;
}

export interface EffectRead {
  /** Kejadian yang belum pernah dibaca pemanggil ini, urut dari yang tertua. */
  events: CombatEffect[];
  /** Batas baca baru, dioper lagi pada pembacaan berikutnya. */
  cursor: number;
}

/**
 * Membaca kejadian yang belum terbaca, ditandai dengan batas baca milik
 * pemanggil.
 *
 * Batas baca dipegang PEMBACA, bukan antrean. Dengan begitu boleh ada lebih
 * dari satu penggambar untuk kejadian yang sama — kilatan moncong di dunia 3D
 * dan penanda di HUD membaca antrean yang sama tanpa saling menghabiskan.
 */
export function readCombatEffects(cursor: number): EffectRead {
  const events = queue.items.filter((item) => item.id > cursor);
  const terakhir = events.length > 0 ? events[events.length - 1].id : cursor;
  return { events, cursor: Math.max(cursor, terakhir) };
}

/**
 * Batas baca terkini tanpa membaca apa pun. Dipakai penggambar yang baru
 * terpasang: efek yang terjadi sebelum ia ada tidak perlu digambar susulan.
 */
export function currentEffectCursor(): number {
  return queue.nextId - 1;
}

/**
 * Membuang kejadian yang sudah lebih tua dari umur tertentu.
 *
 * Dipanggil penggambar sesudah menggambar: kejadian yang sudah lewat masa
 * gambarnya tidak perlu disimpan, dan antrean yang selalu penuh membuat
 * pembacaan berikutnya menyaring lebih banyak daripada yang dibutuhkan.
 */
export function pruneCombatEffects(
  olderThanSeconds: number,
  now = performance.now() / 1000,
): number {
  const batas = now - olderThanSeconds;
  const sebelum = queue.items.length;
  queue.items = queue.items.filter((item) => item.at >= batas);
  return sebelum - queue.items.length;
}

/** Mengosongkan antrean; dipanggil saat pertandingan disusun ulang. */
export function resetCombatEffects() {
  queue.items = [];
  queue.dropped = 0;
  // Nomor urut TIDAK disetel ulang. Penggambar yang masih memegang batas baca
  // lama akan menganggap kejadian baru sebagai kejadian lama bila nomornya
  // mundur, dan efek pertandingan berikutnya tidak akan pernah digambar.
}

/** Berapa kejadian yang sedang mengantre dan berapa yang pernah dibuang. */
export function combatEffectStats(): { pending: number; dropped: number } {
  return { pending: queue.items.length, dropped: queue.dropped };
}
