import { resetFighterHits } from "@/lib/game/fighter-runtime";
import { resetRespawnTimers } from "@/lib/game/respawn-runtime";
import { setRoundClock } from "@/lib/game/round-runtime";
import { pickSpawnPoint } from "@/lib/game/spawn";
import { useCombatStore } from "@/lib/store/combat-store";
import { useMatchStore } from "@/lib/store/match-store";
import { usePlayerStore } from "@/lib/store/player-store";
import type { ArenaMapInfo, Fighter, MatchSnapshot, Vec3 } from "@/types/game";

/**
 * Menyebar petarung ke titik spawn yang saling berjauhan: tiap orang mengambil
 * titik terjauh dari yang sudah dipesan.
 */
export function spreadSpawns(
  map: ArenaMapInfo,
  fighters: Pick<Fighter, "id">[],
): Record<string, Vec3> {
  const taken: Vec3[] = [];
  const spawns: Record<string, Vec3> = {};
  for (const fighter of fighters) {
    const point = pickSpawnPoint(map.spawnPoints, taken);
    spawns[fighter.id] = point;
    taken.push(point);
  }
  return spawns;
}

/**
 * Memulai pertandingan baru dari nol dan membersihkan semua keadaan sementara
 * yang hidup di luar React: penanda kena, hitung mundur respawn, jam ronde,
 * amunisi, dan papan skor yang mungkin masih terbuka.
 *
 * Dikumpulkan di satu tempat supaya tombol "Main lagi" dan pemuatan arena tidak
 * pernah lupa membersihkan salah satunya.
 */
export function restartMatch(map: ArenaMapInfo, snapshot: MatchSnapshot) {
  const spawns = spreadSpawns(map, snapshot.fighters);

  resetFighterHits();
  resetRespawnTimers();
  useMatchStore.getState().startFreshMatch(snapshot, spawns);
  setRoundClock(useMatchStore.getState().round.secondsLeft);

  useCombatStore.getState().arm({
    ammoInMagazine: snapshot.ammoInMagazine,
    ammoReserve: snapshot.ammoReserve,
    magazineSize: useCombatStore.getState().magazineSize,
  });

  usePlayerStore.getState().setScoreboardOpen(false);
}
