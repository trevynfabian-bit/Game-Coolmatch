/**
 * Pembungkus fetch untuk API internal `/api/*`.
 *
 * Semua galat — jaringan putus, server 5xx, atau penolakan 4xx — dikembalikan
 * sebagai `{ ok: false, message }` berisi kalimat yang siap ditampilkan,
 * sehingga pemanggil tidak perlu try/catch dan tidak pernah menampilkan
 * pesan teknis ke pemain.
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

export async function apiFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, code: "jaringan", message: "Tidak bisa terhubung ke server. Periksa koneksimu." };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Balasan tanpa badan JSON ditangani di bawah.
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    return {
      ok: false,
      status: response.status,
      code: error?.code ?? "server_gagal",
      message: error?.message ?? "Server sedang bermasalah. Coba lagi sebentar.",
    };
  }
  return { ok: true, data: payload as T };
}
