import { eq, sql } from "drizzle-orm";
import {
  DEFAULT_SETTINGS,
  SCALE_MAX,
  SCALE_MIN,
  SENSITIVITY_MAX,
  SENSITIVITY_MIN,
  VOLUME_MAX,
  VOLUME_MIN,
  isQualityLevel,
  type GameSettings,
  type QualityLevel,
} from "@/lib/game/settings";
import {
  BINDABLE_ACTIONS,
  DEFAULT_BINDINGS,
  type BindableAction,
  type KeyBindings,
} from "@/lib/game/keybinds";
import { db } from "@/server/db/client";
import { playerSettings } from "@/server/db/schema";

/** Bentuk yang dikirim dan diterima endpoint pengaturan. */
export interface SettingsPayload extends GameSettings {
  bindings: KeyBindings;
  /** Epoch milidetik saat terakhir disimpan; null berarti masih bawaan. */
  updatedAt: number | null;
}

export type ParsedSettings =
  | { ok: true; value: GameSettings & { bindings: KeyBindings } }
  | { ok: false; message: string };

function bilanganDalam(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

/**
 * Memeriksa badan permintaan penyimpanan pengaturan.
 *
 * Nilai di luar batas DITOLAK, bukan dijepit diam-diam — alasannya sama
 * dengan pengaturan lawan. Layar Pengaturan sudah menjepitnya sebelum
 * mengirim, jadi angka yang lolos ke sini berarti ada yang tidak beres, dan
 * menjepitnya hanya menyembunyikan itu sambil menyimpan sesuatu yang tidak
 * pernah diminta siapa pun. Menolaknya juga membuat jawabannya 400 dengan
 * alasan yang bisa dibaca, bukan 500 dari batasan CHECK di database.
 *
 * Pemetaan tombol adalah satu-satunya bagian yang TIDAK bisa diperiksa
 * database — ia tersimpan sebagai teks JSON — jadi pemeriksaan di sini yang
 * menanggung seluruhnya: aksi yang tidak dikenal ditolak, dan tiap aksi harus
 * menunjuk kode tombol berupa teks yang tidak kosong.
 */
export function parseSettings(body: unknown): ParsedSettings {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  const audio = b.audio as Record<string, unknown> | undefined;
  const display = b.display as Record<string, unknown> | undefined;
  const controls = b.controls as Record<string, unknown> | undefined;

  if (!audio || !display || !controls) {
    return {
      ok: false,
      message: "Pengaturan harus memuat `audio`, `display`, dan `controls`.",
    };
  }

  if (
    !bilanganDalam(audio.effects, VOLUME_MIN, VOLUME_MAX) ||
    !bilanganDalam(audio.music, VOLUME_MIN, VOLUME_MAX)
  ) {
    return {
      ok: false,
      message: `Volume harus bilangan bulat antara ${VOLUME_MIN} dan ${VOLUME_MAX}.`,
    };
  }
  if (typeof audio.muted !== "boolean") {
    return { ok: false, message: "`audio.muted` harus true atau false." };
  }

  if (!isQualityLevel(display.quality)) {
    return {
      ok: false,
      message: `Kualitas gambar "${String(display.quality)}" tidak dikenal.`,
    };
  }
  if (!bilanganDalam(display.renderScale, SCALE_MIN, SCALE_MAX)) {
    return {
      ok: false,
      message: `Skala resolusi harus bilangan bulat antara ${SCALE_MIN} dan ${SCALE_MAX}.`,
    };
  }
  if (typeof display.showFps !== "boolean") {
    return { ok: false, message: "`display.showFps` harus true atau false." };
  }

  if (!bilanganDalam(controls.sensitivity, SENSITIVITY_MIN, SENSITIVITY_MAX)) {
    return {
      ok: false,
      message: `Sensitivitas harus bilangan bulat antara ${SENSITIVITY_MIN} dan ${SENSITIVITY_MAX}.`,
    };
  }

  const bindings = { ...DEFAULT_BINDINGS };
  const dikirim = b.bindings;
  if (dikirim !== undefined) {
    if (
      typeof dikirim !== "object" ||
      dikirim === null ||
      Array.isArray(dikirim)
    ) {
      return { ok: false, message: "`bindings` harus berupa objek." };
    }
    const dikenal = new Set<string>(BINDABLE_ACTIONS.map((e) => e.action));
    for (const [aksi, kode] of Object.entries(dikirim)) {
      if (!dikenal.has(aksi)) {
        return { ok: false, message: `Aksi "${aksi}" tidak dikenal.` };
      }
      if (typeof kode !== "string" || kode.length === 0) {
        return {
          ok: false,
          message: `Tombol untuk "${aksi}" harus berupa kode tombol.`,
        };
      }
      bindings[aksi as BindableAction] = kode;
    }
  }

  return {
    ok: true,
    value: {
      audio: {
        effects: audio.effects,
        music: audio.music,
        muted: audio.muted,
      },
      display: {
        quality: display.quality as QualityLevel,
        renderScale: display.renderScale,
        showFps: display.showFps,
      },
      controls: { sensitivity: controls.sensitivity },
      bindings,
    },
  };
}

/**
 * Membaca pemetaan tombol dari teks JSON yang tersimpan.
 *
 * Apa pun yang tidak bisa dibaca jatuh ke bawaan, PER AKSI. Teks itu bisa
 * ditulis versi lama, disunting tangan, atau terpotong separuh; satu aksi yang
 * rusak tidak boleh membuang seluruh tata tombol yang sudah disetel pemain.
 */
function bacaBindings(raw: string): KeyBindings {
  const hasil = { ...DEFAULT_BINDINGS };
  let tersimpan: unknown;
  try {
    tersimpan = JSON.parse(raw);
  } catch {
    return hasil;
  }
  if (typeof tersimpan !== "object" || tersimpan === null) return hasil;

  for (const entry of BINDABLE_ACTIONS) {
    const kode = (tersimpan as Record<string, unknown>)[entry.action];
    if (typeof kode === "string" && kode.length > 0) {
      hasil[entry.action] = kode;
    }
  }
  return hasil;
}

/** Menyusun jawaban dari satu baris pengaturan. */
function dariBaris(row: typeof playerSettings.$inferSelect): SettingsPayload {
  return {
    audio: {
      effects: row.effectsVolume,
      music: row.musicVolume,
      muted: row.muted,
    },
    display: {
      quality: row.quality,
      renderScale: row.renderScale,
      showFps: row.showFps,
    },
    controls: { sensitivity: row.sensitivity },
    bindings: bacaBindings(row.keyBindings),
    updatedAt: row.updatedAt,
  };
}

/**
 * Pengaturan milik seorang pemain.
 *
 * Pemain yang belum pernah menyimpan apa pun mendapat pengaturan BAWAAN dengan
 * `updatedAt` kosong, bukan jawaban 404 — belum memilih bukan keadaan galat,
 * dan `updatedAt` yang kosong itulah yang memberi tahu klien bahwa nilainya
 * belum pernah dipilih sendiri oleh pemain.
 */
export function loadPlayerSettings(playerId: number): SettingsPayload {
  const [row] = db
    .select()
    .from(playerSettings)
    .where(eq(playerSettings.playerId, playerId))
    .limit(1)
    .all();

  if (!row) {
    return { ...DEFAULT_SETTINGS, bindings: DEFAULT_BINDINGS, updatedAt: null };
  }

  return dariBaris(row);
}

/**
 * Menyimpan pengaturan seorang pemain.
 *
 * Satu upsert, bukan "cari dulu, lalu insert atau update": dua permintaan yang
 * datang hampir bersamaan pada cara kedua sama-sama melihat baris belum ada
 * lalu sama-sama menyisipkan, dan yang kalah cepat gagal karena indeks unik.
 *
 * Hanya tombol yang BERBEDA dari bawaan yang ikut tersimpan. Menyimpan seluruh
 * peta tombol berarti simpanan pemain membeku pada bawaan hari ini; kalau
 * bawaannya berubah nanti, ia tidak akan pernah ikut berubah meski pemain tidak
 * pernah menyentuh tombol itu.
 */
export function savePlayerSettings(
  playerId: number,
  value: GameSettings & { bindings: KeyBindings },
): SettingsPayload {
  const perubahanTombol: Record<string, string> = {};
  for (const entry of BINDABLE_ACTIONS) {
    const kode = value.bindings[entry.action];
    if (kode !== entry.defaultCode) perubahanTombol[entry.action] = kode;
  }

  const kolom = {
    effectsVolume: value.audio.effects,
    musicVolume: value.audio.music,
    muted: value.audio.muted,
    quality: value.display.quality,
    renderScale: value.display.renderScale,
    showFps: value.display.showFps,
    sensitivity: value.controls.sensitivity,
    keyBindings: JSON.stringify(perubahanTombol),
  };

  const [row] = db
    .insert(playerSettings)
    .values({ playerId, ...kolom })
    .onConflictDoUpdate({
      target: playerSettings.playerId,
      set: { ...kolom, updatedAt: sql`(unixepoch() * 1000)` },
    })
    .returning()
    .all();

  return dariBaris(row);
}
