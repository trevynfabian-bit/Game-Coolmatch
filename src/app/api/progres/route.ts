import { jsonOk } from "@/server/api/json";
import { ensureLocalPlayer } from "@/server/players/local-player";
import { loadTotalDeaths } from "@/server/players/stats-store";
import { evaluateWeaponUnlocks } from "@/server/weapons/unlock-store";

/**
 * Kemajuan bermain pemain ini beserta senjata yang sudah terbuka.
 *
 * Membacanya sekalian MENILAI syarat buka senjata, bukan sekadar melaporkan
 * apa yang sudah tercatat. Penilaian itu tahan diulang — ia membandingkan
 * catatan kepemilikan dengan syarat, jadi pembacaan kedua tidak menghasilkan
 * apa-apa — dan itu yang membuat layar Koleksi tetap benar walau ada
 * pertandingan yang penilaiannya sempat gagal atau terlewat. Tanpa ini,
 * senjata yang terlewat baru muncul sesudah pemain bertanding sekali lagi.
 *
 * `newlyUnlockedWeaponIds` karena itu hampir selalu kosong di sini; ia hanya
 * terisi bila pembacaan ini benar-benar menemukan sesuatu yang belum pernah
 * diberikan.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  const player = ensureLocalPlayer();
  const evaluation = evaluateWeaponUnlocks(player.id);

  return jsonOk(
    {
      matchesPlayed: evaluation.progress.matchesPlayed,
      wins: evaluation.progress.wins,
      totalKills: evaluation.progress.totalKills,
      totalDeaths: loadTotalDeaths(player.id),
      unlockedWeaponIds: evaluation.unlocked,
      newlyUnlockedWeaponIds: evaluation.newlyUnlocked,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
