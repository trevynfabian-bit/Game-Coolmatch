import type { WeaponType } from "@/types/game";

/**
 * Tipe domain ekonomi: toko upgrade, attachment, dan dompet koin.
 *
 * Bentuknya mengikuti tabel yang direncanakan di PRD (weapon_upgrades,
 * attachments, player_upgrades, player_attachments, coin_wallets) supaya data
 * tiruan di fase frontend bisa ditukar respons API tanpa mengubah komponen.
 */

/** Statistik senjata yang bisa ditingkatkan bertahap di toko. */
export type UpgradeStat = "damage" | "accuracy" | "reload";

/** Satu tingkat peningkatan. `bonusPercent` bersifat kumulatif sampai tingkat ini. */
export interface UpgradeTier {
  level: number;
  price: number;
  bonusPercent: number;
}

/** Jalur peningkatan satu statistik untuk satu senjata. */
export interface UpgradeTrack {
  id: string;
  weaponId: string;
  stat: UpgradeStat;
  label: string;
  description: string;
  tiers: UpgradeTier[];
}

/** Slot pemasangan attachment; satu senjata hanya boleh satu per slot. */
export type AttachmentSlot = "laras" | "magasin" | "pegangan" | "bidikan";

/**
 * Pengubah statistik dalam persen. Positif berarti angkanya naik — untuk
 * sebaran, sentakan, dan waktu isi ulang, angka naik berarti LEBIH BURUK.
 */
export interface WeaponModifiers {
  damagePct?: number;
  fireRatePct?: number;
  spreadPct?: number;
  recoilPct?: number;
  reloadPct?: number;
  magazinePct?: number;
}

export interface Attachment {
  id: string;
  name: string;
  slot: AttachmentSlot;
  description: string;
  price: number;
  /** Jenis senjata yang bisa memasangnya. */
  compatibleTypes: WeaponType[];
  modifiers: WeaponModifiers;
}

/** Kepemilikan upgrade dan attachment pemain untuk satu senjata. */
export interface WeaponUpgradeState {
  weaponId: string;
  /** Tingkat yang sudah dibeli per statistik; 0 berarti belum ditingkatkan. */
  levels: Record<UpgradeStat, number>;
  ownedAttachmentIds: string[];
  equipped: Partial<Record<AttachmentSlot, string>>;
}

export interface Wallet {
  balance: number;
  lifetimeEarned: number;
}

/** Jenis mutasi koin; sama dengan kolom `coin_transactions.kind`. */
export type CoinTransactionKind =
  | "pertandingan"
  | "bonus_kill"
  | "bonus_ronde"
  | "bonus_killstreak"
  | "beli_upgrade"
  | "beli_attachment"
  | "beli_skin"
  | "buka_hadiah"
  | "koreksi";

/** Satu baris riwayat koin, bentuknya sama dengan respons /api/koin/riwayat. */
export interface CoinTransaction {
  id: number;
  kind: CoinTransactionKind;
  /** Positif untuk koin masuk, negatif untuk koin keluar. */
  amount: number;
  balanceAfter: number;
  sourceType: string | null;
  sourceId: string | null;
  note: string;
  createdAt: number;
}

/** Tingkat kelangkaan skin, dari yang paling mudah didapat sampai paling mewah. */
export type SkinRarity = "umum" | "langka" | "epik" | "gold";

/** Pola cat skin; semuanya digambar prosedural tanpa berkas gambar. */
export type SkinPattern = "polos" | "loreng" | "digital" | "garis" | "bendera" | "logam";

export interface Skin {
  id: string;
  name: string;
  rarity: SkinRarity;
  pattern: SkinPattern;
  /** Palet warna pola, dari warna dasar ke aksen. */
  colors: string[];
  /** Untuk camo bertema negara. */
  country: { code: string; name: string } | null;
  description: string;
  price: number;
}

/** Skin yang dimiliki pemain dan skin yang terpasang per senjata. */
export interface SkinCollection {
  ownedSkinIds: string[];
  /** weaponId → skinId. Senjata tanpa entri memakai cat pabrik. */
  equipped: Record<string, string>;
}
