/**
 * Bentuk jawaban JSON yang seragam untuk seluruh endpoint.
 *
 * Dipisahkan sejak endpoint pertama supaya klien hanya perlu mengenali satu
 * bentuk galat: setiap kegagalan selalu `{ error: { message } }`, apa pun
 * sebabnya. Tanpa kesepakatan ini tiap endpoint cenderung mengarang bentuknya
 * sendiri, dan penanganan galat di klien berubah jadi tebak-tebakan.
 */

export interface ApiError {
  error: { message: string };
}

/** Jawaban berhasil berisi data apa adanya. */
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/**
 * Jawaban gagal. Pesannya ditulis untuk DIBACA — kalau sampai muncul di layar
 * pemain, ia harus tetap masuk akal.
 */
export function jsonError(status: number, message: string): Response {
  return Response.json({ error: { message } } satisfies ApiError, { status });
}

/**
 * Membaca badan permintaan sebagai JSON tanpa melempar.
 *
 * Badan yang kosong atau bukan JSON adalah permintaan yang salah bentuk, bukan
 * kerusakan server — jadi ia harus berujung 400, bukan 500. Membedakannya di
 * sini membuat tiap endpoint tidak perlu membungkus `request.json()` dengan
 * try/catch-nya sendiri.
 */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
