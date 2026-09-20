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
  /** Kill pada ronde yang sedang berjalan; dinolkan tiap ronde baru. */
  roundKills: number;
  /** Jumlah ronde yang dimenangkan sepanjang pertandingan. */
  roundWins: number;
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

/**
 * warmup: ronde belum dimulai.
 * live: sedang bertanding.
 * intermission: ronde baru saja selesai, menunggu ronde berikutnya.
 * ended: seluruh pertandingan selesai.
 */
export type RoundStatus = "warmup" | "live" | "intermission" | "ended";

export interface RoundState {
  current: number;
  total: number;
  secondsLeft: number;
  /** Lama satu ronde penuh, dipakai saat menyetel ulang timer. */
  durationSeconds: number;
  /** Jeda antar ronde, dalam detik. */
  intermissionSeconds: number;
  /** Jumlah kill dalam satu ronde yang mengakhiri ronde lebih cepat. */
  scoreLimit: number;
  status: RoundStatus;
  /** Nama pemenang ronde terakhir; null selagi ronde berjalan. */
  lastRoundWinner: string | null;
  /** Nama pemenang pertandingan; terisi hanya saat status `ended`. */
  matchWinner: string | null;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  victimName: string;
  weaponName: string;
  isHeadshot: boolean;
  /**
   * Bacaan jam ronde saat kejadian, sekadar informasi. Urutan feed mengikuti
   * posisi array (terbaru di depan), bukan angka ini.
   */
  atSecond: number;
}

