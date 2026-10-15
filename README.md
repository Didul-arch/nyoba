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
| [`docs/deploy.md`](docs/deploy.md)                             | Cara deploy ke VPS (Docker + Caddy)            |
| [`docs/spek-asli.md`](docs/spek-asli.md)                       | Spek mentah awal, buat arsip                   |
| [`src/lib/server/db/schema.sql`](src/lib/server/db/schema.sql) | Skema SQLite yang siap dipakai                 |

## Jalanin

Butuh Node 22.13+ dan `git`.

```sh
cp .env.example .env    # lalu isi (lihat di bawah)
npx npm@11 install      # npm 10 kena bug `edgesOut`
npm run hash-password   # ketik password → salin hasilnya ke APP_PASSWORD_HASH
npm run dev             # buka http://localhost:5173
```

Isi `SESSION_SECRET` pakai string acak, misal `openssl rand -base64 48`.

> Di laptop pakai `npm run dev`. Buat dipakai dari HP, deploy ke VPS: `docker compose up -d --build` — langkah lengkapnya di [`docs/deploy.md`](docs/deploy.md).

Semua tulisanmu ada di `vault/` (file `.md` biasa + repo Git); database kecil di `.data/app.db`. Dua-duanya nggak ikut ke repo ini.

## Cara pakai

| Mau apa                         | Caranya                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Dokumen baru                    | `+` di sebelah **Dokumen** di sidebar                                                                           |
| Tab baru                        | `+` di ujung bar tab (bisa di-drag buat ganti urutan)                                                           |
| Sisip judul / tabel / checklist | ketik `/` di baris kosong                                                                                       |
| Tebal, miring, tautan           | blok teks → menu kecil muncul (atau `Ctrl+B`, `Ctrl+I`)                                                         |
| Markdown langsung               | `# `, `## `, `- `, `1. `, `[ ] `, `> `, ` ``` ` di awal baris                                                   |
| Dropdown status di tabel        | `⋯` → **Tampilkan properti**, tulis `enums: { Status: [Draf, Revisi, ACC] }`, lalu klik sel di kolom **Status** |
| Tautan ke tab lain              | ketik `[[Judul Tab]]` atau `[[dokumen/tab]]`                                                                    |
| Sitasi                          | ketik `[@kunci, hlm. 24]` → jadi chip                                                                           |
| Simpan                          | otomatis (~1 dtk). `Ctrl+S` kalau nggak sabar                                                                   |
| Buka tautan biasa               | `Ctrl`/`Cmd` + klik                                                                                             |
| Riwayat                         | `cd vault && git log` — tiap sesi edit jadi commit                                                              |

## Perintah dev

```sh
npm run verify  # semua cek sekaligus (wajib hijau sebelum commit)
npm run lint    # prettier + eslint, warning dihitung error
npm run check   # typecheck svelte + ts
npm run knip    # cari dependency / file / export yang nganggur
npm test        # vitest (round-trip markdown, auth, vault, git)
npm run build   # build buat adapter-node
```

## Stack

SvelteKit (adapter-node) · TypeScript · Tiptap · better-sqlite3 · pdfjs-dist · citeproc-js · argon2 · Git · Docker + Caddy · Vitest

## Status

✅ M0 (login), M1 (vault & editor), M2 (tabel & dropdown) beres. M3 (Docker + Caddy + backup harian) siap, tinggal dicoba di VPS. Berikutnya: **M4 — pustaka referensi**. Lihat [roadmap](docs/roadmap.md).
