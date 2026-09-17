import type { KillFeedEntry } from "@/types/game";

/**
 * Daftar kejadian tembakan mematikan terbaru, entri paling baru di atas; kill
 * oleh pemain lokal diberi sorotan.
 *
 * Penempatannya diserahkan ke pemanggil lewat `className`. Di arena daftar ini
 * melayang di pojok kanan-atas layar, sedangkan di halaman skor ia duduk biasa
 * di dalam sebuah kolom — dan posisi absolut milik arena, kalau ikut terbawa,
 * akan menimpa isi kolom di sebelahnya.
 *
 * Kelas display-nya ikut diserahkan (bawaannya `flex`), bukan dipatok di sini.
 * Arena menyembunyikan feed di layar sempit dengan `hidden lg:flex`, dan
 * `hidden` bawaan yang bertabrakan dengan `flex` bawaan akan diputuskan oleh
 * urutan aturan di stylesheet, bukan oleh urutan penulisan kelasnya — hasilnya
 * tidak bisa diandalkan.
 */
export function KillFeedList({
  entries,
  className = "flex",
  localName,
}: {
  entries: KillFeedEntry[];
  className?: string;
  /**
   * Nama pemain di perangkat ini, dipakai menyorot kill miliknya.
   *
   * Dioper, bukan dicocokkan dengan nama bawaan: sejak pemain bisa menamai
   * dirinya sendiri, pencocokan dengan nama bawaan berarti tidak pernah
   * menyorot kill siapa pun yang sudah berganti nama — dan justru menyorot
   * kill bot bila ada yang kebetulan bernama begitu.
   */
  localName: string;
}) {
  // Store menyisipkan entri baru di depan, jadi urutan array sudah terbaru
  // dulu. Jangan urutkan ulang memakai atSecond: nilainya dibaca dari jam ronde
  // yang menghitung mundur, sehingga kill terbaru justru punya angka terkecil.
  const latest = entries.slice(0, 5);

  if (latest.length === 0) return null;

  return (
    <ul className={`flex-col gap-1 ${className}`}>
      {latest.map((entry, index) => {
        const byPlayer = entry.killerName === localName;
        return (
          <li
            key={entry.id}
            className={`flex items-center justify-end gap-1.5 rounded border px-2 py-1 text-[11px] backdrop-blur-sm ${
              byPlayer
                ? "border-emerald-400/30 bg-emerald-950/60"
                : "border-white/10 bg-slate-950/60"
            }`}
            style={{ opacity: 1 - index * 0.15 }}
          >
            <span
              className={`font-semibold ${
                byPlayer ? "text-emerald-300" : "text-slate-200"
              }`}
            >
              {entry.killerName}
            </span>
            <span className="text-slate-500">{entry.weaponName}</span>
            {entry.isHeadshot ? (
              <span
                className="text-amber-300"
                title="Headshot"
                aria-label="Headshot"
              >
                ◎
              </span>
            ) : null}
            <span className="text-slate-600">→</span>
            <span className="text-slate-400">{entry.victimName}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Penempatan kill feed di arena: melayang di pojok kanan-atas, hanya di layar lebar. */
export function KillFeed({
  entries,
  localName,
}: {
  entries: KillFeedEntry[];
  localName: string;
}) {
  return (
    <KillFeedList
      entries={entries}
      localName={localName}
      className="pointer-events-none absolute top-4 right-5 hidden w-64 lg:flex"
    />
  );
}
