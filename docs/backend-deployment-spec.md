# Spesifikasi Deployment & Integrasi Backend PocketBase

| Metadata | Nilai |
| :--- | :--- |
| **Status** | Draf (panduan implementasi) |
| **Target backend** | PocketBase `v0.40.6` (Go, SQLite WAL) |
| **Frontend** | Vue 3 SPA (Vite), adapter `PocketBaseSource` |
| **Tanggal revisi** | 2026-10-25 |
| **Referensi** | [`backend-integration-spec.md`](./backend-integration-spec.md) (skema, RBAC, hooks, rate limit) |

> Dokumen ini menjelaskan cara **men-deploy dan mengintegrasikan backend PocketBase**
> dengan frontend Ncmaz/Blogku. Skema koleksi, collection rules, Go hooks, dan
> middleware rate limit dijelaskan di `backend-integration-spec.md`; dokumen ini
> fokus ke proses penerapan, konfigurasi produksi, dan verifikasi.

---

## 1. Tujuan & Ruang Lingkup

Tujuan dokumen ini:

1. Menyediakan langkah reproducible untuk menjalankan PocketBase sebagai backend produksi.
2. Menjelaskan bagaimana frontend dihubungkan ke backend (URL publik + flag mode).
3. Menentukan konfigurasi keamanan produksi (TLS, trusted proxy, CSP, storage).
4. Menyediakan prosedur backup, monitoring, rollout, dan rollback.
5. Memberi checklist verifikasi integrasi frontend–backend.

Di luar cakupan: migrasi data lama, multi-tenant, clustering/sharding PocketBase,
dan pencarian full-text eksternal.

---

## 2. Arsitektur Deployment

```text
┌───────────────────────────────────────────────┐
│ Client browser                                 │
│  Vue 3 SPA (Vite) → `PocketBaseSource`         │
└───────────────────────┬───────────────────────┘
                        │ HTTPS
                        ▼
┌───────────────────────────────────────────────┐
│ Reverse proxy / edge (Caddy / Nginx / Cloudflare)│
│  TLS, HSTS, compress, rate limit edge opsional │
└───────────────────────┬───────────────────────┘
                        │ HTTP/1.1 (localhost)
                        ▼
┌───────────────────────────────────────────────┐
│ PocketBase (1 binary, Go)                      │
│  ├─ REST + Realtime (SSE)                      │
│  ├─ SQLite WAL: pb_data/data.db                │
│  ├─ pb_migrations (schema)                     │
│  ├─ pb_hooks (Go virtual file)                 │
│  └─ Storage: local / S3 (R2, MinIO, AWS S3)    │
└───────────────────────────────────────────────┘
```

- Frontend adalah SPA statis. Backend disajikan sebagai **satu origin** atau
  **origin terpisah** (subdomain). Keduanya didukung.
- Realtime memakai SSE; pastikan proxy menyetel header/Anti-Buffering dan timeout
  yang memadai.

---

## 3. Konfigurasi Frontend

### 3.1 Environment variables

| Variabel | Wajib | Default | Keterangan |
| :--- | :---: | :--- | :--- |
| `VITE_USE_POCKETBASE` | Ya | `false` | `true` → pakai `PocketBaseSource`; `false` → `MockSource` (dev/demo saja) |
| `VITE_PB_URL` | Ya (bila `true`) | `http://127.0.0.1:8090` | URL **publik** PocketBase (harus `https://` di produksi), tanpa trailing slash |

Contoh `frontend/.env.production`:

```dotenv
VITE_USE_POCKETBASE=true
VITE_PB_URL=https://api.contoh.com
```

> Catatan: `VITE_*` di-inline saat build. Ubah URL berarti build ulang. Bila ingin
> URL runtime, gunakan runtime config terpisah (di luar cakupan dokumen ini).

### 3.2 Build & serve SPA

```bash
cd frontend
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
# output: frontend/dist
```

Serve `dist/` dengan static server apa pun (Nginx/Caddy/Cloudflare Pages/JS).

---

## 4. Instalasi Backend PocketBase

### 4.1 Unduh binary

```bash
PB_VERSION=v0.40.6
# PocketBase v0.40+ tersedia dengan build tags (go, sqlite, full)
curl -L -o pocketbase.zip \
  "https://github.com/pocketbase/pocketbase/releases/download/${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip"
unzip pocketbase.zip
chmod +x pocketbase
sudo mv pocketbase /usr/local/bin/pocketbase
```

> Verifikasi checksum rilis sebelum dipakai. Gunakan arsitektur yang sesuai
> (`linux_arm64`, `darwin_arm64`, dst).

### 4.2 Direktori & user service

```bash
sudo useradd --system --home /opt/pocketbase --shell /usr/sbin/nologin pocketbase
sudo mkdir -p /opt/pocketbase/pb_data /opt/pocketbase/pb_migrations /opt/pocketbase/pb_hooks
sudo chown -R pocketbase:pocketbase /opt/pocketbase
```