/** Satu balok penghalang di arena (dinding, krat, ramp, atau pilar). */
export interface MapBlock {
  id: string;
  kind: "wall" | "crate" | "drum" | "ramp" | "pillar" | "platform";
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

/**
 * Pencahayaan khas sebuah peta.
 *
 * Ditaruh pada datanya, bukan pada kanvas, karena cahaya itulah yang paling
 * menentukan sebuah arena terasa di mana. Ketiga peta punya bentuk yang jelas
 * berbeda, tetapi dengan satu matahari senja yang sama untuk semuanya, pabrik
 * tertutup dan atap gedung malam hari sama-sama terlihat seperti gudang.
 */
/**
 * Satu lampu yang benar-benar BERDIRI di dalam arena.
 *
 * Keempat sumber global sebuah peta menerangi semuanya sama rata: sebuah sudut
 * gelap tetap segelap sudut di seberangnya, dan tidak ada satu pun tempat yang
 * terang karena ada sesuatu di situ yang menerangi. Lampu inilah yang membuat
 * arena punya tempat — kolam terang yang bisa dihindari, dan bayangan di
 * luarnya yang bisa ditunggui.
 *
 * Tidak satu pun berbayang. Tiap lampu berbayang berarti satu render peta
 * bayangan lagi per frame, dan enam lampu berbayang akan menghabiskan lebih
 * banyak daripada seluruh sisa arena digabung.
 */
export interface MapLamp {
  id: string;
  position: Vec3;
  color: string;
  intensity: number;
  /** Jangkauan cahaya dalam satuan dunia; di luar itu lampu tidak berpengaruh. */
  distance: number;
  /**
   * Jari-jari bola lampu yang ikut digambar. Nol berarti sumbernya tidak
   * terlihat — dipakai untuk cahaya yang datang dari luar arena, seperti
   * pantulan lampu kota di atap.
   */
  bulb: number;
}

export interface MapLighting {
  /** Cahaya langit-ke-tanah: warna atas, warna pantulan bawah, lalu kuatnya. */
  skyLight: string;
  groundLight: string;
  hemisphereIntensity: number;
  /** Cahaya rata tanpa arah. Naik di ruang tertutup, turun di luar saat malam. */
  ambientIntensity: number;
  /** Sumber utama — matahari, bulan, atau lampu langit-langit — yang berbayang. */
  key: {
    color: string;
    intensity: number;
    position: Vec3;
    /**
     * Kotak dunia yang dicakup peta bayangan. Mengikuti bentuk peta: arena
     * persegi butuh kotak seimbang, lorong panjang butuh kotak yang memanjang
     * ke satu arah, dan yang kesempitan membuat bayangan terpotong.
     */
    shadowBox: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      far: number;
    };
  };
  /** Isian dari arah berlawanan, tanpa bayangan: sisi gelap tidak jadi hitam pekat. */
  fill: { color: string; intensity: number; position: Vec3 };
  /** Lampu yang berdiri di dalam arena. Kosong berarti hanya sumber global. */
  lamps?: MapLamp[];
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
  /**
   * Jarak kabut mulai menebal dan jarak ia menutup penuh, dalam satuan dunia.
   *
   * Ikut peta karena ukurannya berbeda jauh: nilai tetap yang pas di arena 45
   * satuan hampir tidak terlihat di lorong 37 satuan, dan memotong pandangan
   * di atap 53 satuan yang justru dijual sebagai peta berjarak pandang
   * terjauh.
   */
  fogRange: [near: number, far: number];
  floorColor: string;
  lighting: MapLighting;
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

/**
 * Perolehan akhir satu peserta pertandingan yang sudah selesai, pemain maupun
 * bot. Bentuknya mengikuti tabel `match_scores`: namanya disimpan apa adanya,
 * bukan sebagai acuan ke `players`, sebab bot tidak punya baris di tabel itu
 * dan nama pemain bisa berubah tanpa membuat catatan lama jadi salah.
 */
export interface MatchScoreLine {
  id: string;
  participantName: string;
  isBot: boolean;
  /** Benar untuk pemain yang bermain di perangkat ini. */
  isLocal: boolean;
  kills: number;
  deaths: number;
  score: number;
  roundWins: number;
  isWinner: boolean;
  /** Warna penanda, sama dengan yang dipakai petarung ini di arena. */
  color: string;
}

/** Hasil akhir pertandingan dari sudut pandang pemain; sama dengan kolom `result`. */
export type MatchResult = "menang" | "kalah" | "seri" | "ditinggal";

/** Sebab sebuah ronde berakhir; sama dengan kolom `ended_reason`. */
export type RoundEndReason = "batas_kill" | "waktu_habis" | "ditinggal";

/**
 * Hasil satu ronde di dalam sebuah pertandingan, mengikuti tabel
 * `match_rounds`. `winnerName` yang kosong berarti ronde itu berakhir seri —
 * tidak ada yang unggul, sehingga ronde itu tidak diberikan kepada siapa pun.
 */
export interface MatchRoundResult {
  roundNumber: number;
  winnerName: string | null;
  endedReason: RoundEndReason;
  /** Kill pemain lokal pada ronde ini. */
  playerKills: number;
}

/**
 * Satu pertandingan yang sudah tercatat, gabungan baris `matches` dengan
 * seluruh `match_scores` miliknya. Inilah bentuk yang dibaca halaman skor;
 * ketika layer backend siap, data tiruannya tinggal ditukar respons API yang
 * berbentuk sama.
 */
export interface MatchRecord {
  id: string;
  mapId: string;
  mapName: string;
  difficulty: Difficulty;
  botCount: number;
  totalRounds: number;
  /**
   * Ronde yang benar-benar dimainkan. Bisa lebih sedikit dari `totalRounds`
   * saat gelar sudah terkunci sebelum ronde terakhir.
   */
  roundsPlayed: number;
  scoreLimit: number;
  result: MatchResult;
  /** Kosong bila pertandingan berakhir seri. */
  winnerName: string | null;
  /** Epoch milidetik, sama dengan kolom waktu di database. */
  startedAt: number;
  endedAt: number;
  scores: MatchScoreLine[];
  /** Hasil tiap ronde, urut dari ronde pertama. */
  rounds: MatchRoundResult[];
}
