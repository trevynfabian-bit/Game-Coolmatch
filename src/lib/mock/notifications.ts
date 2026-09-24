import type { RewardNotification } from "@/types/economy";

const MINUTE = 60 * 1000;
// Jangkar waktu tetap supaya hasil prerender dan hidrasi sama persis.
const ANCHOR = Date.UTC(2026, 8, 24, 10, 0, 0);

/** Notifikasi tiruan untuk fase frontend; nanti diganti respons /api/notifikasi. */
export const MOCK_NOTIFICATIONS: RewardNotification[] = [
  {
    id: 5,
    kind: "koin",
    title: "+180 koin dari pertandingan",
    body: "Menang di Gudang Senja: 20 kill, 3 ronde, killstreak 6.",
    itemId: null,
    amount: 180,
    createdAt: ANCHOR - 2 * MINUTE,
    seenAt: null,
  },
  {
    id: 4,
    kind: "hadiah",
    title: "Serangan Udara terbuka",
    body: "Pasang di loadout hadiah dan panggil dengan tombol 7.",
    itemId: "serangan_udara",
    amount: null,
    createdAt: ANCHOR - 30 * MINUTE,
    seenAt: null,
  },
  {
    id: 3,
    kind: "skin",
    title: "Skin baru: Loreng Hutan",
    body: "Skin langka ini sudah masuk koleksimu.",
    itemId: "skin-loreng-hutan",
    amount: null,
    createdAt: ANCHOR - 3 * 60 * MINUTE,
    seenAt: null,
  },
  {
    id: 2,
    kind: "upgrade",
    title: "Akurasi Garuda AR tingkat 2",
    body: "Sebaran peluru menyempit 20%.",
    itemId: "wpn-rifle-garuda",
    amount: null,
    createdAt: ANCHOR - 26 * 60 * MINUTE,
    seenAt: ANCHOR - 25 * 60 * MINUTE,
  },
  {
    id: 1,
    kind: "senjata",
    title: "Senjata terbuka: Vektor Cepat",
    body: "SMG dengan laju tembak tertinggi kini bisa kamu bawa.",
    itemId: "wpn-smg-vektor",
    amount: null,
    createdAt: ANCHOR - 3 * 24 * 60 * MINUTE,
    seenAt: ANCHOR - 3 * 24 * 60 * MINUTE,
  },
];