### 4.3 systemd unit

`/etc/systemd/system/pocketbase.service`:

```ini
[Unit]
Description=PocketBase backend (Ncmaz/Blogku)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/usr/local/bin/pocketbase serve \
  --http=127.0.0.1:8090 \
  --dir=/opt/pocketbase/pb_data \
  --migrationsDir=/opt/pocketbase/pb_migrations \
  --hooksDir=/opt/pocketbase/pb_hooks \
  --dev=false
Restart=on-failure
RestartSec=3
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/pocketbase/pb_data
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
```

---

## 5. Inisialisasi & Migrasi

PocketBase memuat migrasi dari `pb_migrations` dan hooks dari `pb_hooks` saat
start. Langkah:

1. Buat folder migrasi sesuai skema di `backend-integration-spec.md` §4–§6
   (koleksi `users`, `posts`, `categories`, `tags`, `comments`, `reactions`,
   `media`, `site_settings`, `editor_settings`, `pages` + index).
2. Terapkan collection rules §6.3 dan hooks §6.4 (mis. generate slug, counter,
   cegah self-demote/last-admin, sanitasi server, tolak SVG).
3. Terapkan middleware rate limit §10.
4. Seed singleton:
   - `site_settings` (satu record `site_settings`),
   - `editor_settings` (satu record `editor_settings`),
   - `pages` (`about`, `contact`, `privacy`).

> Saat menjalankan `pocketbase serve` pertama kali, gunakan `--dev=true` untuk
> meninjau perubahan, lalu nonaktifkan setelah stabil.

### 5.1 Image kustom dari repo ini

Folder `backend/` berisi `main.go` yang membuild PocketBase + bootstrap schema,
seed, dan Go hooks langsung ke binary. Build:

```bash
cd backend
docker build -t ncmaz-backend:latest .
```

Env saat run:

| Variabel | Keterangan |
| :--- | :--- |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | Superuser pertama (opsional) |
| `SEED_ADMIN_PASSWORD` | Password user `admin` (default `admin12345`) |
| `SEED_AUTHOR_PASSWORD` | Password user `demo` (default `demo12345`) |
| `SEED_SUBSCRIBER_PASSWORD` | Password user `subscriber` (default `sub12345`) |

> Ganti semua password default sebelum produksi. Persistensikan `pb_data`
> (atau storage S3) agar data tidak hilang saat redeploy.

### 5.2 Deploy aktif (NEO App)

Deploy terbaru dari `backend/main.go` (schema + seed + hooks) sudah live di:

- `https://d6gz0ol.app.neoapp.id`

Hubungkan frontend dengan env saat build:

```dotenv
VITE_USE_POCKETBASE=true
VITE_PB_URL=https://d6gz0ol.app.neoapp.id
```

> NEO App saat ini tidak menyediakan volume persisten untuk `pb_data`; data bisa
> hilang pada redeploy. Untuk produksi sebaiknya gunakan volume/storage persisten.

---

## 6. Storage File

### 6.1 Lokal (default)

- `pb_data/storage/`. Simpan di volume yang persisten.
- Untuk VPS tunggal: paling sederhana.

### 6.2 S3-compatible

PocketBase `v0.40.x` mendukung objek storage S3 (mis. Cloudflare R2, MinIO, AWS S3).

Buat file `pb_data/storage.config.json` contoh:

```json
{
  "bucket": "ncmaz-media",
  "region": "auto",
  "endpoint": "https://<account-id>.r2.cloudflarestorage.com",
  "accessKeyId": "<access-key>",
  "secretAccessKey": "<secret-key>",
  "forcePathStyle": true,
  "signatureVersion": "v4",
  "fileFields": ["file"]
}
```

> Simpan kredensial sebagai file dengan permission ketat (`chmod 600`), atau gunakan
> mekanisme secret lain. Jangan commit ke git.

---

## 7. Rate Limit Middleware

Rate limit berlapis (built-in + middleware Go) dijelaskan di
`backend-integration-spec.md` §10. Saat deploy:

- Tetapkan token bucket per route (`auth-login`, `auth-register`, komentar,
  reaction, upload, dst).
- Pastikan `X-Forwarded-For` tidak bisa dimanipulasi → set `--trustedProxy`.
- Middleware harus berjalan **setelah** auth loader dan **sebelum** built-in limiter.

---

## 8. Reverse Proxy & TLS

### 8.1 Caddy (recommended)

`Caddyfile`:

```
api.contoh.com {
	tls {
		protocols tls1.2 tls1.3
	}
	encode gzip zstd

	reverse_proxy 127.0.0.1:8090 {
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Real-IP {remote_host}
	}

	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		X-XSS-Protection 0
	}
}
```

