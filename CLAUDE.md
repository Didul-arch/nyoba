# nyoba — catatan buat Claude

Spek yang dipegang: `docs/spek.md`. ERD: `docs/erd.md`. Urutan kerja: `docs/roadmap.md`.

## Cara kerja

- **Satu milestone per sesi.** Kerjakan cuma checklist milestone itu, jangan nyicil fitur milestone lain. Centang `docs/roadmap.md` kalau kelar.
- **MVP dulu.** Fitur berlabel v2 / Nanti di `docs/spek.md` jangan dibikin, jangan disiapin "biar gampang nanti".
- Markdown di vault adalah sumber kebenaran. Jangan pernah ngubah isi file `.md` user diam-diam (format ulang, hapus sel enum yang nggak valid, dll).
- Perubahan skema: tambah file migrasi baru + naikkan `PRAGMA user_version`, jangan edit `schema.sql` yang udah kepakai.

## Aturan dependency (keras)

- **Tambah package cuma kalau kode di commit yang sama langsung memakainya.** Nggak ada "install dulu, pakai nanti".
- Sebelum nambah package, cek dulu: bisa pakai API bawaan Node / Web / SvelteKit? (`node:crypto`, `node:sqlite`, `node:fs`, `fetch`, `URL`, `Intl`, form actions, dll.) Kalau bisa, jangan nambah.
- Setiap package baru: tulis alasannya satu baris di pesan commit.
- Versi dipasang persis (`save-exact=true` di `.npmrc`). Jangan pakai `latest` / range lebar.
- Hapus package begitu nggak dipakai lagi. `npm run knip` harus bersih: nggak ada dependency, file, atau export yang nganggur.
- Install pakai `npx npm@11 install` (npm 10 di sini kena bug `edgesOut`).

## Standar kode

- TypeScript strict. Dilarang `any`, non-null assertion `!`, dan `@ts-ignore`. Kalau terpaksa, pakai `@ts-expect-error` + alasan.
- Jangan matikan aturan lint pakai `eslint-disable`. Benerin kodenya.
- Kode server (DB, vault, git, env) cuma di `src/lib/server/`, biar nggak kebawa ke browser.
- Nggak ada kode mati, file demo, atau komentar kode yang di-comment-out.
- Fitur baru = tes baru. Logika murni (parser markdown, re-anchor sitasi, pembuat kunci) wajib ada unit test.
- `console.log` dilarang di kode yang di-commit (`console.warn` / `console.error` boleh).

## Sebelum commit

```sh
npm run verify   # lint (prettier + eslint --max-warnings 0) + svelte-check + knip + vitest
npm run build
```

Semua harus hijau. CI (`.github/workflows/ci.yml`) ngejalanin hal yang sama.

## Jebakan SvelteKit 3 (udah pernah kena)

- `$lib` udah nggak ada. Pakai `#lib/...` **dengan ekstensi**: `import { api } from '#lib/api.ts'`.
- Tipe hook (`Handle`, `ServerInit`) dari `@sveltejs/kit/hooks`.
- `href` / `goto` wajib lewat `resolve()` dari `$app/paths`, pakai ID route lengkap termasuk grup: `resolve('/(app)/d/[doc]/[tab]', { doc, tab })`.
- Env server dibaca dari `process.env` (`src/lib/server/config.ts`), diisi `node --env-file`. Jangan pakai `$env/*`: Vite ngerusak `$` di hash argon2.
- adapter-node v6 nggak baca `ORIGIN`; build produksi di HTTP polos bakal kena 403 CSRF. Lokal pakai `npm run dev`.
- `$effect` yang manggil `editor.view.dispatch` harus dibungkus `untrack()`, kalau nggak: loop `effect_update_depth_exceeded`.
- Hash argon2 di `.env` wajib kutip tunggal (`'$argon2id$...'`): Docker Compose juga ngembangin `$`. `node --env-file` ngebuang kutipnya.
- Perintah git ke vault selalu pakai `--git-dir`/`--work-tree` eksplisit (`src/lib/server/git.ts`), biar nggak nyasar commit ke repo induk.
- Input rule Tiptap buat node chip: pakai `InputRule` sendiri yang ganti seluruh match; `nodeInputRule` ninggalin kurung.

## Bahasa

Dokumen, UI, pesan error ke user, dan nama tes: Indonesia santai. Nama variabel/fungsi: Inggris.
