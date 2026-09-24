import type { Skin, SkinRarity } from "@/types/economy";

/**
 * Katalog skin & camo. Seperti katalog upgrade, ini data permainan di kode:
 * toko membacanya untuk tampilan dan server memakainya untuk memeriksa harga.
 *
 * Tiap skin hanya palet warna + nama pola; gambarnya dibuat prosedural
 * (SVG di halaman, tekstur kanvas di 3D) sehingga tidak ada aset eksternal.
 * Skin dibeli sekali lalu bisa dipasang di senjata mana pun.
 */

export const RARITY_ORDER: SkinRarity[] = ["umum", "langka", "epik", "gold"];

export const RARITY_META: Record<SkinRarity, { label: string; color: string; glow: string }> = {
  umum: { label: "Umum", color: "#94a3b8", glow: "rgba(148,163,184,0.25)" },
  langka: { label: "Langka", color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  epik: { label: "Epik", color: "#c084fc", glow: "rgba(192,132,252,0.35)" },
  gold: { label: "Gold", color: "#fbbf24", glow: "rgba(251,191,36,0.45)" },
};

export const SKINS: Skin[] = [
  // Umum — warna polos.
  { id: "skin-arang", name: "Arang", rarity: "umum", pattern: "polos", colors: ["#2b2f36", "#3b414b"], country: null, description: "Hitam doff yang tidak memantulkan cahaya.", price: 80 },
  { id: "skin-pasir", name: "Pasir", rarity: "umum", pattern: "polos", colors: ["#b99a6b", "#cdb286"], country: null, description: "Krem hangat ala perlengkapan gurun.", price: 90 },
  { id: "skin-zaitun", name: "Zaitun", rarity: "umum", pattern: "polos", colors: ["#56613f", "#6b7750"], country: null, description: "Hijau militer klasik.", price: 90 },
  { id: "skin-laut", name: "Laut Dalam", rarity: "umum", pattern: "garis", colors: ["#1e3a5f", "#27507f"], country: null, description: "Biru tua dengan garis tipis.", price: 120 },

  // Langka — camo.
  { id: "skin-loreng-hutan", name: "Loreng Hutan", rarity: "langka", pattern: "loreng", colors: ["#3f4a2c", "#5b6b3a", "#2a2f1f", "#7c7a4c"], country: null, description: "Bercak hijau dan cokelat untuk semak lebat.", price: 260 },
  { id: "skin-loreng-gurun", name: "Loreng Gurun", rarity: "langka", pattern: "loreng", colors: ["#c2a878", "#a98b5c", "#8a6f47", "#d9c7a0"], country: null, description: "Bercak pasir tiga nada.", price: 260 },
  { id: "skin-salju-digital", name: "Salju Digital", rarity: "langka", pattern: "digital", colors: ["#e2e8f0", "#94a3b8", "#cbd5e1", "#64748b"], country: null, description: "Piksel putih-kelabu untuk medan bersalju.", price: 320 },
  { id: "skin-malam-kota", name: "Malam Kota", rarity: "langka", pattern: "digital", colors: ["#1f2937", "#374151", "#111827", "#4b5563"], country: null, description: "Piksel gelap yang menyatu dengan bayangan gedung.", price: 320 },

  // Epik — camo bertema negara.
  { id: "skin-negara-indonesia", name: "Merah Putih", rarity: "epik", pattern: "bendera", colors: ["#dc2626", "#f8fafc"], country: { code: "ID", name: "Indonesia" }, description: "Dwiwarna berkibar di sepanjang badan senjata.", price: 550 },
  { id: "skin-negara-jepang", name: "Hinomaru", rarity: "epik", pattern: "bendera", colors: ["#f8fafc", "#dc2626"], country: { code: "JP", name: "Jepang" }, description: "Matahari merah di atas putih bersih.", price: 550 },
  { id: "skin-negara-brasil", name: "Verde-Amarelo", rarity: "epik", pattern: "bendera", colors: ["#15803d", "#facc15", "#1d4ed8"], country: { code: "BR", name: "Brasil" }, description: "Hijau, kuning, dan biru penuh semangat.", price: 600 },
  { id: "skin-negara-jerman", name: "Schwarz-Rot-Gold", rarity: "epik", pattern: "bendera", colors: ["#111827", "#dc2626", "#facc15"], country: { code: "DE", name: "Jerman" }, description: "Tiga pita mendatar hitam, merah, emas.", price: 600 },
  { id: "skin-negara-prancis", name: "Tricolore", rarity: "epik", pattern: "bendera", colors: ["#1d4ed8", "#f8fafc", "#dc2626"], country: { code: "FR", name: "Prancis" }, description: "Biru, putih, merah dalam pita tegak.", price: 600 },
  { id: "skin-negara-italia", name: "Il Tricolore", rarity: "epik", pattern: "bendera", colors: ["#15803d", "#f8fafc", "#dc2626"], country: { code: "IT", name: "Italia" }, description: "Hijau, putih, merah dalam pita tegak.", price: 600 },
  { id: "skin-negara-thailand", name: "Trairanga", rarity: "epik", pattern: "bendera", colors: ["#dc2626", "#f8fafc", "#1e3a8a"], country: { code: "TH", name: "Thailand" }, description: "Lima pita merah, putih, dan biru tua di tengah.", price: 600 },
  { id: "skin-negara-korea", name: "Taegeuk", rarity: "epik", pattern: "bendera", colors: ["#f8fafc", "#dc2626", "#1d4ed8"], country: { code: "KR", name: "Korea Selatan" }, description: "Lingkaran merah-biru di tengah putih.", price: 650 },

  // Gold — paling mewah.
  { id: "skin-emas-murni", name: "Emas Murni", rarity: "gold", pattern: "logam", colors: ["#b8860b", "#fcd34d", "#fef3c7", "#92400e"], country: null, description: "Lapisan emas berkilau dari ujung laras sampai popor.", price: 1500 },
  { id: "skin-emas-garuda", name: "Garuda Emas", rarity: "gold", pattern: "logam", colors: ["#7f1d1d", "#fbbf24", "#fef3c7", "#b91c1c"], country: { code: "ID", name: "Indonesia" }, description: "Emas bergurat merah, penghormatan untuk sang Garuda.", price: 2000 },
];

/** Skin bertema negara, urut menurut nama negara. */
export const COUNTRY_SKINS: Skin[] = SKINS.filter((skin) => skin.country !== null).sort((a, b) =>
  a.country!.name.localeCompare(b.country!.name, "id"),
);

export function findSkin(id: string | null | undefined): Skin | undefined {
  return id ? SKINS.find((skin) => skin.id === id) : undefined;
}
