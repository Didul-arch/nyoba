# Spesifikasi Aplikasi Draf Skripsi (Markdown + SQLite)

Oct 15, 2026 · @Deedol

## Ringkasan dan keputusan utama

Aplikasi ini adalah editor markdown berbasis web untuk pemakaian pribadi, dipakai untuk menyusun draf skripsi, tracker, dan catatan bacaan. Fitur khasnya adalah sitasi yang menempel pada potongan teks dan bisa diklik untuk membuka PDF sumber di halaman yang tepat. Naskah final tetap ditulis di Word dengan cara menyalin dari aplikasi ini.

Keputusan yang membentuk semua bagian lain:

1. **Dideploy sekali ke satu server (VPS) dengan disk persisten, lalu dibuka dari browser mana pun.** Hanya ada satu pengguna, login dengan username dan password dari variabel lingkungan (env).
2. **Teks disimpan sebagai file `.md` di folder vault di server, dan vault itu adalah repo Git.** Aplikasi melakukan commit otomatis setiap kali menyimpan. Git di sini hanya untuk riwayat versi; push ke GitHub opsional sebagai cadangan.
3. **Satu file SQLite (`app.db`) di server** untuk pustaka referensi, posisi sitasi, dan indeks pencarian. Bukan untuk isi naskah.
4. **Sitasi ditulis dengan sintaks Pandoc `[@kunci, hlm. 24]`**, lalu diformat dengan file CSL milikmu lewat citeproc-js saat diekspor.
5. **Editor memakai Tiptap.** Fokus versi awal adalah menulis isi dengan cepat. Urusan format naskah ditangani belakangan lewat CSL dan fitur ekspor.
6. **Bukan tiruan Claude Docs.** Tidak ada kolaborasi, komentar, ataupun diagram interaktif. Yang ditiru hanya tab, tabel dengan dropdown, dan tampilan bersih.

## Fitur, prioritas, dan kelayakan

MVP = versi pertama yang sudah bisa dipakai untuk skripsi. Kolom penyesuaian menjelaskan perbedaan dari permintaan awal dan alasannya.

| Fitur                                                                          | Prioritas    | Kelayakan | Penyesuaian                                                                                                                 |
| ------------------------------------------------------------------------------ | ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Login satu pengguna (username dan password dari env)                           | MVP          | Mudah     | Password disimpan sebagai hash (argon2), bukan teks asli. Sesi lewat cookie httpOnly, percobaan login dibatasi, wajib HTTPS |
| Dokumen bertab (dokumen = folder, tab = file `.md`)                            | MVP          | Mudah     | Tidak ada                                                                                                                   |
| Editor Tiptap: judul, daftar, tugas, tabel, tebal/miring                       | MVP          | Sedang    | Format markdown bisa dirapikan ulang oleh editor. Perlu uji round-trip agar diff Git tidak berantakan                       |
| Dropdown status di sel tabel                                                   | MVP          | Sedang    | Pilihan didefinisikan per kolom di frontmatter. Sel tetap berisi teks biasa                                                 |
| Tautan antar-tab dan antar-dokumen                                             | MVP          | Mudah     | Pakai wikilink `[[nama]]`                                                                                                   |
| Riwayat versi                                                                  | MVP          | Mudah     | Commit Git otomatis setiap simpan. Tidak perlu sistem versi sendiri                                                         |
| Cadangan vault ke GitHub                                                       | v2           | Mudah     | Opsional: push berkala ke repo privat agar naskah tidak hilang bila server rusak                                            |
| Pustaka referensi (penulis, tahun, judul, status baca, terverifikasi, catatan) | MVP          | Mudah     | Disimpan di SQLite, ditampilkan sebagai tabel                                                                               |
| Unggah PDF ke referensi                                                        | MVP          | Mudah     | File disimpan di folder vault di server, diberi nama sesuai kunci, dicek hash-nya agar tidak ganda                          |
| Blok teks, klik kanan, lalu "Tambah referensi"                                 | MVP          | Sedang    | Menyisipkan `[@kunci, hlm. X]` setelah teks yang diblok. Rentang teks disimpan di SQLite                                    |
| Klik sitasi membuka PDF di halaman yang tepat                                  | MVP          | Mudah     | PDF.js. Navigasi ke halaman andal                                                                                           |
| "Dipakai di subbab" terisi otomatis                                            | MVP          | Mudah     | Dihitung dari tabel sitasi                                                                                                  |
| Pencarian teks penuh                                                           | MVP          | Mudah     | SQLite FTS5                                                                                                                 |
| Menyorot kalimat persis di PDF                                                 | v2           | Sulit     | Best-effort lewat pencarian teks. Gagal pada PDF hasil scan                                                                 |
| Ekspor referensi ke CSL-JSON dan BibTeX                                        | v2           | Mudah     | Untuk cadangan dan untuk dipakai di Zotero atau Word                                                                        |
| Salin untuk skripsi                                                            | v2           | Mudah     | Memakai file CSL milikmu lewat citeproc-js: `[@lazuardi2024]` menjadi (Lazuardi 2024) dan daftar pustaka tersusun otomatis  |
| Isi metadata dari DOI (Crossref)                                               | v2           | Mudah     | Hasilnya tetap dicek manual                                                                                                 |
| Chip tanggal                                                                   | v2           | Mudah     | Disimpan sebagai teks ISO                                                                                                   |
| Menandai area di PDF (kotak)                                                   | Nanti        | Sedang    | Alternatif bila sorotan teks gagal                                                                                          |
| Kolaborasi real-time, komentar, diagram                                        | Tidak dibuat | Sulit     | Di luar kebutuhan pemakaian pribadi                                                                                         |
| OCR untuk PDF hasil scan                                                       | Tidak dibuat | Sulit     | PDF scan tetap bisa dibuka per halaman                                                                                      |

