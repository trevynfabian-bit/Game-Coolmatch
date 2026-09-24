import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/server/db/client";
import { players, type PlayerRow } from "@/server/db/schema";

/**
 * Identitas pemain lokal tanpa login pihak ketiga.
 *
 * Browser dikenali lewat cookie berisi id baris `players`. Kunjungan pertama
 * membuat profil baru dengan nama sementara; fitur nama pemain nanti tinggal
 * memperbarui kolom `name`. Cookie httpOnly supaya skrip halaman tidak bisa
 * menukarnya dengan id pemain lain secara diam-diam.
 */
const COOKIE = "arena_pemain";
const ONE_YEAR = 60 * 60 * 24 * 365;

function newPlayerName(): string {
  return `Pemain-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function createPlayer(): PlayerRow {
  // Nama unik; ulangi bila kebetulan bertabrakan.
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = db
      .insert(players)
      .values({ name: newPlayerName() })
      .onConflictDoNothing()
      .returning()
      .get();
    if (row) return row;
  }
  throw new Error("Gagal membuat profil pemain baru.");
}

/**
 * Pemain untuk permintaan ini. Hanya boleh dipanggil dari Route Handler atau
 * Server Function, karena bisa menulis cookie.
 */
export async function currentPlayer(): Promise<PlayerRow> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;

  if (Number.isInteger(id) && id > 0) {
    const existing = db.select().from(players).where(eq(players.id, id)).get();
    if (existing) return existing;
  }

  const created = createPlayer();
  store.set(COOKIE, String(created.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return created;
}
