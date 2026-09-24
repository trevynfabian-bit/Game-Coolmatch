import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
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

    /** Kill beruntun terpanjang pemain dalam satu nyawa di pertandingan ini. */
    bestStreak: integer("best_streak").notNull().default(0),

    /** Senjata yang dibawa pemain masuk arena (atau yang dicoba di uji coba). */
    weaponId: text("weapon_id"),

    /**
     * Potret loadout hadiah killstreak saat pertandingan dimulai (tombol 6, 7,
     * 8). Mengganti loadout di tengah pertandingan tidak mengubah hadiah yang
     * sah untuk pertandingan yang sedang berjalan.
     */
    killstreakLoadout: text("killstreak_loadout", { mode: "json" })
      .$type<(string | null)[]>()
      .notNull()
      .default(sql`'[]'`),

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

/** Statistik senjata yang bisa ditingkatkan; sama dengan `UpgradeStat` di klien. */
export const UPGRADE_STATS = ["damage", "accuracy", "reload"] as const;

/** Slot attachment; sama dengan `AttachmentSlot` di klien. */
export const ATTACHMENT_SLOTS = ["laras", "magasin", "pegangan", "bidikan"] as const;

/**
 * Katalog tingkat upgrade: satu baris per (senjata, statistik, tingkat).
 *
 * Sumber kebenarannya katalog di kode (`lib/economy/upgrade-catalog`); tabel
 * ini salinannya yang diselaraskan server, supaya harga yang dibayar pemain
 * bisa diaudit dan kunci asing kepemilikan sah.
 */
export const weaponUpgrades = sqliteTable(
  "weapon_upgrades",
  {
    weaponId: text("weapon_id").notNull(),
    stat: text("stat", { enum: UPGRADE_STATS }).notNull(),
    level: integer("level").notNull(),
    price: integer("price").notNull(),
    /** Bonus kumulatif sampai tingkat ini, dalam persen. */
    bonusPercent: integer("bonus_percent").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.weaponId, table.stat, table.level] }),
    check("weapon_upgrades_harga_positif", sql`${table.price} > 0`),
  ],
);

/** Katalog attachment, diselaraskan dari kode seperti `weapon_upgrades`. */
export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slot: text("slot", { enum: ATTACHMENT_SLOTS }).notNull(),
    price: integer("price").notNull(),
    /** Jenis senjata yang cocok, sebagai larik JSON. */
    compatibleTypes: text("compatible_types", { mode: "json" }).$type<string[]>().notNull(),
    /** Pengubah statistik dalam persen, sebagai objek JSON. */
    modifiers: text("modifiers", { mode: "json" }).$type<Record<string, number>>().notNull(),
  },
  (table) => [check("attachments_harga_positif", sql`${table.price} > 0`)],
);

/**
 * Tingkat upgrade yang sudah dibeli pemain per senjata dan statistik. Satu
 * baris per pasangan; tingkatnya naik satu per satu saat pembelian.
 */
export const playerUpgrades = sqliteTable(
  "player_upgrades",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    weaponId: text("weapon_id").notNull(),
    stat: text("stat", { enum: UPGRADE_STATS }).notNull(),
    level: integer("level").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.weaponId, table.stat] }),
    check("player_upgrades_tingkat_sah", sql`${table.level} >= 0`),
  ],
);

/**
 * Attachment yang dimiliki pemain untuk satu senjata. Dibeli per senjata:
 * peredam untuk Garuda AR tidak otomatis terpasang di Vektor.
 *
 * `slot` disalin dari katalog supaya indeks unik parsial bisa menjamin paling
 * banyak SATU attachment terpasang per slot per senjata, langsung di database.
 */
export const playerAttachments = sqliteTable(
  "player_attachments",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    weaponId: text("weapon_id").notNull(),
    attachmentId: text("attachment_id")
      .notNull()
      .references(() => attachments.id, { onDelete: "restrict" }),
    slot: text("slot", { enum: ATTACHMENT_SLOTS }).notNull(),
    isEquipped: integer("is_equipped", { mode: "boolean" }).notNull().default(false),
    purchasedAt: integer("purchased_at").notNull().default(now),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.weaponId, table.attachmentId] }),
    uniqueIndex("player_attachments_satu_per_slot")
      .on(table.playerId, table.weaponId, table.slot)
      .where(sql`${table.isEquipped} = 1`),
  ],
);

/** Tingkat kelangkaan skin; sama dengan `SkinRarity` di klien. */
export const SKIN_RARITIES = ["umum", "langka", "epik", "gold"] as const;

/** Pola cat skin; sama dengan `SkinPattern` di klien. */
export const SKIN_PATTERNS = ["polos", "loreng", "digital", "garis", "bendera", "logam"] as const;

/**
 * Katalog skin & camo, diselaraskan dari `lib/economy/skin-catalog` seperti
 * katalog upgrade. Camo bertema negara mengisi `country_code`.
 */