## Arsitektur

&#91;embedded content: arsitektur · browser, server lokal, vault, SQLite\]

Browser dari perangkat mana pun hanya bicara dengan server lewat HTTPS, dan setiap permintaan dicek sesi loginnya. Server membaca dan menulis vault serta SQLite. Semua perubahan naskah lewat aplikasi, dan setiap simpan tercatat sebagai commit di Git lokal.

## Konvensi markdown

Semua yang tampil di editor harus tetap terbaca sebagai markdown biasa, supaya isinya bisa dibuka di Obsidian atau editor teks mana pun dan mudah disalin.

Struktur vault:

```
vault/                      repo Git (riwayat versi)
  docs/
    tracker-skripsi/        satu dokumen
      _doc.md               metadata dokumen + urutan tab
      01-progress.md        satu tab
      02-log-kerja.md
    kolokium/
      01-bab-1.md
  references/
    lazuardi2024.pdf        PDF dinamai sesuai kunci referensi
  references.json           ekspor CSL-JSON otomatis dari SQLite
  styles/
    ipb.csl                 file CSL milikmu
data/                       di luar vault, tidak masuk Git
  app.db
  backups/
```

Dropdown didefinisikan di frontmatter tab, per nama kolom. Sel tabel tetap teks biasa:

```markdown
---
title: Progress
enums:
  Status: [Belum mulai, Riset, Draf, Revisi, Disetujui pembimbing]
---

| Subbab             | Status | Langkah berikutnya       |
| ------------------ | ------ | ------------------------ |
| 1.1 Latar Belakang | Draf   | Cari sumber primer OWASP |
```

Sitasi memakai sintaks Pandoc, ditaruh setelah teks yang dirujuk:

```markdown
Broken access control naik ke peringkat pertama OWASP Top 10 2021 [@owasp2021].
Endpoint penilaian rata-rata merespons dalam 9,6 detik [@muhammad2025, hlm. 39].
```

Aturannya:

- Kunci referensi = nama belakang penulis pertama + tahun, huruf kecil, tanpa spasi. Tambah huruf bila bentrok (`annisa2024a`).
- Halaman yang ditulis di teks adalah nomor tercetak. Nomor halaman PDF hanya disimpan di SQLite untuk navigasi.
- Teks yang diblok saat menambah sitasi tidak ditandai di markdown. Rentangnya disimpan di SQLite dan disesuaikan otomatis saat teks di sekitarnya diedit.
- Tautan antar-tab memakai `[[01-progress]]` atau `[[tracker-skripsi/01-progress]]`.

## Model data SQLite

SQLite menyimpan apa yang tidak cocok ditaruh di markdown. Hanya ada satu file `app.db` di server, di luar vault. Setiap ada perubahan referensi, isinya juga diekspor ke `references.json` (CSL-JSON) di vault agar ikut ter-commit. Jadi kalau `app.db` rusak, referensi bisa dipulihkan dari Git. Salinan `app.db` dibuat setiap hari ke folder `backups/`.

