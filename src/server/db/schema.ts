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

    /**
     * Benar untuk sesi latihan dan uji coba senjata. Pertandingan seperti ini
     * tetap tercatat, tapi tidak pernah memberi koin dan tidak dihitung ke
     * statistik utama.
     */
    isTrial: integer("is_trial", { mode: "boolean" }).notNull().default(false),

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

/**
 * Dompet koin pemain: satu baris per pemain berisi saldo saat ini.
 *
 * Saldo disimpan sebagai angka jadi (bukan dijumlah ulang dari riwayat tiap
 * kali dibaca) supaya menu utama dan HUD cukup membaca satu baris. Kebenarannya
 * dijaga dengan selalu mengubah saldo dan menulis `coin_transactions` di dalam
 * transaksi database yang sama. CHECK memastikan saldo tidak pernah minus
 * walau ada pembelian yang berlomba.
 */
export const coinWallets = sqliteTable(
  "coin_wallets",
  {
    playerId: integer("player_id")
      .primaryKey()
      .references(() => players.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(0),
    /** Total koin yang pernah masuk, untuk statistik dan syarat buka hadiah. */
    lifetimeEarned: integer("lifetime_earned").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (table) => [check("coin_wallets_saldo_positif", sql`${table.balance} >= 0`)],
);

/**
 * Jenis mutasi koin. `pertandingan` dan `bonus_*` adalah koin masuk dari hasil
 * main; `beli_*` adalah koin keluar di toko; `koreksi` disediakan untuk
 * penyesuaian manual yang tetap harus tercatat.
 */
export const COIN_TRANSACTION_KINDS = [
  "pertandingan",
  "bonus_kill",
  "bonus_ronde",
  "bonus_killstreak",
  "beli_upgrade",
  "beli_attachment",
  "beli_skin",
  "buka_hadiah",
  "koreksi",
] as const;

/**
 * Riwayat setiap koin masuk dan keluar. `amount` bertanda: positif untuk
 * masuk, negatif untuk keluar, sehingga jumlah seluruh baris seorang pemain
 * selalu sama dengan saldonya. `balanceAfter` menyimpan saldo setelah mutasi
 * supaya riwayat bisa dibaca tanpa menjumlah ulang.
 *
 * `sourceType` + `sourceId` menunjuk asal-usulnya (mis. "match" + id
 * pertandingan, "skin" + id skin). Indeks unik parsial atas pasangan
 * (pemain, jenis, sumber) mencegah hadiah pertandingan yang sama tercatat dua
 * kali bila permintaan sempat terkirim ulang.
 */
export const coinTransactions = sqliteTable(
  "coin_transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: COIN_TRANSACTION_KINDS }).notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    /** Keterangan singkat untuk dibaca pemain, mis. "Menang di Gudang Senja". */
    note: text("note").notNull().default(""),
    createdAt: integer("created_at").notNull().default(now),
  },
  (table) => [
    index("coin_transactions_pemain_waktu_idx").on(
      table.playerId,
      table.createdAt,
    ),
    uniqueIndex("coin_transactions_sumber_unik")
      .on(table.playerId, table.kind, table.sourceType, table.sourceId)
      .where(sql`${table.sourceId} IS NOT NULL`),
    check("coin_transactions_bukan_nol", sql`${table.amount} <> 0`),
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

export type CoinWalletRow = typeof coinWallets.$inferSelect;
export type CoinTransactionRow = typeof coinTransactions.$inferSelect;
export type NewCoinTransactionRow = typeof coinTransactions.$inferInsert;
export type CoinTransactionKind = (typeof COIN_TRANSACTION_KINDS)[number];
