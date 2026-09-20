import { guardWrite } from "@/server/api/fallback";
import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import {
  TRIAL_BOT_COUNT,
  TRIAL_DIFFICULTY,
  TRIAL_RULES,
} from "@/lib/game/trial-rules";
import { parseStartMatch, startMatch } from "@/server/matches/match-store";
import { isPlayableMap, maxBotsForStoredMap } from "@/server/maps/map-store";
import { loadSelectedMap } from "@/server/maps/selection-store";
import { ensureLocalPlayer } from "@/server/players/local-player";

/**
 * Membuka pertandingan UJI COBA senjata.
 *
 * Terpisah dari `/api/pertandingan`, dan pemisahannya yang menjadi
 * pengamannya: aturan uji dan penanda "tidak dihitung" ditentukan SERVER dari
 * satu berkas aturan bersama, bukan dikirim klien. Endpoint pertandingan
 * biasa tidak punya cara apa pun untuk menyatakan dirinya uji coba, dan
 * endpoint ini tidak punya cara menyatakan dirinya bukan.
 *
 * Itu penting karena uji coba tidak menambah kemajuan. Kalau penandanya boleh
 * dikirim klien, satu badan permintaan yang disusun tangan cukup untuk
 * membuat pertandingan sungguhan berhenti dihitung — atau sebaliknya, membuat
 * uji coba yang pendek dan mudah jadi cara memanen kill.
 *
 * Yang masih datang dari klien hanyalah peserta dan petanya: nama serta warna
 * lawan disusun arena, dan petanya mengikuti pilihan pemain.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  /*
    Badan permintaannya dilengkapi aturan uji lebih dulu, lalu diperiksa
    pemeriksa yang sama dengan pertandingan biasa. Dengan begitu aturan bentuk
    peserta — nama wajib, warna wajib, tepat satu yang bukan bot — hanya
    ditulis sekali, dan uji coba tidak pernah punya celah pemeriksaan yang
    berbeda dari pertandingan sungguhan.
  */
  const raw = (body.body ?? {}) as Record<string, unknown>;
  const parsed = parseStartMatch({
    ...raw,
    difficulty: TRIAL_DIFFICULTY,
    botCount: Array.isArray(raw.participants)
      ? raw.participants.filter(
          (p) =>
            typeof p === "object" &&
            p !== null &&
            (p as { isBot?: unknown }).isBot === true,
        ).length
      : 0,
    totalRounds: TRIAL_RULES.totalRounds,
    scoreLimit: TRIAL_RULES.scoreLimit,
    roundSeconds: TRIAL_RULES.roundSeconds,
  });

  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  /*
    Lawan uji coba dibatasi lebih ketat daripada pertandingan biasa. Tanpa
    batas ini, "uji coba" berisi delapan bot bukan lagi uji coba — ia
    pertandingan penuh yang kebetulan tidak dihitung.
  */
  if (parsed.value.botCount > TRIAL_BOT_COUNT) {
    return jsonError(
      400,
      `Uji coba paling banyak ${TRIAL_BOT_COUNT} lawan; diminta ${parsed.value.botCount}.`,
    );
  }

  const player = ensureLocalPlayer();
  const mapId = parsed.value.mapId ?? loadSelectedMap(player.id).mapId;

  if (!isPlayableMap(mapId)) {
    return jsonError(400, "Peta itu tidak ada di katalog.");
  }

  const muat = maxBotsForStoredMap(mapId);
  if (parsed.value.botCount > muat) {
    return jsonError(
      400,
      `Peta itu hanya muat ${muat} lawan; diminta ${parsed.value.botCount}.`,
    );
  }

  return guardWrite("POST /api/uji", () => {
    const matchId = startMatch(player.id, {
      ...parsed.value,
      mapId,
      isTrial: true,
    });

    return jsonOk(
      { matchId, isTrial: true, rules: TRIAL_RULES },
      { status: 201, headers: { Location: `/api/pertandingan/${matchId}` } },
    );
  });
}