```sql
CREATE TABLE refs (
  key           TEXT PRIMARY KEY,      -- lazuardi2024
  type          TEXT NOT NULL,         -- jurnal | prosiding | standar | skripsi | tesis | web
  authors       TEXT NOT NULL,         -- 'Lazuardi L'
  year          INTEGER,
  title         TEXT NOT NULL,
  venue         TEXT,                  -- jurnal / penerbit / institusi
  volume_issue  TEXT,
  pages         TEXT,
  doi           TEXT,
  url           TEXT,
  read_status   TEXT NOT NULL DEFAULT 'Belum dibaca',
  verified      INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,                  -- catatan kritis
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE ref_files (
  id            INTEGER PRIMARY KEY,
  ref_key       TEXT NOT NULL REFERENCES refs(key) ON DELETE CASCADE,
  path          TEXT NOT NULL,         -- references/lazuardi2024.pdf
  sha256        TEXT NOT NULL UNIQUE,  -- cegah file ganda
  page_offset   INTEGER                -- halaman PDF - halaman tercetak, bila tetap
);

CREATE TABLE citations (
  id            TEXT PRIMARY KEY,      -- uuid
  ref_key       TEXT NOT NULL REFERENCES refs(key),
  doc_path      TEXT NOT NULL,         -- docs/kolokium/01-bab-1.md
  anchor_text   TEXT NOT NULL,         -- teks yang diblok
  anchor_before TEXT,                  -- ~40 karakter sebelumnya, untuk mencocokkan ulang
  page_printed  TEXT,                  -- '24' (yang ditulis di naskah)
  page_index    INTEGER,               -- halaman PDF untuk navigasi
  quote         TEXT,                  -- kalimat sumber yang disorot
  status        TEXT NOT NULL DEFAULT 'ok', -- ok | lepas (teks tidak ditemukan lagi)
  created_at    TEXT NOT NULL
);

CREATE VIRTUAL TABLE docs_fts USING fts5(doc_path, title, body);
```

Kolom "Dipakai di subbab" di tracker diambil dari `citations` per `doc_path`. Status `lepas` muncul bila teks yang diblok sudah tidak ditemukan, misalnya karena dihapus atau ditulis ulang. Sitasi itu ditampilkan di panel peringatan untuk ditempel ulang.

Kolom `type` dipetakan ke tipe CSL saat diekspor: jurnal ke `article-journal`, prosiding ke `paper-conference`, skripsi dan tesis ke `thesis`, standar ke `report`, dan web ke `webpage`. Pemetaan ini yang dipakai citeproc-js bersama file CSL-mu.

## Alur sitasi

Menambah sitasi:

1. Blok teks di editor, klik kanan, lalu pilih **Tambah referensi**.
2. Pilih referensi yang sudah ada (pencarian berdasarkan kunci, penulis, atau judul), atau buat referensi baru dan pilih file PDF-nya.
3. Panel PDF terbuka di kanan. Pindah ke halaman yang dimaksud, lalu (opsional) blok kalimat sumbernya di PDF.
4. Isi nomor halaman tercetak. Bila PDF punya label halaman, isian ini terisi otomatis.
5. Aplikasi menyisipkan `[@kunci, hlm. X]` setelah teks yang diblok dan menyimpan rentang teks, halaman PDF, serta kutipan sumber ke tabel `citations`.

Membuka sitasi:

1. Klik `[@kunci, hlm. X]` di editor, atau arahkan kursor untuk melihat pratinjau (judul, penulis, kutipan sumber).
2. Panel PDF terbuka di halaman yang tersimpan.
3. Bila ada kutipan sumber, aplikasi mencarinya di lapisan teks PDF dan menyorotnya. Bila tidak ditemukan, cukup halaman yang dibuka dan muncul catatan kecil bahwa sorotan gagal.

Satu referensi bisa dipakai berkali-kali di naskah, dan setiap pemakaian punya posisi PDF sendiri. Halaman referensi menampilkan daftar semua tempat referensi itu dikutip.

## Tampilan

Tiga kolom, hanya yang dibutuhkan yang muncul:

- **Sidebar kiri (sekitar 240 px, bisa disembunyikan):** daftar dokumen, tab di bawah dokumen yang terbuka, lalu menu Referensi dan Pencarian.
- **Editor di tengah:** lebar teks maksimal sekitar 720 px, rata kiri, banyak ruang kosong. Toolbar tidak selalu tampil; format muncul saat teks diblok dan lewat pintasan keyboard.
- **Panel kanan (muncul saat dibutuhkan):** penampil PDF saat sitasi diklik, atau detail referensi. Bisa diubah lebarnya dan ditutup.

