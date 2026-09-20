import { guardWrite, readOr } from "@/server/api/fallback";
import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { ensureLocalPlayer } from "@/server/players/local-player";
import {
  listPendingAnnouncements,
  markAnnounced,
} from "@/server/weapons/unlock-store";

/**
 * Kabar senjata baru terbuka yang belum pernah dilihat pemain.
 *
 * Ada terpisah dari jawaban penutupan pertandingan, dan itu bukan pengulangan.
 * Jawaban penutupan menyebutkan senjata yang baru terbuka supaya layar
 * ringkasan bisa merayakannya SEKETIKA; endpoint ini yang menjamin kabarnya
 * tidak hilang bila jawaban itu tidak pernah sampai — jaringan putus, tab
 * ditutup tepat saat peluit berbunyi, atau layar ringkasannya gagal dirender.
 * Tanpa jaring pengaman ini, senjata tetap jadi milik pemain tetapi tidak akan
 * pernah ada yang mengabarkan bahwa ia terbuka.
 *
 * Penandaan "sudah dilihat" karena itu dipisah jadi permintaan tersendiri, dan
 * dikirim SESUDAH pemain benar-benar melihatnya — bukan saat kabarnya
 * diambil. Kabar yang terkirim tetapi tidak sempat terlihat harus tetap
 * menunggu.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  /*
    Cadangannya daftar kosong. Berbeda dengan katalog senjata yang aslinya
    memang ada di kode, kabar yang menunggu hanya bisa diketahui dari
    database — dan mengarang perayaan saat datanya tidak terbaca jauh lebih
    buruk daripada diam. Kabarnya toh tidak hilang: ia masih menunggu di sana
    begitu database bisa dibaca lagi.
  */
  const announcements = readOr(
    "GET /api/senjata-terbuka",
    () => listPendingAnnouncements(ensureLocalPlayer().id),
    [],
  );

  return jsonOk(
    { announcements },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const raw = (body.body as Record<string, unknown> | null)?.weaponIds;
  if (!Array.isArray(raw) || raw.some((id) => typeof id !== "string")) {
    return jsonError(
      400,
      "Kirim `weaponIds` berupa daftar id senjata yang sudah dilihat.",
    );
  }

  return guardWrite("POST /api/senjata-terbuka", () => {
    const player = ensureLocalPlayer();
    const ditandai = markAnnounced(player.id, raw as string[]);

    /*
      Id yang tidak dikenal atau yang sudah ditandai sejak tadi TIDAK dianggap
      galat. Permintaan ini dikirim sesudah sebuah layar tertutup, kadang dua
      kali karena pemain menutupnya cepat-cepat, dan menolaknya dengan 404
      hanya menghasilkan galat di konsol tanpa ada yang bisa diperbaiki
      siapa pun. Yang dilaporkan cukup berapa yang benar-benar berubah.
    */
    return jsonOk(
      { acknowledged: ditandai },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
