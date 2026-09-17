-- Menandai pemain yang sudah menuliskan namanya sendiri.
--
-- ALTER TABLE ADD COLUMN, bukan penyalinan ulang tabel, dan itu disengaja:
-- `players` diacu `opponent_settings`, `matches`, dan `map_selections`, jadi
-- menyalinnya ulang masuk ke jebakan yang sama dengan migrasi 0003 — migrator
-- menjalankan berkasnya dalam satu transaksi, PRAGMA foreign_keys=OFF tidak
-- berlaku di sana, dan DROP TABLE dijalankan dengan kunci asing masih aktif.
-- Karena itu pula tidak ada CHECK panjang nama di sini; aturannya ditegakkan
-- pemeriksa badan permintaan.
--
-- Baris yang sudah ada mendapat `false`, dan itu jawaban yang benar: pemain
-- lama memang belum pernah melewati layar penamaan, karena layar itu baru ada.

ALTER TABLE `players` ADD `has_named` integer DEFAULT false NOT NULL;