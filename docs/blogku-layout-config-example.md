# Blogku — Contoh Layout & Config (meniru struktur OpenList)

Struktur deploy Blogku di server 64 (`/opt/blogku`) dipertegas meniru pola
OpenList: **satu direktori `data/` self-contained** (config + DB + log + temp)
yang dikelola lewat sebuah config, plus unit systemd minimal dan reverse-proxy
nginx.

## 1. Layout direktori

```
/opt/blogku/
├── blogku                  # binary tunggal (Linux amd64)
├── blogku.service          # unit systemd (salinan /etc/systemd/system/)
│
└── data/                   # ← SEMUA data + konfigurasi (self-contained)
    ├── auxiliary.db        # SQLite (log/audit PocketBase)
    ├── data.db             # SQLite utama (users, posts, categories, files, settings)
    ├── backup/             # backup DB otomatis (dibuat PocketBase)
    ├── storage/            # file upload / media (per record)
    ├── temp/               # upload sementara
    └── .notify/            # state internal PocketBase
```

> Catatan: Blogku (PocketBase) menyimpan dinamik (port, data dir, kredensial)
> lewat flag CLI di unit systemd, dan sisanya (settings, role, konten) di
> SQLite `data.db`. Namun untuk **kanonik situs** (canonical/og:url/JSON-LD),
> Blogku membaca `data/config.json` — persis pola OpenList. Jika file ada dan
> berisi `site_url`, nilai itu dipakai; jika tidak ada, fallback ke origin
> request. Jadi canonical/og SELALU dinamis dari config, tidak pernah hardcoded.

## 2. Unit systemd (minimal, ala OpenList)

`/etc/systemd/system/blogku.service`:

```ini
[Unit]
Description=Blogku single-binary server (PocketBase + embedded SPA)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=blogku
Group=blogku
WorkingDirectory=/opt/blogku
ExecStart=/opt/blogku/blogku serve --http=0.0.0.0:8090 --dir=/opt/blogku/data
Restart=on-failure
RestartSec=5
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
NoNewPrivileges=true
ReadWritePaths=/opt/blogku/data

[Install]
WantedBy=multi-user.target
```

## 3. Format config — contoh (ala OpenList, untuk referensi)

```jsonc
{
  "site_url": "https://blog.artku.my.id"
}
```

Saat ini `config.json` membaca satu field: `site_url` (kanonik publik).
Field inilah yang mengisi `canonical`, `og:url`, dan JSON-LD `url`/`logo`
pada shell SPA. Jika file dihapus → fallback ke origin request (mis.
`https://blog.artku.my.id`).

## 4. Reverse-proxy nginx (port 8090 → domain)

`/etc/nginx/sites-enabled/blog.artku.my.id.conf`:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name blog.artku.my.id;

    ssl_certificate     /etc/nginx/ssl-certificates/blogku/blog.artku.my.id.crt;
    ssl_certificate_key /etc/nginx/ssl-certificates/blogku/blog.artku.my.id.key;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        client_max_body_size 20G;
    }
}
```

## 5. Alur start & verifikasi

```bash
systemctl daemon-reload
systemctl enable --now blogku
systemctl is-active blogku        # → active
curl -s -o /dev/null -w "%{http_code}\n" https://blog.artku.my.id/   # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://blog.artku.my.id/api/health  # → 200
```

First-run otomatis mencetak kredensial admin (URL + Email + Password) ke
`journalctl -u blogku` — **sekali saja**, seperti OpenList.
