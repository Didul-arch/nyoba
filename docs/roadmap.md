# Roadmap 🗺️

Aturan main: **satu milestone per sesi Claude Code**, jangan lompat sebelum "Selesai kalau" terpenuhi. Bagian paling rawan (round-trip markdown) sengaja ditaruh di depan.

## ✅ Init

- [x] SvelteKit + adapter-node + TypeScript
- [x] Prettier, ESLint, Vitest
- [x] Spek dikurasi, ERD, skema SQL, roadmap
- [x] Standar kode: ESLint ketat, knip, tes skema, CI GitHub Actions

## ✅ M0 — Kerangka & login 🔐

- [x] `better-sqlite3`, jalankan `schema.sql` kalau `user_version = 0`
- [x] Baca env (`APP_USER`, `APP_PASSWORD_HASH`, `SESSION_SECRET`, `VAULT_PATH`, `DATA_PATH`), gagal keras kalau ada yang kosong
- [x] Script `npm run hash-password` buat bikin hash argon2id
- [x] Halaman `/login`, sesi di tabel `sessions`, logout
- [x] Rate limit pakai `login_attempts`
- [x] `hooks.server.ts`: halaman → redirect `/login`, `/api/*` → 401

**Selesai kalau:** tanpa login semua halaman & API ditolak; login pakai kredensial env berhasil; tes buat keduanya ada.

## ✅ M1 — Vault & editor ✍️

- [x] Baca/tulis dokumen (`_doc.md`) & tab
- [x] Tiptap: judul, list, task, tebal/miring
- [x] Simpan otomatis (debounce ~1 dtk)
- [x] 10 file contoh di `tests/fixtures/` + tes round-trip

**Selesai kalau:** buka → ubah → simpan → buka lagi: file identik kecuali bagian yang diubah. 10 tes round-trip hijau.

## ✅ M2 — Tabel & dropdown 🏷️

- [x] Tabel GFM di Tiptap
- [x] Enum dari frontmatter → chip dropdown
- [x] Wikilink `[[...]]`

**Selesai kalau:** tracker Progress bisa dibikin ulang di app, file yang sama kebaca rapi di Obsidian.

### Bonus yang ikut kebawa di M0–M2

- [x] Slash menu (`/`), bubble menu pas teks diblok, toolbar tabel
- [x] Tab bisa di-drag buat ganti urutan, judul dokumen & tab bisa diedit langsung
- [x] Panel Properti (YAML frontmatter), jumlah kata, mode gelap, tampilan HP
- [x] Chip sitasi `[@kunci, hlm. X]` (baru tampilan; klik → PDF di M5)
- [x] Wikilink cocok ke slug **atau** judul; kalau belum ada, ditawarin bikin tab
- [x] Tolak simpan kalau file diubah dari luar (Obsidian) → banner konflik
- [x] File dengan format yang belum didukung (HTML, footnote) dibuka read-only dulu

## M3 — Deploy & Git 🚀

- [x] Dockerfile + `compose.yaml` (satu volume: `/data/vault` & `/data/db`)
- [x] Caddy buat HTTPS
- [x] Commit otomatis (idle 60 dtk / pindah tab)
- [x] Backup harian `app.db` → `/data/db/backups/` (simpan 14 hari)
- [x] Panduan deploy: [`docs/deploy.md`](deploy.md)
- [ ] Deploy beneran ke VPS (nunggu VPS & domain)

**Selesai kalau:** app kebuka dari HP, dan tiap sesi edit kecatat sebagai commit.

> Udah diuji di Docker lokal lewat Caddy (`https://localhost`): login, simpan, backup, restart, healthcheck. Tinggal dicoba di VPS beneran.

## M4 — Pustaka referensi 📚

- [ ] Tabel referensi + form tambah/edit (termasuk penulis berurutan)
- [ ] Upload PDF + cek sha256
- [ ] Penampil PDF.js di panel kanan
- [ ] Ekspor `references.json` tiap ada perubahan

**Selesai kalau:** referensi + PDF bisa ditambah, PDF kebuka di halaman mana aja.

## M5 — Sitasi 📌

- [ ] Klik kanan → Tambah referensi
- [ ] Sisip `[@kunci, hlm. X]` + simpan ke `citations`
- [ ] Chip sitasi → buka PDF
- [ ] Cocok ulang + status `lepas` + panel peringatan

**Selesai kalau:** sitasi tetap nempel setelah paragraf di sekitarnya diedit, selama teks yang diblok masih ada.

## M6 — Cari & backlink 🔎

- [ ] FTS5 + indeks ulang tiap simpan
- [ ] Daftar pemakaian per referensi
- [ ] Kolom "Dipakai di" otomatis

**Selesai kalau:** cari satu kata nemu semua dokumen terkait < 200 ms untuk 100 file.

## M7 — Salin untuk skripsi 📋

- [ ] citeproc-js + CSL
- [ ] Salin subbab + daftar pustaka (HTML ke clipboard, biar format kebawa ke Word)
- [ ] Ekspor BibTeX

**Selesai kalau:** satu subbab bisa ditempel ke Word dengan sitasi & daftar pustaka sesuai CSL.

---

🎓 _Setelah M7: tutup laptop, sidang, wisuda._
