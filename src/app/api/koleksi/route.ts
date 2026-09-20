import { jsonOk } from "@/server/api/json";
import { readOr } from "@/server/api/fallback";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { progressValue } from "@/lib/game/unlock-event";
import {
  unlockRuleFor,
  weaponsUnlockedBy,
} from "@/lib/game/weapon-unlock-rules";
import { ensureLocalPlayer } from "@/server/players/local-player";
import {
  listWeaponCollection,
  type CollectionPayload,
} from "@/server/weapons/unlock-store";

/**
 * Koleksi senjata pemain: seluruh katalog beserta status buka dan syaratnya.
 *
 * Inilah yang menggantikan data tiruan di layar Koleksi & Progres. Katalognya
 * dikirim LENGKAP, termasuk yang masih terkunci — justru senjata terkunci
 * itulah yang membuat pemain tahu ada sesuatu untuk dikejar — dan tiap syarat
 * datang bersama kemajuan pemain saat ini supaya bar kemajuannya bisa
 * digambar tanpa perhitungan tambahan di klien.
 *
 * Dipaksa dinamis dengan alasan yang sama seperti endpoint lain: handler ini
 * membaca database lewat better-sqlite3, modul asli yang hanya berjalan di
 * runtime Node.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cadangan bila database tidak bisa dibaca: katalog dari kode, dinilai dengan
 * kemajuan nol.
 *
 * Nol, bukan kemajuan tiruan. Menampilkan "9 pertandingan, 41 kill" kepada
 * pemain yang database-nya sedang tidak terbaca adalah mengarang pencapaian
 * yang tidak pernah terjadi; nol setidaknya jujur bahwa tidak ada yang bisa
 * dibaca. Yang tetap benar adalah daftar senjatanya sendiri dan syarat tiap
 * senjata, sebab keduanya memang berasal dari kode.
 */
function collectionFromCode(): CollectionPayload {
  const progress = { matchesPlayed: 0, wins: 0, totalKills: 0 };
  const dimiliki = new Set(weaponsUnlockedBy(progress));

  return {
    progress: { ...progress, totalDeaths: 0 },
    weapons: MOCK_WEAPONS.map((weapon) => {
      const isUnlocked = dimiliki.has(weapon.id);
      const rule = unlockRuleFor(weapon.id);

      return {
        id: weapon.id,
        name: weapon.name,
        type: weapon.type,
        damage: weapon.damage,
        fireRate: weapon.fireRate,
        magazineSize: weapon.magazineSize,
        imageUrl: weapon.imageUrl,
        isUnlocked,
        unlockedAt: null,
        requirement:
          isUnlocked || !rule.requirement
            ? null
            : {
                kind: rule.requirement.kind,
                current: progressValue(rule.requirement.kind, progress),
                target: rule.requirement.target,
              },
      };
    }),
  };
}

export function GET(): Response {
  const fallback = collectionFromCode();

  const collection = readOr(
    "GET /api/koleksi",
    () => listWeaponCollection(ensureLocalPlayer().id),
    fallback,
  );

  return jsonOk(
    { ...collection, degraded: collection === fallback },
    { headers: { "Cache-Control": "no-store" } },
  );
}