Gaya visual:

- Warna netral hangat, satu warna aksen untuk tautan dan sitasi, mendukung mode terang dan gelap.
- Huruf sans-serif untuk antarmuka. Isi naskah boleh memakai serif agar nyaman dibaca lama.
- Sitasi tampil sebagai chip kecil berwarna aksen, misalnya "Lazuardi 2024, hlm. 24", bukan teks mentah `[@...]`.
- Dropdown di tabel tampil sebagai chip berwarna lembut, satu warna per pilihan.
- Tanpa bayangan tebal atau gradasi. Garis tipis untuk memisahkan area.

## Milestone untuk Claude Code

Berikan satu milestone per sesi Claude Code, dan jangan lanjut sebelum kriteria selesainya terpenuhi. Urutan ini menaruh bagian paling berisiko, yaitu round-trip markdown, di awal.

| Milestone                 | Isi                                                                                                                             | Selesai bila                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| M0 Kerangka dan login     | SvelteKit + adapter-node, SQLite dan migrasi skema, path vault dari env, halaman login, sesi cookie, pembatasan percobaan login | Tanpa login semua halaman dan API mengembalikan redirect atau 401. Login dengan kredensial dari env berhasil        |
| M1 Vault dan editor       | Membaca/menulis dokumen dan tab, editor Tiptap dengan judul, daftar, tugas, tebal/miring, simpan otomatis                       | Buka, ubah, simpan, buka lagi: isi file identik kecuali bagian yang diubah. Ada tes round-trip untuk 10 contoh file |
| M2 Tabel dan dropdown     | Tabel GFM, enum dari frontmatter, chip dropdown, tautan `[[...]]`                                                               | Tracker Progress bisa dibuat ulang di aplikasi, dan file yang sama terbaca rapi di Obsidian                         |
| M3 Deploy dan Git         | Docker, deploy ke VPS dengan disk persisten, HTTPS lewat Caddy, commit Git otomatis setiap simpan, cadangan harian `app.db`     | Aplikasi bisa dibuka dari HP, dan setiap simpan tercatat sebagai commit                                             |
| M4 Pustaka referensi      | Tabel referensi, form tambah/edit, unggah PDF (hash), penampil PDF.js, ekspor `references.json`                                 | Referensi dengan PDF bisa ditambah, dan PDF terbuka di halaman mana pun                                             |
| M5 Sitasi                 | Menu klik kanan, sisip `[@kunci, hlm. X]`, simpan ke `citations`, klik chip membuka PDF, pencocokan ulang dan status `lepas`    | Sitasi tetap menempel setelah paragraf di sekitarnya diedit, selama teks yang diblok masih ada                      |
| M6 Pencarian dan backlink | FTS5, daftar pemakaian per referensi, kolom "Dipakai di" otomatis                                                               | Pencarian satu kata menemukan semua dokumen terkait dalam waktu kurang dari 200 ms untuk 100 file                   |
| M7 Salin untuk skripsi    | citeproc-js dengan file CSL-mu, salin subbab beserta daftar pustakanya, ekspor BibTeX                                           | Satu subbab bisa ditempel ke Word dengan sitasi dan daftar pustaka sesuai CSL                                       |

Tech stack yang disarankan (cek versi stabil terbaru saat inisialisasi):

- SvelteKit dengan adapter-node, TypeScript.
- Tiptap (ProseMirror) untuk editor, dengan ekstensi markdown dan tabel.
- better-sqlite3 untuk SQLite. Drizzle opsional untuk migrasi.
- pdfjs-dist untuk penampil PDF.
- citeproc-js untuk memformat sitasi dan daftar pustaka dengan file CSL.
- argon2 untuk hash password. Env berisi `APP_USER`, `APP_PASSWORD_HASH`, dan `SESSION_SECRET`.
- simple-git (atau perintah git langsung) untuk commit otomatis dan push cadangan opsional.
- Docker dan Caddy (HTTPS otomatis) di VPS. Hosting serverless seperti Vercel atau Netlify tidak bisa dipakai karena SQLite dan PDF butuh disk yang tidak hilang.
- Vitest untuk tes round-trip markdown.

## Pertanyaan terbuka

- [ ] VPS mana yang dipakai? Syaratnya: disk persisten, bisa menjalankan Docker, dan cukup ruang untuk PDF (sekitar 2 GB sudah lega).
- [ ] Kirim file CSL-nya untuk dicek apakah memuat format sitasi dalam teks (Nama Tahun) sekaligus daftar pustaka.
