# Backend PocketBase (Ncmaz/Blogku)

PocketBase v0.40.6 kustom: schema, seed, dan Go hooks di-build langsung ke binary
(`main.go`). Tidak bergantung pada `pb_migrations`/`pb_hooks` runtime.

## Membangun lokal

```bash
cd backend
go mod tidy
go build -o ncmaz-backend.exe .
```

Menjalankan lokal (data di `./pb_data`):

```bash
# opsi: set superuser sekali untuk akses Admin API
export PB_SUPERUSER_EMAIL=admin@example.com
export PB_SUPERUSER_PASSWORD=change-me

./ncmaz-backend.exe serve --http=127.0.0.1:8090 --dir=pb_data --dev
```

## Image Docker

```bash
docker build -t ncmaz-backend:latest .
docker run --rm -p 8090:8090 \
  -e PB_SUPERUSER_EMAIL=admin@example.com \
  -e PB_SUPERUSER_PASSWORD=change-me \
  -v pb_data:/app/pb_data \
  ncmaz-backend:latest
```

## Yang dilakukan `main.go`

- Membuat koleksi sesuai `docs/backend-integration-spec.md` §4:
  `users` (auth), `posts`, `categories`, `tags`, `comments`, `reactions`,
  `media`, `site_settings`, `editor_settings`, `pages`.
- Collection rules §6.3 (RBAC).
- Seed: `site_settings`, `editor_settings`, halaman `about/contact/privacy`,
  serta user demo: `admin/admin12345`, `demo/demo12345`,
  `subscriber/sub12345` (ganti via env `SEED_*_PASSWORD`).
- Superuser dibuat dari `PB_SUPERUSER_EMAIL`/`PB_SUPERUSER_PASSWORD`.
- Go hooks:
  - role guard users (sign-up → `subscriber`; non-admin tak bisa ubah role;
    admin tidak bisa demote diri sendiri / admin terakhir),
  - `allowRegistration` dari `site_settings`,
  - `author`/`user` diisi server untuk posts/comments/reactions,
  - slug unik otomatis + `readingTime` untuk posts,
  - maksimal 5 tag per post,
  - sanitasi HTML `posts.content` & `pages.body` (bluemonday),
  - counter `postCount`, `commentCount`, `likeCount`.

## Keselarasan frontend

`PocketBaseSource` sekarang mengambil `site_settings`/`editor_settings` sebagai
record pertama (bukan ID tetap), sehingga cocok dengan koleksi singleton hasil
bootstrap ini.

## Status deploy (NEO App)

- Live custom backend (schema + seed + hooks): `https://d6gz0ol.app.neoapp.id`
- Superuser: `admin@blogku.com` / `BioOK-2026-ncmaz`
- Demo users: `admin/admin12345`, `demo/demo12345`, `subscriber/sub12345`
- Hubungkan frontend saat build:
  ```dotenv
  VITE_USE_POCKETBASE=true
  VITE_PB_URL=https://d6gz0ol.app.neoapp.id
  ```
- Catatan: NEO App dipakai tanpa volume persisten → `pb_data` dapat hilang saat
  redeploy. Untuk produksi pastikan `pb_data` dipersistenkan atau pakai storage S3.
