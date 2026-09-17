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

/**
 * Peta yang bisa dimainkan.
 *
 * Isinya berasal dari katalog peta di kode, bukan dari masukan pemain — tabel
 * ini ada supaya `matches.map_id` punya acuan yang sah dan nama peta yang
 * dipakai sebuah pertandingan tetap terbaca walau katalognya berubah.
 *
 * Yang disimpan adalah KETERANGAN katalog, bukan geometri arenanya. Balok,
 * titik spawn, dan pencahayaan tetap di kode karena ketiganya dibaca juga oleh
 * penyelesai tabrakan, penyusun roster, dan kanvas 3D — memindahkannya ke sini
 * berarti dua sumber yang bisa berselisih, dan yang kalah adalah tabrakan yang
 * tidak lagi cocok dengan yang terlihat. `spawn_point_count` adalah satu-
 * satunya angka geometri yang ikut, karena ia menentukan daya tampung lawan
 * dan server perlu bisa menolak jumlah lawan yang tidak muat tanpa memuat
 * seluruh peta.
 *
 * Tidak ada batasan CHECK di sini, berbeda dari tabel lain di berkas ini, dan
 * itu disengaja. SQLite tidak bisa menambahkan CHECK tanpa menyalin ulang
 * tabelnya, dan `matches` mengacu ke tabel ini dengan ON DELETE restrict —
 * persis keadaan yang membuat migrasi 0003 harus ditulis tangan agar tidak
 * menghapus data. Nilai di sini datang dari katalog di kode lewat satu penulis
 * saja, bukan dari badan permintaan, jadi harganya tidak sepadan.
 */
export const maps = sqliteTable(
  "maps",
  {
    /** Memakai id peta dari kode, misalnya "map-gudang-senja". */
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    previewUrl: text("preview_url"),

    /** Ukuran lantai arena dalam satuan dunia; dipakai keterangan katalog. */
    floorWidth: integer("floor_width").notNull().default(0),
    floorDepth: integer("floor_depth").notNull().default(0),

    /**
     * Jumlah titik spawn peta ini. Daya tampung lawannya adalah angka ini
     * dikurangi satu — satu titik dipakai pemain sendiri.
     */
    spawnPointCount: integer("spawn_point_count").notNull().default(0),

    /** Urutan tampil di katalog; mengikuti urutan katalog di kode. */
    sortOrder: integer("sort_order").notNull().default(0),

    /**
     * Peta yang ditarik dari katalog ditandai tidak bisa dimainkan, BUKAN
     * dihapus. Barisnya masih diacu pertandingan lama dengan ON DELETE
     * restrict, dan riwayat yang menyebut arena yang sudah tidak ada lebih
     * buruk daripada baris yang tidak lagi muncul di daftar pilihan.
     */
    isPlayable: integer("is_playable", { mode: "boolean" })
      .notNull()
      .default(true),

    /**
     * Kapan baris ini terakhir disegarkan dari katalog.
     *
     * Boleh kosong, tidak seperti kolom waktu tabel lain: SQLite menolak
     * menambahkan kolom NOT NULL dengan nilai bawaan yang tidak tetap ke tabel
     * yang sudah ada, dan `(unixepoch() * 1000)` bukan nilai tetap. Baris yang
     * lebih tua daripada kolom ini memang tidak diketahui kapan disegarkan;
     * kosong mengatakannya apa adanya. Satu-satunya penulisnya selalu mengisi.
     */
    updatedAt: integer("updated_at"),
  },
  (table) => [
    // Katalog selalu dibaca sebagai "yang bisa dimainkan, urut tampil".
    index("maps_katalog_idx").on(table.isPlayable, table.sortOrder),
  ],
);

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

    /*
      Isi kolom-kolom ini datang dari klien saat pertandingan usai, dan pilihan
      `enum` pada text() hanyalah tipe TypeScript — database menerima apa pun.
      Satu salah ketik karena itu cukup untuk menanam riwayat yang tidak bisa
      dibaca ulang oleh kode yang mengandalkan tipenya. Batasan di bawah ini
      yang menolaknya.

      `result` boleh kosong selama pertandingan masih berjalan; CHECK yang
      bernilai NULL dianggap terpenuhi oleh SQLite, jadi itu tidak perlu
      ditulis terpisah.
    */
    check(
      "matches_difficulty_dikenal",
      sql`${table.difficulty} IN ('santai', 'normal', 'susah')`,
    ),
    check(
      "matches_result_dikenal",
      sql`${table.result} IN ('menang', 'kalah', 'seri', 'ditinggal')`,
    ),
    check(
      "matches_aturan_wajar",
      sql`${table.botCount} > 0 AND ${table.totalRounds} > 0 AND ${table.scoreLimit} > 0 AND ${table.roundSeconds} > 0`,
    ),
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
    check(
      "match_rounds_sebab_dikenal",
      sql`${table.endedReason} IN ('batas_kill', 'waktu_habis', 'ditinggal')`,
    ),
    check(
      "match_rounds_angka_wajar",
      sql`${table.roundNumber} > 0 AND ${table.playerKills} >= 0`,
    ),
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

    /**
     * Warna penanda peserta, disimpan apa adanya dengan alasan yang sama
     * seperti namanya: catatan pertandingan harus berdiri sendiri. Warna bot
     * berasal dari daftar template di kode klien, dan daftar itu boleh berubah
     * urutannya kapan saja — tanpa kolom ini, pertandingan yang dimainkan hari
     * ini akan berganti warna sendiri begitu ada lawan baru disisipkan di
     * tengah daftar.
     */
    color: text("color").notNull().default("#94a3b8"),

    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    score: integer("score").notNull().default(0),
    roundWins: integer("round_wins").notNull().default(0),
    isWinner: integer("is_winner", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("match_scores_peserta_unik").on(
      table.matchId,
      table.participantName,
    ),
    // Perolehan hanya bisa bertambah; angka negatif selalu berarti ada yang
    // salah hitung di pemanggil, dan lebih baik ketahuan saat menyimpan
    // daripada muncul sebagai papan skor yang mustahil.
    check(
      "match_scores_perolehan_wajar",
      sql`${table.kills} >= 0 AND ${table.deaths} >= 0 AND ${table.score} >= 0 AND ${table.roundWins} >= 0`,
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
