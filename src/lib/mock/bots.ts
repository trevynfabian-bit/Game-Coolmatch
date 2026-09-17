import { pickSpawnPoint } from "@/lib/game/spawn";
import type { ArenaMapInfo, Fighter, Vec3 } from "@/types/game";

/**
 * Nama, warna, dan senjata bawaan tiap lawan otomatis.
 *
 * Daftarnya tetap dan berurutan, jadi menambah atau mengurangi jumlah musuh
 * tidak mengacak lawan yang sudah dikenal pemain: dua bot pertama selalu Rangga
 * dan Ayu.
 */
const BOT_TEMPLATES = [
  { name: "Bot Rangga", color: "#f97316", weaponId: "wpn-smg-vektor" },
  { name: "Bot Ayu", color: "#f43f5e", weaponId: "wpn-shotgun-badai" },
  { name: "Bot Dimas", color: "#a855f7", weaponId: "wpn-sniper-elang" },
  { name: "Bot Sari", color: "#22c55e", weaponId: "wpn-pistol-p9" },
  { name: "Bot Bima", color: "#eab308", weaponId: "wpn-rifle-garuda" },
  { name: "Bot Nadia", color: "#14b8a6", weaponId: "wpn-smg-vektor" },
  { name: "Bot Reza", color: "#ec4899", weaponId: "wpn-rifle-garuda" },
  { name: "Bot Wulan", color: "#8b5cf6", weaponId: "wpn-shotgun-badai" },
] as const;

/** Jumlah lawan terbanyak yang punya template sendiri. */
export const MAX_BOT_TEMPLATES = BOT_TEMPLATES.length;

/**
 * Berapa banyak lawan yang MUAT di sebuah peta.
 *
 * Dua hal membatasinya: banyaknya template lawan, dan banyaknya titik spawn
 * peta dikurangi satu yang dipesan pemain. Batas kedua itu penting —
 * `pickSpawnPoint` selalu memilih titik kosong selama masih ada, tetapi begitu
 * titik habis ia terpaksa mengembalikan titik yang sudah dipakai dan dua
 * petarung muncul bertumpuk. Peta Gudang Senja punya sembilan titik sehingga
 * kedua batas kebetulan bertemu di angka yang sama, tetapi peta baru dari task
 * pemilihan peta belum tentu begitu, jadi angkanya dihitung dari petanya
 * sendiri, bukan ditulis tetap.
 */
export function maxBotsForMap(map: ArenaMapInfo): number {
  return Math.max(1, Math.min(MAX_BOT_TEMPLATES, map.spawnPoints.length - 1));
}

/**
 * Menyusun daftar lawan otomatis untuk sebuah pertandingan baru.
 *
 * Semua dimulai dari nol — nyawa penuh, belum ada kill maupun mati — karena
 * daftar ini dipakai saat pertandingan BARU dimulai, bukan untuk melanjutkan
 * yang sedang berjalan. Titik spawn dipilih berurutan dengan `pickSpawnPoint`
 * sehingga tiap bot mengambil tempat terjauh dari yang sudah dipesan, dan
 * jumlahnya dijepit ke `maxBotsForMap` supaya tidak pernah ada dua petarung
 * yang berebut satu titik.
 */
export function buildBotRoster(
  count: number,
  map: ArenaMapInfo,
  reservedSpawns: Vec3[] = [],
): Fighter[] {
  const wanted = Math.max(0, Math.min(maxBotsForMap(map), Math.round(count)));
  const taken = [...reservedSpawns];

  return Array.from({ length: wanted }, (_, index) => {
    const template = BOT_TEMPLATES[index];
    const position = pickSpawnPoint(map.spawnPoints, taken);
    taken.push(position);

    return {
      id: `ftr-bot-${index + 1}`,
      name: template.name,
      team: "bravo" as const,
      isLocal: false,
      isBot: true,
      health: 100,
      maxHealth: 100,
      armor: 0,
      kills: 0,
      deaths: 0,
      score: 0,
      roundKills: 0,
      roundWins: 0,
      isAlive: true,
      respawnInSeconds: null,
      weaponId: template.weaponId,
      color: template.color,
      position,
      // Menghadap ke tengah arena, tempat sebagian besar perebutan terjadi.
      // rotationY 0 berarti menghadap -Z, sehingga sudut ke titik (0,0) dari
      // posisi p adalah atan2(px, pz) — bukan versi bernegatif, yang justru
      // membuat bot membelakangi arena.
      rotationY: Math.atan2(position[0], position[2]),
    } satisfies Fighter;
  });
}
