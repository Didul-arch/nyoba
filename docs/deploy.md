# Deploy ke VPS 🚀

Target: nyoba kebuka di `https://nyoba.domainmu.com` dari HP maupun laptop. Sekali setup, habis itu tinggal `git pull` + satu perintah.

## Yang dibutuhin

- **VPS** Linux (Ubuntu/Debian), RAM 1 GB cukup, disk ±5 GB (PDF nanti makan tempat).
- **Domain/subdomain** yang bisa kamu atur DNS-nya.
- Port **80** dan **443** kebuka (Caddy butuh dua-duanya buat bikin sertifikat HTTPS).

## 1. Arahkan domain ke VPS

Di pengaturan DNS domainmu, bikin record:

| Tipe | Nama    | Isi         |
| ---- | ------- | ----------- |
| A    | `nyoba` | IP VPS kamu |

Tunggu beberapa menit sampai `ping nyoba.domainmu.com` nunjuk ke IP VPS.

## 2. Pasang Docker di VPS

```sh
curl -fsSL https://get.docker.com | sh
```

## 3. Ambil kode & isi `.env`

```sh
git clone https://github.com/Didul-arch/nyoba.git
cd nyoba
cp .env.example .env
nano .env
```

Isi:

- `APP_USER`: username login.
- `APP_PASSWORD_HASH`: dari `npm run hash-password` di laptop. **Wajib pakai kutip tunggal**, persis kayak keluaran script: `'$argon2id$v=19$...'`. Tanpa kutip, Docker Compose ngira `$...` itu variabel dan hash-nya rusak (login bakal selalu gagal).
- `SESSION_SECRET`: `openssl rand -base64 48`.
- `DOMAIN`: misal `nyoba.domainmu.com`.

`VAULT_PATH` & `DATA_PATH` nggak usah diubah; di Docker otomatis diarahkan ke volume.

## 4. Nyalain

```sh
docker compose up -d --build
```

Cek: `docker compose ps` → `app` harus `healthy`. Buka `https://nyoba.domainmu.com` dari HP. 🎉

## Sehari-hari

| Mau apa                 | Perintah (di folder `nyoba` di VPS)                        |
| ----------------------- | ---------------------------------------------------------- |
| Update ke versi terbaru | `git pull && docker compose up -d --build`                 |
| Lihat log               | `docker compose logs -f app`                               |
| Riwayat tulisan         | `docker compose exec app git -C /data/vault log --oneline` |
| Restart                 | `docker compose restart app`                               |

## Data kamu ada di mana?

Semua di volume Docker `nyoba_nyoba-data`:

```
/data/vault/        ← file .md + repo Git (riwayat tiap sesi edit)
/data/db/app.db     ← database (sesi login, nanti referensi & posisi sitasi)
/data/db/backups/   ← salinan app.db harian, disimpan 14 hari
```

Salin semuanya ke laptop (buat jaga-jaga):

```sh
docker compose cp app:/data ./cadangan-nyoba
```

> ⚠️ Jangan pernah jalanin `docker compose down -v`. Flag `-v` ngehapus volume = semua tulisanmu hilang.

## Kalau ada masalah

- **Login selalu gagal** → hash di `.env` kemungkinan nggak dikasih kutip tunggal. Benerin, lalu `docker compose up -d`.
- **HTTPS nggak jadi** → cek DNS udah nunjuk ke VPS dan port 80/443 kebuka (`ufw allow 80,443/tcp`). Lihat `docker compose logs caddy`.
- **"Kebanyakan salah"** → tunggu 15 menit; rate limit login per IP.
