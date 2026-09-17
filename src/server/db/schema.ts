import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Skema database Arena Tembak Simple.
 *
 * Task ini membangun bagian PERTANDINGAN dan RONDE. Dua tabel acuan yang
 * dibutuhkannya — `players` dan `maps` — dibuat dalam bentuk paling ringkas di
 * sini supaya kunci asingnya sah sejak awal; fitur profil pemain dan pilih peta
 * pada fase berikutnya yang akan memperluas keduanya.
 *
 * Waktu disimpan sebagai epoch milidetik (integer). SQLite tidak punya tipe
 * tanggal asli, dan angka epoch lebih aman dibanding teks: urutannya benar
 * tanpa bergantung format, dan bebas dari urusan zona waktu.
 */

const now = sql`(unixepoch() * 1000)`;

/** Identitas pemain. Diperluas fase "Nama Pemain". */
export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (table) => [uniqueIndex("players_name_unik").on(table.name)],
);

/** Peta yang bisa dimainkan. Diperluas fase "Pilih Peta". */
export const maps = sqliteTable("maps", {
  /** Memakai id peta dari kode, misalnya "map-gudang-senja". */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  previewUrl: text("preview_url"),
});

/** Tingkat kesulitan musuh otomatis; sama dengan tipe `Difficulty` di klien. */
export const DIFFICULTIES = ["santai", "normal", "susah"] as const;

/** Hasil akhir sebuah pertandingan dari sudut pandang pemain. */
export const MATCH_RESULTS = ["menang", "kalah", "seri", "ditinggal"] as const;

/**
 * Batas jumlah musuh yang boleh tersimpan.
 *
 * Angkanya ditulis di sini, BUKAN diimpor dari `MIN_BOTS`/`MAX_BOTS` di
 * lib/game/difficulty. Batasan CHECK ikut tercetak ke berkas migrasi dan
 * membeku di sana; mengambilnya dari konstanta yang bisa berubah akan membuat
 * skema yang dijalankan database diam-diam berbeda dari yang terbaca di kode
 * begitu konstanta itu digeser. Kalau batasnya memang perlu berubah, itu
 * perubahan skema dan harus punya migrasinya sendiri.
 */
const MIN_BOT_COUNT = 1;
const MAX_BOT_COUNT = 8;

/**
 * Pengaturan lawan otomatis pilihan pemain: seberapa pintar musuhnya dan
 * berapa banyak yang muncul di arena.
 *
 * Satu baris per pemain, bukan riwayat — yang disimpan adalah pilihan TERAKHIR,
 * supaya membuka game besok langsung memakai pengaturan yang sama. Riwayat
 * pengaturan tiap pertandingan sudah tersimpan di kolom `difficulty` dan
 * `bot_count` milik `matches`.
 *
 * Kedua kolomnya diberi batasan CHECK, berbeda dengan tabel lain di berkas ini.
 * Sebabnya: isi tabel ini datang langsung dari badan permintaan yang dikirim
 * klien, sementara baris `matches` ditulis server dari keadaan pertandingan
 * yang sudah berjalan. Untuk yang pertama, database adalah tempat terakhir yang
 * masih bisa menolak nilai ngawur.
 */
export const opponentSettings = sqliteTable(
  "opponent_settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),

    difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull(),
    botCount: integer("bot_count").notNull(),

    updatedAt: integer("updated_at").notNull().default(now),
  },
  (table) => [
    // Satu pemain hanya punya satu pengaturan lawan yang berlaku. Indeks unik
    // ini juga yang membuat penyimpanan bisa ditulis sebagai satu upsert alih-
    // alih "cek dulu, baru insert atau update" yang bisa berlomba.
    uniqueIndex("opponent_settings_pemain_unik").on(table.playerId),
    check(
      "opponent_settings_bot_count_wajar",
      sql`${table.botCount} BETWEEN ${sql.raw(String(MIN_BOT_COUNT))} AND ${sql.raw(String(MAX_BOT_COUNT))}`,
    ),
    check(
      "opponent_settings_difficulty_dikenal",
      sql`${table.difficulty} IN ('santai', 'normal', 'susah')`,
    ),
  ],
);

