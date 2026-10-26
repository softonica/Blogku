# How to Deploy Blogku (Single-Binary)

Panduan langkah-demi-langkah men-deploy **Blogku** sebagai satu binary Linux di
sebuah VPS. Target deploy nyata pertama: **server 64** (`64.235.45.122`,
Debian 13, native systemd) di `/opt/blogku`.

## Prasyarat

- Satu binary Linux amd64 `blogku` (hasil `bash backend/build.sh`, atau unduh
  rilis).
- Akses SSH ke server tujuan.
- Tidak perlu Node.js, Docker, database eksternal, maupun env var.

## Ringkasan (3 langkah)

```bash
scp blogku root@<server>:/opt/blogku/blogku          # 1. salin binary
ssh root@<server>                                    # 2. setup service systemd
# install /opt/blogku/blogku.service, enable, start
curl http://127.0.0.1:8090/                          # 3. verifikasi
```

---

## 1. Siapkan direktori & user

```bash
ssh root@<server> 'mkdir -p /opt/blogku/data && \
  useradd -r -s /usr/sbin/nologin -d /opt/blogku blogku'
```

## 2. Salin binary

Dari mesin lokal:

```bash
scp blogku root@<server>:/opt/blogku/blogku
ssh root@<server> 'chmod 755 /opt/blogku/blogku && chown -R blogku:blogku /opt/blogku'
```

## 3. Unit systemd

Buat `/etc/systemd/system/blogku.service`:

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
ExecStart=/opt/blogku/blogku serve --http=127.0.0.1:8090 --dir=/opt/blogku/data
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

```bash
ssh root@<server> 'systemctl daemon-reload && systemctl enable --now blogku'
```

## 4. Verifikasi

```bash
ssh root@<server> '
  systemctl is-active blogku
  curl -s -o /dev/null -w "spa:%{http_code}\n" http://127.0.0.1:8090/
  curl -s http://127.0.0.1:8090/ | grep -c "<html"
  curl -s -X POST http://127.0.0.1:8090/api/collections/users/auth-with-password \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"demo\",\"password\":\"demo12345\"}" | grep -c "\"token\""
'
```

Ekspektasi: `active`, `spa:200`, `1` (ada `<html`), `1` (token ada).

## 5. First-run: admin otomatis

Pada data dir pertama, Blogku otomatis membuat superuser admin dengan password
acak dan mencetaknya **sekali** ke `journalctl -u blogku`:

```bash
ssh root@<server> 'journalctl -u blogku --no-pager | grep -A6 "Blogku admin"'
```

Contoh output:

```
Blogku admin created:
  URL:  http://127.0.0.1:8090
  Email: admin@blogku.com
  Password: <random-24-char>
  (save these now — shown only once)
```

**Simpan kredensial ini.** Tidak akan dicetak lagi. Bila hilang: stop service,
hapus `/opt/blogku/data` (semua data hilang), lalu start ulang.

---

## Deployment nyata: server 64 (2026-10-25)

| Item | Nilai |
|---|---|
| Server | `64.235.45.122` (Debian 13, native systemd) |
| Path | `/opt/blogku` (binary + `data/`) |
| Service | `blogku.service` (systemd, aktif + enabled) |
| Listen | `127.0.0.1:8090` (localhost; expose via reverse-proxy bila perlu) |
| Verifikasi | `active`, SPA 200, `<html` ada, login demo → token |
| Admin first-run | `admin@blogku.com` / password acak (lihat journalctl) |

## Catatan

- Default listen `127.0.0.1:8090` hanya lokal. Untuk akses publik pasang
  reverse-proxy (nginx/caddy) + TLS — di luar cakupan panduan ini.
- Data tersimpan di `/opt/blogku/data` (SQLite + upload media). Backup = salin
  direktori ini.
- Port 8090 hanya dibuka saat service berjalan; pastikan firewall mengizinkan
  hanya yang diperlukan.
