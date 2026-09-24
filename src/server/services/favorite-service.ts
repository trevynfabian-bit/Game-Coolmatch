import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { FAVORITE_KINDS, playerFavorites, playerSkins } from "@/server/db/schema";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";

/** Layanan favorit galeri: daftar dan tombol tandai/lepas. */

export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

export class FavoriteError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FavoriteError";
  }
}

/** Favorit pemain sebagai kunci "jenis:id", urut sesuai waktu ditandai. */
export function listFavorites(playerId: number): string[] {
  return db
    .select()
    .from(playerFavorites)
    .where(eq(playerFavorites.playerId, playerId))
    .orderBy(asc(playerFavorites.createdAt))
    .all()
    .map((row) => `${row.kind}:${row.itemId}`);
}

/**
 * Menandai atau melepas favorit. Senjata harus ada di katalog; skin harus
 * dimiliki pemain — galeri hanya menampilkan skin milik sendiri.
 */
export function toggleFavorite(
  playerId: number,
  kind: FavoriteKind,
  itemId: string,
): { favorites: string[]; isFavorite: boolean } {
  if (kind === "senjata" && !MOCK_WEAPONS.some((weapon) => weapon.id === itemId)) {
    throw new FavoriteError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  }
  if (kind === "skin") {
    const owned = db
      .select()
      .from(playerSkins)
      .where(and(eq(playerSkins.playerId, playerId), eq(playerSkins.skinId, itemId)))
      .get();
    if (!owned) throw new FavoriteError(409, "belum_dimiliki", "Hanya skin milikmu yang bisa difavoritkan.");
  }

  const where = and(
    eq(playerFavorites.playerId, playerId),
    eq(playerFavorites.kind, kind),
    eq(playerFavorites.itemId, itemId),
  );
  const isFavorite = db.transaction((tx) => {
    const existing = tx.select().from(playerFavorites).where(where).get();
    if (existing) {
      tx.delete(playerFavorites).where(where).run();
      return false;
    }
    tx.insert(playerFavorites).values({ playerId, kind, itemId, createdAt: Date.now() }).run();
    return true;
  });
  return { favorites: listFavorites(playerId), isFavorite };
}
