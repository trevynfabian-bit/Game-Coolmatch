import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import type {
  Attachment,
  AttachmentSlot,
  UpgradeStat,
  UpgradeTrack,
} from "@/types/economy";
import type { WeaponType } from "@/types/game";

/**
 * Katalog toko upgrade senjata.
 *
 * Katalog adalah data permainan (seperti daftar senjata), bukan data pemain,
 * jadi didefinisikan di kode dan dipakai bersama: halaman toko membacanya
 * untuk tampilan, server membacanya untuk memeriksa harga saat pembelian.
 * Harga tidak pernah dipercaya dari klien.
 */

export const UPGRADE_STAT_LABEL: Record<UpgradeStat, string> = {
  damage: "Kerusakan",
  accuracy: "Akurasi",
  reload: "Isi ulang",
};

const STAT_DESCRIPTION: Record<UpgradeStat, string> = {
  damage: "Peluru lebih berat: lawan tumbang dengan tembakan lebih sedikit.",
  accuracy: "Laras dipoles: sebaran peluru menyempit, termasuk saat bergerak.",
  reload: "Pegas magasin diganti: isi ulang lebih cepat.",
};

/** Persentase kumulatif per tingkat. Kerusakan sengaja paling kecil karena paling kuat. */
const STAT_BONUS: Record<UpgradeStat, number[]> = {
  damage: [5, 10, 15],
  accuracy: [10, 20, 30],
  reload: [10, 18, 25],
};

/** Harga dasar per jenis senjata; senjata yang lebih langka lebih mahal di-upgrade. */
const TYPE_PRICE: Record<WeaponType, number> = {
  pistol: 60,
  smg: 80,
  rifle: 100,
  shotgun: 110,
  sniper: 130,
};

/** Pengali harga per tingkat: tingkat 2 dua kali lipat, tingkat 3 hampir empat kali. */
const TIER_PRICE_FACTOR = [1, 2, 3.5];

export const UPGRADE_STATS: UpgradeStat[] = ["damage", "accuracy", "reload"];

function buildTracks(): UpgradeTrack[] {
  return MOCK_WEAPONS.flatMap((weapon) =>
    UPGRADE_STATS.map((stat) => ({
      id: `upg-${weapon.id}-${stat}`,
      weaponId: weapon.id,
      stat,
      label: UPGRADE_STAT_LABEL[stat],
      description: STAT_DESCRIPTION[stat],
      tiers: STAT_BONUS[stat].map((bonusPercent, index) => ({
        level: index + 1,
        price: Math.round((TYPE_PRICE[weapon.type] * TIER_PRICE_FACTOR[index]) / 5) * 5,
        bonusPercent,
      })),
    })),
  );
}

export const UPGRADE_TRACKS: UpgradeTrack[] = buildTracks();

export function upgradeTracksFor(weaponId: string): UpgradeTrack[] {
  return UPGRADE_TRACKS.filter((track) => track.weaponId === weaponId);
}

export function findUpgradeTrack(weaponId: string, stat: UpgradeStat) {
  return UPGRADE_TRACKS.find((t) => t.weaponId === weaponId && t.stat === stat);
}

export const ATTACHMENT_SLOT_LABEL: Record<AttachmentSlot, string> = {
  laras: "Laras",
  magasin: "Magasin",
  pegangan: "Pegangan",
  bidikan: "Bidikan",
};

export const ATTACHMENT_SLOTS: AttachmentSlot[] = ["laras", "magasin", "pegangan", "bidikan"];

const ALL_TYPES: WeaponType[] = ["pistol", "smg", "rifle", "shotgun", "sniper"];

export const ATTACHMENTS: Attachment[] = [
  {
    id: "att-peredam",
    name: "Peredam",
    slot: "laras",
    description: "Tembakan lebih senyap dan sentakan lebih jinak, dengan sedikit kerusakan yang hilang.",
    price: 150,
    compatibleTypes: ["pistol", "smg", "rifle", "sniper"],
    modifiers: { recoilPct: -15, damagePct: -5 },
  },
  {
    id: "att-laras-panjang",
    name: "Laras Panjang",
    slot: "laras",
    description: "Peluru lebih rapat dan lebih keras, tapi senjata terasa lebih berat.",
    price: 180,
    compatibleTypes: ["smg", "rifle", "shotgun", "sniper"],
    modifiers: { spreadPct: -15, damagePct: 5, reloadPct: 5 },
  },
  {
    id: "att-magasin-besar",
    name: "Magasin Besar",
    slot: "magasin",
    description: "Setengah lagi peluru per magasin, dibayar dengan isi ulang yang lebih lama.",
    price: 160,
    compatibleTypes: ALL_TYPES,
    modifiers: { magazinePct: 50, reloadPct: 15 },
  },
  {
    id: "att-magasin-cepat",
    name: "Magasin Cepat",
    slot: "magasin",
    description: "Magasin berpegangan tarik: isi ulang jauh lebih singkat.",
    price: 140,
    compatibleTypes: ALL_TYPES,
    modifiers: { reloadPct: -25 },
  },
  {
    id: "att-pegangan-vertikal",
    name: "Pegangan Vertikal",
    slot: "pegangan",
    description: "Tangan depan lebih mantap: sentakan berkurang banyak.",
    price: 130,
    compatibleTypes: ["smg", "rifle", "shotgun"],
    modifiers: { recoilPct: -25 },
  },
  {
    id: "att-teropong-refleks",
    name: "Teropong Refleks",
    slot: "bidikan",
    description: "Titik bidik jelas untuk jarak menengah; sebaran sedikit menyempit.",
    price: 120,
    compatibleTypes: ["pistol", "smg", "rifle"],
    modifiers: { spreadPct: -10 },
  },
];

export function findAttachment(id: string): Attachment | undefined {
  return ATTACHMENTS.find((item) => item.id === id);
}

export function attachmentsFor(weaponType: WeaponType): Attachment[] {
  return ATTACHMENTS.filter((item) => item.compatibleTypes.includes(weaponType));
}
