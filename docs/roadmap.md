# Roadmap 🗺️

Aturan main: **satu milestone per sesi Claude Code**, jangan lompat sebelum "Selesai kalau" terpenuhi. Bagian paling rawan (round-trip markdown) sengaja ditaruh di depan.

## ✅ Init

- [x] SvelteKit + adapter-node + TypeScript
- [x] Prettier, ESLint, Vitest
- [x] Spek dikurasi, ERD, skema SQL, roadmap

## M0 — Kerangka & login 🔐

- [ ] `better-sqlite3`, jalankan `schema.sql` kalau `user_version = 0`
- [ ] Baca env (`APP_USER`, `APP_PASSWORD_HASH`, `SESSION_SECRET`, `VAULT_PATH`, `DATA_PATH`), gagal keras kalau ada yang kosong
- [ ] Script `npm run hash-password` buat bikin hash argon2id
- [ ] Halaman `/login`, sesi di tabel `sessions`, logout
- [ ] Rate limit pakai `login_attempts`
- [ ] `hooks.server.ts`: halaman → redirect `/login`, `/api/*` → 401

**Selesai kalau:** tanpa login semua halaman & API ditolak; login pakai kredensial env berhasil; tes buat keduanya ada.

## M1 — Vault & editor ✍️

- [ ] Baca/tulis dokumen (`_doc.md`) & tab
- [ ] Tiptap: judul, list, task, tebal/miring
- [ ] Simpan otomatis (debounce ~1 dtk)
- [ ] 10 file contoh di `tests/fixtures/` + tes round-trip

**Selesai kalau:** buka → ubah → simpan → buka lagi: file identik kecuali bagian yang diubah. 10 tes round-trip hijau.

## M2 — Tabel & dropdown 🏷️

- [ ] Tabel GFM di Tiptap
- [ ] Enum dari frontmatter → chip dropdown
- [ ] Wikilink `[[...]]`

**Selesai kalau:** tracker Progress bisa dibikin ulang di app, file yang sama kebaca rapi di Obsidian.

## M3 — Deploy & Git 🚀

- [ ] Dockerfile + `docker-compose.yml` (volume `vault/` & `data/`)
- [ ] Caddy buat HTTPS
- [ ] Commit otomatis (idle 60 dtk / pindah tab)
- [ ] Backup harian `app.db` → `data/backups/` (simpan 14 hari)

**Selesai kalau:** app kebuka dari HP, dan tiap sesi edit kecatat sebagai commit.

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