export const skins = sqliteTable(
  "skins",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    rarity: text("rarity", { enum: SKIN_RARITIES }).notNull(),
    pattern: text("pattern", { enum: SKIN_PATTERNS }).notNull(),
    colors: text("colors", { mode: "json" }).$type<string[]>().notNull(),
    countryCode: text("country_code"),
    countryName: text("country_name"),
    price: integer("price").notNull(),
  },
  (table) => [
    index("skins_tingkat_idx").on(table.rarity),
    check("skins_harga_positif", sql`${table.price} > 0`),
  ],
);

/** Skin yang dimiliki pemain. Dibeli sekali, bisa dipasang di senjata mana pun. */
export const playerSkins = sqliteTable(
  "player_skins",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    skinId: text("skin_id")
      .notNull()
      .references(() => skins.id, { onDelete: "restrict" }),
    purchasedAt: integer("purchased_at").notNull().default(now),
  },
  (table) => [primaryKey({ columns: [table.playerId, table.skinId] })],
);

/**
 * Skin yang terpasang per senjata pemain; satu baris per senjata. Kunci asing
 * gabungan ke `player_skins` menjamin di tingkat database bahwa hanya skin
 * yang benar-benar dimiliki yang bisa dipasang.
 */
export const playerWeaponSkins = sqliteTable(
  "player_weapon_skins",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    weaponId: text("weapon_id").notNull(),
    skinId: text("skin_id").notNull(),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (table) => [
    primaryKey({ columns: [table.playerId, table.weaponId] }),
    foreignKey({
      columns: [table.playerId, table.skinId],
      foreignColumns: [playerSkins.playerId, playerSkins.skinId],
      name: "player_weapon_skins_dimiliki_fk",
    }).onDelete("cascade"),
  ],
);

/** Statistik pemain yang bisa menjadi syarat buka hadiah; sama dengan `AchievementStat`. */
export const ACHIEVEMENT_STATS = ["totalKills", "bestStreak", "wins"] as const;

/** Id hadiah killstreak; sama dengan `KillstreakId` di klien. */
export const KILLSTREAK_IDS = ["uav", "serangan_udara", "helikopter"] as const;

/**
 * Katalog hadiah killstreak, diselaraskan dari `lib/game/killstreak`.
 * `unlock_price` nol berarti hadiah terbuka sejak awal; selain itu pemain
 * harus membukanya dulu (Fase 4: syarat buka hadiah).
 */
export const killstreakRewards = sqliteTable(
  "killstreak_rewards",
  {
    id: text("id", { enum: KILLSTREAK_IDS }).primaryKey(),
    name: text("name").notNull(),
    killsRequired: integer("kills_required").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    unlockPrice: integer("unlock_price").notNull().default(0),
    /**
     * Jalan kedua membuka hadiah: statistik pemain (`unlock_stat`) mencapai
     * `unlock_value`. Keduanya kosong bila hadiah hanya bisa dibeli.
     */
    unlockStat: text("unlock_stat", { enum: ACHIEVEMENT_STATS }),
    unlockValue: integer("unlock_value"),
  },
  (table) => [
    check("killstreak_rewards_kill_positif", sql`${table.killsRequired} > 0`),
    check("killstreak_rewards_harga_sah", sql`${table.unlockPrice} >= 0`),
  ],
);

/**
 * Hadiah killstreak yang sudah dibuka pemain, lewat koin maupun pencapaian.
 * `via` mencatat jalannya supaya riwayat dan dialog perayaan bisa membedakan.
 */
export const playerKillstreakUnlocks = sqliteTable(
  "player_killstreak_unlocks",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    rewardId: text("reward_id", { enum: KILLSTREAK_IDS })
      .notNull()
      .references(() => killstreakRewards.id, { onDelete: "cascade" }),
    via: text("via", { enum: ["koin", "pencapaian"] }).notNull().default("koin"),
    unlockedAt: integer("unlocked_at").notNull().default(now),
    /** Kapan dialog perayaannya sudah dilihat; kosong berarti belum (pola `announced_at`). */
    announcedAt: integer("announced_at"),
  },
  (table) => [primaryKey({ columns: [table.playerId, table.rewardId] })],
);

/**
 * Loadout hadiah killstreak pemain: sampai tiga hadiah yang dibawa ke arena,
 * urut sesuai tombol 6, 7, 8. Satu baris per pemain; slot kosong berarti
 * tidak ada hadiah di tombol itu.
 */
export const killstreakLoadouts = sqliteTable("killstreak_loadouts", {
  playerId: integer("player_id")
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  slot1: text("slot1", { enum: KILLSTREAK_IDS }),
  slot2: text("slot2", { enum: KILLSTREAK_IDS }),
  slot3: text("slot3", { enum: KILLSTREAK_IDS }),
  updatedAt: integer("updated_at").notNull().default(now),
});

/** Jenis kejadian killstreak dalam sebuah pertandingan. */
export const KILLSTREAK_EVENT_KINDS = ["terbuka", "dipakai", "kill"] as const;

/**
 * Kejadian killstreak per pertandingan: hadiah terbuka, dipanggil, dan kill
 * yang dihasilkannya. Dipakai server untuk memeriksa kill beruntun yang
 * diklaim klien dan untuk ringkasan hadiah di riwayat pertandingan.
 */
