import type { Difficulty } from "@/types/game";

/**
 * Pemanggil endpoint pengaturan lawan dari sisi klien.
 *
 * Pilihan pemain hidup di dua tempat: localStorage untuk tampil seketika, dan
 * server sebagai simpanan yang dipercaya — itulah yang dibaca arena dan
 * pertandingan yang dicatat. Fungsi di sini tidak melempar: jaringan atau
 * penyimpanan yang sedang tidak bisa diakses tidak boleh membuat layar
 * pengaturan gagal; pemanggil cukup tahu bahwa jawabannya tidak ada.
 */
export interface OpponentSettingsResponse {
  difficulty: Difficulty;
  botCount: number;
  updatedAt: number | null;
  degraded: boolean;
  levels: { id: Difficulty; label: string; facts: string[] }[];
  limits: { minBots: number; maxBots: number };
}

const ENDPOINT = "/api/pengaturan-lawan";

export async function fetchOpponentSettings(): Promise<OpponentSettingsResponse | null> {
  try {
    const response = await fetch(ENDPOINT, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as OpponentSettingsResponse;
  } catch {
    return null;
  }
}

export async function saveOpponentSettingsRemote(value: {
  difficulty: Difficulty;
  botCount: number;
}): Promise<boolean> {
  try {
    const response = await fetch(ENDPOINT, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    return response.ok;
  } catch {
    return false;
  }
}
