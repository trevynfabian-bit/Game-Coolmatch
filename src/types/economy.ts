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
