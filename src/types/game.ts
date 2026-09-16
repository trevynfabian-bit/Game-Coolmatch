/**
 * Tipe domain inti untuk Arena Tembak Simple.
 *
 * Bentuknya sengaja dibuat mengikuti skema database di PRD (players, weapons,
 * maps, matches, match_scores) supaya ketika layer backend menyusul, data
 * tiruan bisa ditukar dengan respons API tanpa mengubah komponen.
 */

export type Vec3 = [x: number, y: number, z: number];

export type WeaponType = "pistol" | "smg" | "rifle" | "shotgun" | "sniper";

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  /** Kerusakan per peluru saat kena badan. */
  damage: number;
  /** Peluru per menit. */
  fireRate: number;
  magazineSize: number;
  reloadSeconds: number;
  /** True untuk senjata otomatis: tahan klik untuk terus menembak. */
  automatic: boolean;
  /** Butir per tarikan pelatuk; lebih dari satu hanya untuk shotgun. */
  pellets: number;
  /** Sebaran dasar dalam derajat saat pemain diam dan tidak menembak. */
  spreadDegrees: number;
  /** Sentakan kamera ke atas per tembakan, dalam derajat. */
  recoilDegrees: number;
  imageUrl: string | null;
}

export type Team = "alpha" | "bravo";

export type Difficulty = "santai" | "normal" | "susah";

/** Satu peserta pertandingan: pemain lokal maupun musuh otomatis. */
export interface Fighter {
  id: string;
  name: string;
  team: Team;
  /** True hanya untuk pemain yang dikendalikan di perangkat ini. */
  isLocal: boolean;
  isBot: boolean;
  health: number;
  maxHealth: number;
  armor: number;
  kills: number;
  deaths: number;
  score: number;
  isAlive: boolean;
  /** Hitung mundur respawn dalam detik; null saat masih hidup. */
  respawnInSeconds: number | null;
  weaponId: string;
  /** Warna penanda di arena dan papan skor. */
  color: string;
  position: Vec3;
  /** Arah hadap dalam radian, dipakai untuk merotasi penanda di arena. */
  rotationY: number;
}

export type RoundStatus = "warmup" | "live" | "ended";

export interface RoundState {
  current: number;
  total: number;
  secondsLeft: number;
  /** Jumlah kill yang mengakhiri ronde lebih cepat. */
  scoreLimit: number;
  status: RoundStatus;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  victimName: string;
  weaponName: string;
  isHeadshot: boolean;
  /** Detik sejak ronde dimulai, dipakai untuk mengurutkan feed. */
  atSecond: number;
}

/** Satu balok penghalang di arena (dinding, krat, ramp, atau pilar). */
export interface MapBlock {
  id: string;
  kind: "wall" | "crate" | "ramp" | "pillar" | "platform";
  position: Vec3;
  size: Vec3;
  rotationY?: number;
  color?: string;
}

/**
 * Kotak area yang boleh ditempati pemain, diukur di permukaan dalam tembok
 * keliling. Jadi jaring pengaman: pemain dijepit ke kotak ini tiap frame
 * sehingga tidak pernah keluar arena walau geometri tembok berubah atau ada
 * celah yang tak sengaja tertinggal.
 */
export interface ArenaBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ArenaMapInfo {
  id: string;
  name: string;
  description: string;
  previewUrl: string | null;
  /** Ukuran lantai arena (panjang x lebar) dalam satuan dunia. */
  floorSize: [width: number, depth: number];
  /** Batas keras area main, dipakai penyelesai tabrakan. */
  playableBounds: ArenaBounds;
  skyColor: string;
  fogColor: string;
  floorColor: string;
  blocks: MapBlock[];
  spawnPoints: Vec3[];
}

/** Potret satu momen pertandingan — sumber tunggal untuk seluruh HUD arena. */
export interface MatchSnapshot {
  matchId: string;
  map: ArenaMapInfo;
  difficulty: Difficulty;
  botCount: number;
  round: RoundState;
  fighters: Fighter[];
  killFeed: KillFeedEntry[];
  ammoInMagazine: number;
  ammoReserve: number;
  /** Ping tiruan, ditampilkan di pojok HUD. */
  pingMs: number;
}
