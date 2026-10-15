# nyoba — catatan buat Claude

- Spek yang dipegang: `docs/spek.md`. ERD: `docs/erd.md`. Urutan kerja: `docs/roadmap.md`.
- Kerjakan **satu milestone per sesi**. Centang checklist di `docs/roadmap.md` kalau kelar.
- Markdown di vault adalah sumber kebenaran. Jangan pernah ngubah isi file `.md` user diam-diam (format ulang, hapus sel enum yang nggak valid, dll).
- Perubahan skema: tambah file migrasi baru + naikkan `PRAGMA user_version`, jangan edit `schema.sql` yang udah kepakai.
- Install deps pakai `npx npm@11 install` (npm 10 di sini kena bug `edgesOut`).
- Sebelum commit: `npm run lint && npm run check && npm test`.
- Bahasa dokumen & UI: Indonesia santai.
