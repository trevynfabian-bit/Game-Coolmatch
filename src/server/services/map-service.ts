import { asc, eq, inArray, notInArray, and } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  mapBlocks,
  mapSpawnPoints,
  maps,
  playerMapChoices,
  type MapBlockRow,
  type MapSpawnPointRow,
} from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
import { MOCK_MAPS } from "@/lib/mock/maps";
import type { ArenaMapInfo } from "@/types/game";

/**
 * Katalog peta modular di server. Kode (`lib/mock/maps`) tetap sumber
 * kebenarannya; peta, balok, dan titik munculnya disalin ke database sekali
 * per proses. Balok yang dihapus dari kode ikut terhapus dari database.
 */

let catalogSynced = false;

export function syncMapCatalog(): void {
  if (catalogSynced) return;
  db.transaction((tx) => {
    MOCK_MAPS.forEach((map, mapIndex) => {
      const values = {
        name: map.name,
        description: map.description,
        previewUrl: map.previewUrl,
        floorWidth: map.floorSize[0],
        floorDepth: map.floorSize[1],
        boundsMinX: map.playableBounds.minX,
        boundsMaxX: map.playableBounds.maxX,
        boundsMinZ: map.playableBounds.minZ,
        boundsMaxZ: map.playableBounds.maxZ,
        skyColor: map.skyColor,
        fogColor: map.fogColor,
        floorColor: map.floorColor,
        sortOrder: mapIndex,
      };
      tx.insert(maps).values({ id: map.id, ...values }).onConflictDoUpdate({ target: maps.id, set: values }).run();

      map.blocks.forEach((block, index) => {
        const blockValues = {
          kind: block.kind,
          posX: block.position[0],
          posY: block.position[1],
          posZ: block.position[2],
          sizeX: block.size[0],
          sizeY: block.size[1],
          sizeZ: block.size[2],
          rotationY: block.rotationY ?? 0,
          color: block.color ?? null,
          sortOrder: index,
        };
        tx.insert(mapBlocks)
          .values({ mapId: map.id, blockKey: block.id, ...blockValues })
          .onConflictDoUpdate({ target: [mapBlocks.mapId, mapBlocks.blockKey], set: blockValues })
          .run();
      });
      const keys = map.blocks.map((block) => block.id);
      tx.delete(mapBlocks)
        .where(keys.length > 0 ? and(eq(mapBlocks.mapId, map.id), notInArray(mapBlocks.blockKey, keys)) : eq(mapBlocks.mapId, map.id))
        .run();

      tx.delete(mapSpawnPoints).where(eq(mapSpawnPoints.mapId, map.id)).run();
      map.spawnPoints.forEach((point, slot) => {
        tx.insert(mapSpawnPoints).values({ mapId: map.id, slot, x: point[0], y: point[1], z: point[2] }).run();
      });
    });
  });
  catalogSynced = true;
}

function assemble(
  row: typeof maps.$inferSelect,
  blocks: MapBlockRow[],
  spawns: MapSpawnPointRow[],
): ArenaMapInfo {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    previewUrl: row.previewUrl,
    floorSize: [row.floorWidth, row.floorDepth],
    playableBounds: { minX: row.boundsMinX, maxX: row.boundsMaxX, minZ: row.boundsMinZ, maxZ: row.boundsMaxZ },
    skyColor: row.skyColor,
    fogColor: row.fogColor,
    floorColor: row.floorColor,
    blocks: blocks.map((block) => ({
      id: block.blockKey,
      kind: block.kind,
      position: [block.posX, block.posY, block.posZ],
      size: [block.sizeX, block.sizeY, block.sizeZ],
      ...(block.rotationY !== 0 ? { rotationY: block.rotationY } : {}),
      ...(block.color ? { color: block.color } : {}),
    })),
    spawnPoints: spawns.map((spawn) => [spawn.x, spawn.y, spawn.z]),
  };
}

/** Semua peta lengkap dengan balok dan titik munculnya, urut seperti di kode. */
export function listMaps(): ArenaMapInfo[] {
  syncMapCatalog();
  const rows = db.select().from(maps).orderBy(asc(maps.sortOrder)).all();
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return [];
  const blocks = db.select().from(mapBlocks).where(inArray(mapBlocks.mapId, ids)).orderBy(asc(mapBlocks.sortOrder)).all();
  const spawns = db.select().from(mapSpawnPoints).where(inArray(mapSpawnPoints.mapId, ids)).orderBy(asc(mapSpawnPoints.slot)).all();
  return rows.map((row) =>
    assemble(
      row,
      blocks.filter((block) => block.mapId === row.id),
      spawns.filter((spawn) => spawn.mapId === row.id),
    ),
  );
}

/** Satu peta lengkap, atau null bila tidak dikenal. */
export function getMap(mapId: string): ArenaMapInfo | null {
  syncMapCatalog();
  const row = db.select().from(maps).where(eq(maps.id, mapId)).get();
  if (!row) return null;
  const blocks = db.select().from(mapBlocks).where(eq(mapBlocks.mapId, mapId)).orderBy(asc(mapBlocks.sortOrder)).all();
  const spawns = db.select().from(mapSpawnPoints).where(eq(mapSpawnPoints.mapId, mapId)).orderBy(asc(mapSpawnPoints.slot)).all();
  return assemble(row, blocks, spawns);
}

/** Peta pilihan pemain; `updatedAt` null berarti belum pernah memilih (peta bawaan). */
export function getMapChoice(playerId: number): { mapId: string; updatedAt: number | null } {
  syncMapCatalog();
  const row = db.select().from(playerMapChoices).where(eq(playerMapChoices.playerId, playerId)).get();
  return row ? { mapId: row.mapId, updatedAt: row.updatedAt } : { mapId: MOCK_MAPS[0].id, updatedAt: null };
}

/** Menyimpan peta pilihan pemain; 404 bila peta tidak dikenal. */
export function saveMapChoice(playerId: number, mapId: string): { mapId: string; updatedAt: number } {
  syncMapCatalog();
  if (!db.select({ id: maps.id }).from(maps).where(eq(maps.id, mapId)).get()) {
    throw new ApiError(404, "peta_tidak_ada", "Peta tidak dikenal.");
  }
  const updatedAt = Date.now();
  db.insert(playerMapChoices)
    .values({ playerId, mapId, updatedAt })
    .onConflictDoUpdate({ target: playerMapChoices.playerId, set: { mapId, updatedAt } })
    .run();
  return { mapId, updatedAt };
}