### 8.2 Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.contoh.com;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;            # SSE/realtime
        proxy_read_timeout 3600s;
    }
}
```

### 8.3 Cloudflare (opsional)

- Pasang origin di belakang Cloudflare; aktifkan proxied.
- Tambahkan header keamanan via Cloudflare/edge atau tetap di origin.
- Untuk private network, bisa pakai Cloudflare Tunnel (untuk VPS tanpa IP publik / NAT).

### 8.4 Trusted proxy

PocketBase `v0.40` menyediakan flag `--trustedProxy` (mis. `127.0.0.1`, subnet
proksi). **Wajib** dikonfigurasi agar client tidak bisa spoof
`X-Forwarded-For`.

---

## 9. Keamanan Produksi

- `--dev=false` (default produksi); nonaktifkan dashboard/API superadmin saat tidak dipakai.
- Akun superadmin dibuat dengan password kuat (dikelola terpisah dari `users`).
- Terapkan CSP pada frontend; contoh ringkas:

  ```http
  Content-Security-Policy: default-src 'self'; img-src 'self' data: https://*.unsplash.com; connect-src 'self' https://api.contoh.com; style-src 'self' 'unsafe-inline'; script-src 'self'
  ```

- Kirim `X-Content-Type-Options`, `X-Frame-Options`, HSTS.
- Pastikan SVG/HTML upload ditolak (lihat spec upload).
- Jangan pernah mengekspos `email` pengguna ke publik (lihat rules §6.3).

---

## 10. Backup & Recovery

Backup harian/otomatis:

1. **SQLite**: gunakan backup online:
   ```bash
   pocketbase backup create
   # atau gunakan VACUUM INTO / jurnal WAL secara konsisten
   ```
2. **Storage**: sinkronisasi volume/S3.
3. Simpan backup di luar VM (mis. R2/object storage) dengan enkripsi.
4. Uji restore minimal 1× / bulan.

Prosedur restore:

```bash
systemctl stop pocketbase
# restore pb_data (data.db, storage/, config)
systemctl start pocketbase
```

---

## 11. Monitoring & Logging

- Log service: `journalctl -u pocketbase -f`.
- Metrics dasar: CPU, RAM, disk `pb_data`, ukuran SQLite, koneksi, error 4xx/5xx.
- Alert untuk 429 excess, 5xx, disk mendekati penuh.
- Realtime: pantau jumlah koneksi SSE.

---

## 12. CI/CD & Integrasi

Flow yang disarankan:

1. `frontend`: lint → typecheck → unit test → build → deploy `dist`.
2. `backend`: jalankan test hooks (opsional), salin `pb_migrations` + `pb_hooks`,
   restart service.
3. Verifikasi health endpoint.

Contoh health check (Caddy dapat memakai ini):

```bash
curl -fsS https://api.contoh.com/api/health
# => { "code": 200, "message": "OK", "data": { "api": 1, "service": "pocketbase" } }
```

---

## 13. Prosedur Rollout & Rollback

1. Snapshot `pb_data` sebelum deploy besar.
2. Terapkan migrasi baru, verifikasi log.
3. Jika terjadi regresi: rollback binary/skema + restore data dari snapshot.
4. Frontend dan backend dapat di-deploy independen (backward-compatible API).

---

## 14. Checklist Verifikasi Integrasi

Gunakan checklist ini sebelum menandai produksi siap:

- [ ] `VITE_PB_URL` mengarah ke HTTPS publik; frontend build dengan `VITE_USE_POCKETBASE=true`.
- [ ] Health endpoint `200` dari luar.
- [ ] Login `demo` (atau user seed) berhasil; `currentUser()` bertahan setelah reload.
- [ ] Buat post (status draft & published), ubah judul tanpa mengubah slug, delete.
- [ ] Komentar dibuat dengan `author` tampil; reaction toggle konsisten dengan counter.
- [ ] Upload gambar (PNG/JPG/WebP/GIF/AVIF) berhasil; SVG ditolak; file >5MB ditolak.
- [ ] Reset password (request + confirm) berfungsi.
- [ ] Halaman `about`/`contact`/`privacy` dan settings singleton terbaca.
- [ ] RBAC: guest/subscriber/penulis/admin sesuai table di `backend-integration-spec.md` §6.3.
- [ ] Admin terakhir tidak bisa diturunkan/dihapus; non-admin tidak bisa ubah role.
- [ ] `email` tidak bocor ke respon publik.
- [ ] `429` memunculkan `RateLimitError`; UI menonaktifkan tombol sesuai `retryAfter`.
- [ ] `--trustedProxy` aktif; spoof `X-Forwarded-For` tidak berpengaruh.
- [ ] HSTS/CSP aktif; TLS ≥ 1.2.
- [ ] Backup + restore teruji.
- [ ] `docs/README.md` dan dokumen terkait diperbarui.

---

## 15. Referensi

- `docs/backend-integration-spec.md` — skema, RBAC, hooks, error contract, rate limit.
- `docs/features/09-pocketbase-backend-integration.md` — implementasi adapter frontend.
- PocketBase docs resmi: https://pocketbase.io/docs/
