import { DIFFICULTY_ORDER, DIFFICULTY_PROFILES, MIN_BOTS } from "@/lib/game/difficulty";
import { DIFFICULTY_MULTIPLIER } from "@/lib/economy/coin-rules";
import { INTERMISSION_SECONDS, MATCH_RULES } from "@/lib/game/match-rules";
import { maxBotsForMap } from "@/lib/mock/bots";
import { MOCK_MAPS } from "@/lib/mock/maps";

/**
 * GET /api/pertandingan/konfigurasi — konfigurasi sah untuk memulai
 * pertandingan: aturan ronde per mode, jeda antarronde, tingkat kesulitan
 * beserta pengali koinnya, dan peta dengan kapasitas lawannya. Statis (dari
 * kode), jadi tidak butuh database dan aman di-cache sebentar.
 */
export function GET() {
  return Response.json(
    {
      rules: MATCH_RULES,
      intermissionSeconds: INTERMISSION_SECONDS,
      difficulties: DIFFICULTY_ORDER.map((id) => ({
        id,
        label: DIFFICULTY_PROFILES[id].label,
        coinMultiplier: DIFFICULTY_MULTIPLIER[id],
      })),
      maps: MOCK_MAPS.map((map) => ({ id: map.id, name: map.name, minBots: MIN_BOTS, maxBots: maxBotsForMap(map) })),
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
