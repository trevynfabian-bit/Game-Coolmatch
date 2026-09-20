import { DEFAULT_SETTINGS } from "@/lib/game/settings";
import { DEFAULT_BINDINGS } from "@/lib/game/keybinds";
import { guardWrite, readOr } from "@/server/api/fallback";
import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { ensureLocalPlayer } from "@/server/players/local-player";
import {
  loadPlayerSettings,
  parseSettings,
  savePlayerSettings,
} from "@/server/settings/settings-store";

/**
 * Endpoint pengaturan permainan: memuat dan menyimpan suara, tampilan,
 * sensitivitas, dan tata tombol pilihan pemain.
 *
 * Inilah yang membuat pengaturan ikut PEMAIN, bukan ikut peramban. Simpanan di
 * perangkat tetap ada dan tetap jadi yang dibaca lebih dulu — ia yang membuat
 * layar bisa langsung tampil tanpa menunggu jaringan — tetapi hanya baris di
 * sini yang bertahan saat pemain berganti perangkat atau membersihkan data
 * situsnya.
 *
 * Dipaksa dinamis dengan alasan yang sama seperti endpoint lain: handler ini
 * membaca database lewat better-sqlite3, modul asli yang hanya berjalan di
 * runtime Node.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Pengaturan yang tersimpan, atau bawaan bila pemain belum pernah menyimpan. */
export function GET(): Response {
  /*
    Bawaan sudah jadi jawaban yang sah untuk pemain yang belum pernah
    menyimpan, jadi ia juga jawaban yang sah ketika simpanannya tidak terbaca.
    Bedanya hanya ditandai `degraded`, supaya layar bisa menahan diri
    menimpa simpanan di perangkat dengan bawaan yang bukan pilihan siapa pun.
  */
  const cadangan = {
    ...DEFAULT_SETTINGS,
    bindings: DEFAULT_BINDINGS,
    updatedAt: null,
  };

  const settings = readOr(
    "GET /api/pengaturan",
    () => loadPlayerSettings(ensureLocalPlayer().id),
    cadangan,
  );

  return jsonOk(
    { ...settings, degraded: settings === cadangan },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Menyimpan pengaturan pemain.
 *
 * PUT, bukan POST: permintaan ini menetapkan SELURUH isi pengaturan ke nilai
 * yang dikirim, dan mengirimkannya dua kali berakhir sama dengan sekali. Itu
 * juga yang membuatnya aman diulang oleh klien yang tidak yakin permintaan
 * pertamanya sampai.
 *
 * Seluruh pengaturan dikirim sekaligus, bukan sepotong-sepotong. Layar
 * Pengaturan memang memegang semuanya dan menyimpan tiap perubahan; pengiriman
 * per bagian hanya membuat dua permintaan yang berlomba bisa menyimpan
 * separuh-separuh dari dua keadaan berbeda.
 */
export async function PUT(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const parsed = parseSettings(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  return guardWrite("PUT /api/pengaturan", () => {
    const player = ensureLocalPlayer();
    return jsonOk(savePlayerSettings(player.id, parsed.value), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