export const matchKillstreakEvents = sqliteTable(
  "match_killstreak_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    rewardId: text("reward_id", { enum: KILLSTREAK_IDS }).notNull(),
    kind: text("kind", { enum: KILLSTREAK_EVENT_KINDS }).notNull(),
    /** Kill beruntun pemain saat kejadian. */
    streak: integer("streak").notNull().default(0),
    at: integer("at").notNull().default(now),
  },
  (table) => [index("match_killstreak_events_pertandingan_idx").on(table.matchId, table.kind)],
);

/** Jenis item yang bisa difavoritkan; sama dengan `FavoriteKind` di klien. */
export const FAVORITE_KINDS = ["senjata", "skin"] as const;

/**
 * Penanda favorit pemain di galeri koleksi. Satu baris per item; urutan
 * penandaan disimpan lewat `created_at` supaya favorit terbaru bisa
 * ditampilkan lebih dulu bila perlu.
 */
export const playerFavorites = sqliteTable(
  "player_favorites",
  {
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: FAVORITE_KINDS }).notNull(),
    itemId: text("item_id").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (table) => [primaryKey({ columns: [table.playerId, table.kind, table.itemId] })],
);

/**
 * Kejadian kill selama pertandingan, dikirim klien bertahap supaya skor
 * langsung tersedia di server (papan skor, penonton, pemulihan bila tab
 * tertutup). `seq` adalah nomor urut dari klien per pertandingan; kunci unik
 * (match_id, seq) membuat pengiriman ulang batch yang sama tidak menggandakan.
 */
export const matchKillEvents = sqliteTable(
  "match_kill_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    roundNumber: integer("round_number").notNull(),
    killerName: text("killer_name").notNull(),
    victimName: text("victim_name").notNull(),
    weaponName: text("weapon_name").notNull(),
    isHeadshot: integer("is_headshot", { mode: "boolean" }).notNull().default(false),
    /** Bacaan jam ronde saat kejadian, detik. */
    atSecond: integer("at_second").notNull().default(0),
    createdAt: integer("created_at").notNull().default(now),
  },
  (table) => [
    uniqueIndex("match_kill_events_urutan_uq").on(table.matchId, table.seq),
    check("match_kill_events_urutan_positif", sql`${table.seq} >= 1 AND ${table.roundNumber} >= 1`),
  ],
);

/** Jenis notifikasi hadiah; sama dengan `RewardNotificationKind` di klien. */
export const REWARD_NOTIFICATION_KINDS = ["koin", "skin", "upgrade", "hadiah", "senjata"] as const;

/**
 * Kotak masuk hadiah pemain: satu baris per hadiah yang pantas diumumkan
 * (koin dari pertandingan, skin, upgrade, hadiah killstreak, senjata baru).
 * `seen_at` kosong berarti belum dilihat — pola yang sama dengan
 * `announced_at`. `source_id` membuat pencatatan idempoten: peristiwa yang
 * sama (mis. "pertandingan:12") tidak pernah menghasilkan dua notifikasi.
 */
export const rewardNotifications = sqliteTable(
  "reward_notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: REWARD_NOTIFICATION_KINDS }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Id item terkait (skin, hadiah, senjata) untuk ikon dan tautan. */
    itemId: text("item_id"),
    /** Jumlah koin, wajib untuk notifikasi koin. */
    amount: integer("amount"),
    sourceId: text("source_id").notNull(),
    createdAt: integer("created_at").notNull().default(now),
    seenAt: integer("seen_at"),
  },
  (table) => [
    uniqueIndex("reward_notifications_sumber_uq").on(table.playerId, table.sourceId),
    index("reward_notifications_kotak_masuk_idx").on(table.playerId, table.createdAt),
    index("reward_notifications_belum_dilihat_idx").on(table.playerId, table.seenAt),
    check("reward_notifications_koin_ada_jumlah", sql`${table.kind} <> 'koin' OR (${table.amount} IS NOT NULL AND ${table.amount} > 0)`),
    check("reward_notifications_judul_tidak_kosong", sql`length(${table.title}) > 0`),
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

export type WeaponUpgradeRow = typeof weaponUpgrades.$inferSelect;
export type AttachmentRow = typeof attachments.$inferSelect;
export type PlayerUpgradeRow = typeof playerUpgrades.$inferSelect;
export type PlayerAttachmentRow = typeof playerAttachments.$inferSelect;
export type SkinRow = typeof skins.$inferSelect;
export type PlayerSkinRow = typeof playerSkins.$inferSelect;
export type PlayerWeaponSkinRow = typeof playerWeaponSkins.$inferSelect;
export type KillstreakRewardRow = typeof killstreakRewards.$inferSelect;
export type KillstreakLoadoutRow = typeof killstreakLoadouts.$inferSelect;
export type MatchKillstreakEventRow = typeof matchKillstreakEvents.$inferSelect;
export type PlayerFavoriteRow = typeof playerFavorites.$inferSelect;
export type RewardNotificationRow = typeof rewardNotifications.$inferSelect;
export type NewRewardNotificationRow = typeof rewardNotifications.$inferInsert;
export type MatchKillEventRow = typeof matchKillEvents.$inferSelect;
