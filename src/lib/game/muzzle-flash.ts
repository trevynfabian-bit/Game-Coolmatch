import type { WeaponType } from "@/types/game";

/**
 * Watak kilatan moncong tiap senjata.
 *
 * Kilatan adalah satu-satunya bagian dari tembakan yang terlihat oleh SEMUA
 * pihak: pemain melihatnya di ujung larasnya sendiri, dan lawan melihatnya
 * menyala di kegelapan sebagai satu-satunya petunjuk dari mana peluru datang.
 * Karena itu ia dibedakan per senjata dengan alasan yang sama seperti bunyinya
 * — shotgun harus terlihat berbeda dari SMG bahkan bila keduanya menembak dari
 * balik krat yang sama.
 *
 * Angkanya ditaruh terpisah dari komponen supaya bisa diperiksa tanpa browser,
 * dan supaya kilatan di tangan pemain serta kilatan musuh di kejauhan mustahil
 * berselisih watak: keduanya membaca tabel ini.
 */

export interface MuzzleFlash {
  /** Jari-jari kilatannya dalam satuan dunia. */
  radius: number;
  /** Kuat cahaya yang ikut menerangi sekitarnya. */
  intensity: number;
  /** Lama kilatannya, detik. */
  seconds: number;
  /** Jangkauan cahayanya, satuan dunia. */
  distance: number;
  color: string;
}

export const MUZZLE_FLASH: Record<WeaponType, MuzzleFlash> = {
  // Pistol: kilatan kecil dan singkat.
  pistol: {
    radius: 0.1,
    intensity: 9,
    seconds: 0.045,
    distance: 7,
    color: "#fff0bd",
  },
  // SMG: paling kecil dan paling singkat — ia menembak paling sering, dan
  // kilatan besar yang berulang sepuluh kali per detik menutupi layar.
  smg: {
    radius: 0.085,
    intensity: 7,
    seconds: 0.035,
    distance: 6,
    color: "#fff4cc",
  },
  rifle: {
    radius: 0.12,
    intensity: 12,
    seconds: 0.05,
    distance: 9,
    color: "#fff2c4",
  },
  // Shotgun: paling lebar, mekarnya paling terlihat.
  shotgun: {
    radius: 0.2,
    intensity: 17,
    seconds: 0.07,
    distance: 12,
    color: "#ffe2a0",
  },
  // Sniper: paling terang dan paling lama, terlihat dari seberang arena —
  // itulah harga menembak dari kejauhan.
  sniper: {
    radius: 0.17,
    intensity: 20,
    seconds: 0.085,
    distance: 14,
    color: "#fff6d8",
  },
};

/** Watak kilatan sebuah senjata; jenis tak dikenal memakai watak senapan serbu. */
export function flashFor(type: WeaponType | null | undefined): MuzzleFlash {
  if (!type) return MUZZLE_FLASH.rifle;
  return MUZZLE_FLASH[type] ?? MUZZLE_FLASH.rifle;
}

/**
 * Ujung laras pada model senjata sudut pandang orang pertama, dalam koordinat
 * lokal grup senjatanya.
 *
 * Ditulis sebagai angka di sini, bukan ditebak di tempat kilatannya digambar.
 * Kilatan yang melayang sedikit di depan atau di atas laras adalah cacat yang
 * langsung terlihat — dan itulah yang terjadi sebelumnya, saat posisinya
 * ditulis terpisah dari model senjatanya.
 */
export const BARREL_TIP: [number, number, number] = [0, 0.005, -0.9];

/**
 * Pembesaran kilatan MUSUH terhadap kilatan senjata yang sama di tangan
 * pemain, beserta perpanjangan umurnya.
 *
 * Kilatan pemain berada sejengkal dari mata dan memenuhi sebagian layar;
 * kilatan musuh berada dua puluh meter jauhnya dan, pada ukuran yang sama,
 * hanya selebar beberapa piksel selama sepersepuluh detik — artinya tidak
 * terlihat sama sekali. Padahal justru di situlah gunanya: ia satu-satunya
 * petunjuk dari mana peluru datang. Karena itu ia dibesarkan dan ditahan
 * lebih lama, sengaja melanggar skala demi keterbacaan.
 */
export const ENEMY_FLASH_SCALE = 2.6;
/**
 * Perpanjangan umur kilatan musuh terhadap kilatan senjatanya sendiri.
 *
 * Tidak boleh sembarang panjang: kilatan yang bertahan lebih lama daripada
 * jeda tembak senjatanya akan menyala tanpa putus sepanjang rentetan, dan
 * yang terlihat bukan lagi tembakan melainkan lampu. Angka ini dipilih
 * sebagai yang terpanjang yang masih lebih pendek daripada jeda tembak
 * senjata tercepat.
 */
export const ENEMY_FLASH_STRETCH = 1.8;

/** Lama kilatan musuh untuk sebuah senjata, detik. */
export function enemyFlashSeconds(type: WeaponType | null | undefined): number {
  return flashFor(type).seconds * ENEMY_FLASH_STRETCH;
}

/**
 * Seberapa jauh kilatan musuh berada di depan dadanya, satuan dunia. Kilatan
 * yang tepat di badan terlihat seperti musuh yang bercahaya; yang sedikit di
 * depan terbaca sebagai moncong senjata.
 */
export const ENEMY_MUZZLE_FORWARD = 0.55;
