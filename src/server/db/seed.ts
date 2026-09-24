import { count } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/server/db/client";
import { attachments, killstreakRewards, mapBlocks, mapSpawnPoints, maps, skins, weaponUpgrades, weapons } from "@/server/db/schema";
import { syncMapCatalog } from "@/server/services/map-service";
import { syncWeaponCatalog } from "@/server/services/weapon-service";
import { syncCatalog } from "@/server/services/shop-service";
import { syncSkinCatalog } from "@/server/services/skin-service";
import { syncKillstreakCatalog } from "@/server/services/killstreak-service";

/**
 * Mengisi database dengan data bawaan dari kode: peta (beserta balok dan
 * titik muncul), katalog senjata, upgrade & attachment, skin, dan hadiah
 * killstreak. Aman dijalankan berulang — baris yang sudah ada diperbarui,
 * bukan digandakan.
 *
 * Dijalankan lewat `npm run db:seed` sesudah `npm run db:migrate`. Server juga
 * menyalin katalog yang sama saat pertama kali dipakai, jadi seed ini
 * terutama untuk menyiapkan database baru sebelum server berjalan.
 */
syncMapCatalog();
syncWeaponCatalog();
syncCatalog();
syncSkinCatalog();
syncKillstreakCatalog();

const total = (table: SQLiteTable) => db.select({ value: count() }).from(table).get()?.value ?? 0;

console.log(
  [
    `Peta: ${total(maps)} (balok ${total(mapBlocks)}, titik muncul ${total(mapSpawnPoints)})`,
    `Senjata: ${total(weapons)}`,
    `Upgrade: ${total(weaponUpgrades)}, attachment: ${total(attachments)}`,
    `Skin: ${total(skins)}`,
    `Hadiah killstreak: ${total(killstreakRewards)}`,
  ].join("\n"),
);
console.log("Seed selesai.");
