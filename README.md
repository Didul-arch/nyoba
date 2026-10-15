# nyoba 🧪

> Skripsi itu berat. Editornya jangan.

**nyoba** adalah editor markdown pribadi buat ngerjain draf skripsi, tracker progres, dan catatan bacaan. Jurus andalannya: **sitasi yang nempel ke potongan teks** — klik `[@lazuardi2024, hlm. 24]`, PDF-nya langsung kebuka di halaman yang bener. Nggak ada lagi "eh ini kutipan dari mana ya" jam 2 pagi.

Naskah final tetap di Word (ya gimana, kampus). nyoba cuma tempat mikir & nulis cepet, terus tinggal salin.

## Isi kotak

- 📝 **Editor Tiptap** — judul, list, checklist, tabel, tebal/miring. Hasilnya tetap file `.md` biasa yang bisa dibuka di Obsidian.
- 🗂️ **Dokumen bertab** — dokumen = folder, tab = file `.md`.
- 🏷️ **Dropdown di tabel** — status "Draf / Revisi / ACC" tampil sebagai chip warna-warni, tapi di file tetap teks polos.
- 📚 **Pustaka referensi** + upload PDF.
- 📌 **Sitasi nempel** — blok teks → klik kanan → _Tambah referensi_ → beres.
- 🔎 **Cari teks penuh** pakai SQLite FTS5.
- 🕰️ **Mesin waktu gratis** — vault-nya repo Git, tiap simpan jadi commit.

## Dokumen proyek

| File                                                           | Isinya                                         |
| -------------------------------------------------------------- | ---------------------------------------------- |
| [`docs/spek.md`](docs/spek.md)                                 | Spesifikasi hasil kurasi (versi yang dipegang) |
| [`docs/erd.md`](docs/erd.md)                                   | ERD + penjelasan tiap tabel                    |
| [`docs/roadmap.md`](docs/roadmap.md)                           | Milestone M0–M7 dalam bentuk checklist         |
| [`docs/spek-asli.md`](docs/spek-asli.md)                       | Spek mentah awal, buat arsip                   |
| [`src/lib/server/db/schema.sql`](src/lib/server/db/schema.sql) | Skema SQLite yang siap dipakai                 |

## Jalanin

Butuh Node 22+.

```sh
cp .env.example .env    # isi kredensialnya
npm install
npm run dev
```

> ⚠️ Kalau `npm install` error `Cannot read properties of null (reading 'edgesOut')`, itu bug npm 10. Pakai `npx npm@11 install`.

Perintah lain:

```sh
npm run check   # typecheck svelte + ts
npm run lint    # prettier + eslint
npm test        # vitest (nanti ada tes round-trip markdown di sini)
npm run build   # build buat adapter-node
```

## Stack

SvelteKit (adapter-node) · TypeScript · Tiptap · better-sqlite3 · pdfjs-dist · citeproc-js · argon2 · Git · Docker + Caddy · Vitest

## Status

🚧 Baru selesai **init**. Lagi otw **M0 — kerangka & login**. Lihat [roadmap](docs/roadmap.md).
