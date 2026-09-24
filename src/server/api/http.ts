import { CoinError } from "@/server/services/coin-service";

/**
 * Pembantu kecil untuk Route Handler `/api/*`: bentuk galat yang seragam,
 * pembacaan JSON yang aman, dan pemetaan galat layanan ke status HTTP.
 *
 * Semua galat dikirim sebagai `{ error: { code, message } }` supaya klien cukup
 * punya satu cara membacanya.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

/** Membaca badan JSON berupa objek; badan kosong dianggap objek kosong. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ApiError(400, "json_tidak_sah", "Badan permintaan bukan JSON yang sah.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ApiError(400, "json_tidak_sah", "Badan permintaan harus berupa objek JSON.");
  }
  return parsed as Record<string, unknown>;
}

/** Bilangan bulat dalam rentang; melempar 400 bila tidak sah. */
export function intField(
  value: unknown,
  name: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER, fallback }: { min?: number; max?: number; fallback?: number } = {},
): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ApiError(400, "isian_tidak_sah", `"${name}" harus bilangan bulat ${min}..${max}.`);
  }
  return value;
}

export function stringField(
  value: unknown,
  name: string,
  { maxLength = 64, fallback }: { maxLength?: number; fallback?: string } = {},
): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || value.trim() === "" || value.length > maxLength) {
    throw new ApiError(400, "isian_tidak_sah", `"${name}" harus teks 1..${maxLength} karakter.`);
  }
  return value.trim();
}

export function enumField<T extends string>(
  value: unknown,
  name: string,
  options: readonly T[],
  fallback?: T,
): T {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new ApiError(400, "isian_tidak_sah", `"${name}" harus salah satu dari: ${options.join(", ")}.`);
  }
  return value as T;
}

/** Id numerik dari segmen rute dinamis. */
export function routeId(raw: string, name = "id"): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "id_tidak_sah", `${name} tidak sah.`);
  }
  return id;
}

const COIN_STATUS: Record<CoinError["code"], number> = {
  saldo_kurang: 409,
  pertandingan_tidak_ada: 404,
  pertandingan_belum_selesai: 409,
  jumlah_tidak_sah: 400,
};

/**
 * Mengubah galat apa pun menjadi respons. Galat yang tidak dikenal — biasanya
 * database terkunci atau skema belum dimigrasi — menjadi 503 dengan pesan yang
 * aman, tanpa membocorkan detail internal.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message);
  }
  if (error instanceof CoinError) {
    return jsonError(COIN_STATUS[error.code], error.code, error.message);
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "SQLITE_BUSY" || code === "SQLITE_LOCKED") {
      return jsonError(503, "database_sibuk", "Database sedang sibuk, coba lagi sebentar.");
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/no such table/i.test(message)) {
    console.error("[api] skema belum dimigrasi:", message);
    return jsonError(
      503,
      "database_belum_siap",
      "Database belum siap. Jalankan `npm run db:migrate` lalu coba lagi.",
    );
  }
  console.error("[api] galat tak terduga:", error);
  return jsonError(503, "server_gagal", "Server gagal menyimpan data. Coba lagi sebentar.");
}

/** Membungkus handler supaya semua galat berubah jadi respons yang rapi. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/**
 * Untuk endpoint BACA: bila database gagal, kirim data cadangan yang aman
 * dengan penanda `degraded: true` alih-alih galat, supaya menu dan HUD tetap
 * tampil. Galat validasi (ApiError) tetap dikirim apa adanya.
 */
export function handleRead<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
  fallback: () => Record<string, unknown>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) return toErrorResponse(error);
      console.error("[api] pembacaan gagal, memakai cadangan:", error);
      return Response.json({ ...fallback(), degraded: true });
    }
  };
}