/**
 * Satu pertandingan. Barisnya dibuat saat pertandingan dimulai dengan
 * `endedAt` masih kosong, lalu ditutup saat selesai — jadi pertandingan yang
 * ditinggalkan di tengah tetap terekam alih-alih hilang tanpa jejak.
 */
export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    mapId: text("map_id")
      .notNull()
      .references(() => maps.id, { onDelete: "restrict" }),

    difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull(),
    botCount: integer("bot_count").notNull(),

    /** Aturan yang berlaku saat pertandingan ini dimainkan. */
    totalRounds: integer("total_rounds").notNull(),
    scoreLimit: integer("score_limit").notNull(),
    roundSeconds: integer("round_seconds").notNull(),

    /** Kosong selama pertandingan masih berjalan. */
    result: text("result", { enum: MATCH_RESULTS }),
    winnerName: text("winner_name"),

    startedAt: integer("started_at").notNull().default(now),
    endedAt: integer("ended_at"),
  },
  (table) => [
    // Riwayat pertandingan selalu dibaca per pemain dan urut dari yang terbaru.
    index("matches_pemain_waktu_idx").on(table.playerId, table.startedAt),
    index("matches_peta_idx").on(table.mapId),
  ],
);

/** Sebab sebuah ronde berakhir. */
export const ROUND_END_REASONS = [
  "batas_kill",
  "waktu_habis",
  "ditinggal",
] as const;

/**
 * Satu ronde di dalam sebuah pertandingan. Nomor ronde unik per pertandingan,
 * sehingga ronde yang sama tidak bisa tercatat dua kali kalau penyimpanan
 * sempat terkirim ulang.
 */
export const matchRounds = sqliteTable(
  "match_rounds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),

    roundNumber: integer("round_number").notNull(),
    /** Kosong bila ronde berakhir seri. */
    winnerName: text("winner_name"),
    endedReason: text("ended_reason", { enum: ROUND_END_REASONS }).notNull(),
    /** Kill pemain lokal pada ronde ini, untuk grafik kemajuan nanti. */
    playerKills: integer("player_kills").notNull().default(0),
    endedAt: integer("ended_at").notNull().default(now),
  },
  (table) => [
    uniqueIndex("match_rounds_nomor_unik").on(table.matchId, table.roundNumber),
  ],
);

/**
 * Perolehan akhir tiap peserta sebuah pertandingan, pemain maupun bot.
 *
 * Namanya disimpan apa adanya, bukan sebagai kunci asing ke `players`, sebab
 * bot tidak punya baris di tabel itu dan nama pemain bisa berubah tanpa membuat
 * catatan lama jadi salah.
 */
export const matchScores = sqliteTable(
  "match_scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),

    participantName: text("participant_name").notNull(),
    isBot: integer("is_bot", { mode: "boolean" }).notNull().default(true),

    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    score: integer("score").notNull().default(0),
    roundWins: integer("round_wins").notNull().default(0),
    isWinner: integer("is_winner", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("match_scores_peserta_unik").on(
      table.matchId,
      table.participantName,
    ),
  ],
);

export type PlayerRow = typeof players.$inferSelect;
export type MapRow = typeof maps.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type NewMatchRow = typeof matches.$inferInsert;
export type MatchRoundRow = typeof matchRounds.$inferSelect;
export type NewMatchRoundRow = typeof matchRounds.$inferInsert;
export type MatchScoreRow = typeof matchScores.$inferSelect;
export type NewMatchScoreRow = typeof matchScores.$inferInsert;
export type OpponentSettingsRow = typeof opponentSettings.$inferSelect;
export type NewOpponentSettingsRow = typeof opponentSettings.$inferInsert;