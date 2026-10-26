# Blogku — Context Handover

> **Dokumen ini adalah titik masuk wajib** untuk engineer atau model AI yang melanjutkan
> pekerjaan di repo ini. Tujuannya: dalam 10 menit kamu tahu *apa* proyeknya, *di mana*
> semuanya berjalan, *bagaimana* build/deploy, apa yang **sudah** selesai, apa yang
> **belum**, dan jebakan yang sudah pernah menggigit.
>
> Terakhir diperbarui: **2026-10-26** · Branch aktif: **`feat/blogku-single-binary`**

---

## 0. TL;DR (baca ini dulu)

| Pertanyaan | Jawaban singkat |
| :--- | :--- |
| Ini proyek apa? | **Blogku** — platform majalah/editorial (Vue 3 SPA) + backend **PocketBase**, dibungkus jadi **satu binary Go** |
| Frontend | Vue 3 + Vite + Tailwind CSS v4 + Tiptap v3 + Pinia |
| Backend | PocketBase **v0.40.6** (Go 1.27.2), di-embed dalam binary yang sama |
| Cara jalan | `blogku serve --http=... --dir=...` → satu port melayani API + SPA |
| Live sekarang | **https://blog.artku.my.id** |
| Server | **64.235.45.122**, SSH port **2232** (Debian 13, systemd native + nginx) |
| Lokasi server | `/opt/blogku/{blogku,data/}` + `/etc/systemd/system/blogku.service` |
| Canonical/OG URL | Dibaca dari **`/opt/blogku/data/config.json`** → `{"site_url":"..."}` (**tidak hardcoded**) |
| Status git | Branch feature **belum di-merge ke `main`** dan **belum di-push** |
| ⚠️ Utang repo | Fix `frontend/src/lib/pb.ts` **sudah live di server tapi belum di-commit** |
| Test | Backend: `go test ./...` · Frontend: `npm test` (vitest) |

Kalau hanya punya waktu 1 menit: baca §9 (Status) dan §8 (Gotchas).

---

## 1. Identitas Proyek

| Item | Nilai |
| :--- | :--- |
| Nama produk | Blogku (sebelumnya bernama internal "ncmaz") |
| Lisensi | MIT |
| Repo | `https://github.com/softonica/Blogku.git` |
| Repo lokal (mesin ini) | `C:\Users\Administrator\Desktop\ncmaz-clone` |
| Bahasa dokumentasi | Indonesia |
| Model bisnis fitur | Majalah editorial: post dengan format (standard/video/gallery), kategori, tag, komentar, reaksi, media library, halaman statis, RBAC 3 peran |
| Build artefak | `backend/blogku` — binary Linux amd64 statis, ±**26,7 MB** |

---

## 2. Arsitektur

### 2.1 Bentuk runtime (produksi saat ini)

```
Internet
   │
   ▼
Cloudflare (proxy, DNS blog.artku.my.id)
   │  HTTPS (Cloudflare Origin Cert, valid s/d 2041)
   ▼
nginx  :443  (vhost /etc/nginx/sites-enabled/blog.artku.my.id.conf)
   │  proxy_pass http://127.0.0.1:8090  (X-Forwarded-Proto: https)
   ▼
┌─────────────────────────────── /opt/blogku/blogku ───────────────────────────────┐
│  SATU proses Go (systemd: blogku.service, User=blogku)                            │
│                                                                                   │
│  ┌──────────────────────────┐   ┌──────────────────────────────────────────────┐  │
│  │ PocketBase v0.40.6       │   │ SPA handler (embedded via go:embed all:dist) │  │
│  │  • /api/*  REST          │   │  • file statis dari dist/                    │  │
│  │  • /_/*    admin UI      │   │  • fallback history-mode → index.html        │  │
│  │  • /api/health           │   │  • ganti {{SITE_URL}} saat serve index.html  │  │
│  └──────────────────────────┘   └──────────────────────────────────────────────┘  │
│                    │                                                              │
│                    ▼                                                              │
│         /opt/blogku/data/  (SQLite: data.db, auxiliary.db, .notify/)              │
│         /opt/blogku/data/config.json  (runtime config: site_url)                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Poin kunci:** tidak ada Node, tidak ada container, tidak ada reverse-proxy
tambahan di dalam. Satu binary + satu direktori data. Pola ini sengaja dibuat
mirip **OpenList** supaya mudah dipindah antar VPS.

### 2.2 Lapisan frontend

```
frontend/src/
├── api/
│   ├── source.ts              # interface DataSource (kontrak)
│   ├── index.ts               # setDataSource() / getDataSource()
│   ├── mock.source.ts         # data palsu (mode dev tanpa backend)
│   └── pocketbase.source.ts   # implementasi riil ke PocketBase REST
├── lib/pb.ts                  # instance PocketBase SDK (same-origin)
├── pages/                     # halaman (router di src/router)
├── components/                # UI
├── stores/                    # Pinia
└── main.ts                    # pilih sumber data via VITE_USE_POCKETBASE
```

Pemilihan backend terjadi **saat build**, bukan runtime:

```ts
// frontend/src/main.ts
const usePocketBase = import.meta.env.VITE_USE_POCKETBASE === 'true'
setDataSource(usePocketBase ? new PocketBaseSource() : new MockSource())
```

- `VITE_USE_POCKETBASE=true` → produksi (PocketBase).
- Tanpa flag → demo/mock.

### 2.3 Backend (Go)

File penting di `backend/`:

| File | Isi |
| :--- | :--- |
| `main.go` (±987 baris) | Setup PocketBase, bootstrap schema, seed, hook, RBAC, registrasi SPA |
| `spa_handler.go` | `newSPAHandler(fsys, spaVars)` — serve file statis + fallback SPA + injeksi `{{SITE_URL}}` |
| `config.go` | `loadRuntimeConfig(dataDir)` — baca `data/config.json` (`site_url`) |
| `embed.go` | `//go:embed all:dist` → `embeddedDist` |
| `spa_handler_test.go`, `config_test.go` | Unit test handler & loader |
| `build.sh` / `build.ps1` | Pipeline build lengkap (frontend → embed → binary) |
| `dist/` | Hasil build frontend yang di-embed (isi di-ignore git; hanya `.gitkeep` yang di-track) |

**Bootstrap otomatis** (setiap start, idempoten — aman dijalankan berulang):
1. Buat koleksi bila belum ada: `users, categories, tags, posts, comments, reactions, media, pages, site_settings, editor_settings`.
2. Seed `site_settings`, `editor_settings`, `pages`.
3. Seed user demo (`admin`, `demo`, `subscriber`) bila belum ada.
4. Buat **superuser** `admin@blogku.com` dengan password acak 24 karakter jika belum ada, lalu **cetak sekali** ke stdout/journal.

---

## 3. Inventaris Lokasi

### 3.1 Mesin lokal (Windows)

| Path | Keterangan |
| :--- | :--- |
| `C:\Users\Administrator\Desktop\ncmaz-clone` | Repo |
| `frontend/` | SPA Vue 3 |
| `backend/` | Binary Go + handler + test |
| `docs/` | Dokumentasi (lihat §13) |
| `.superpowers/`, `.opencode/`, `.codegraph/` | Tooling AI — di-ignore git |
| SSH key | `C:\Users\Administrator\.ssh\id_ed25519` |

### 3.2 Server 64 (produksi saat ini)

| Path / objek | Keterangan |
| :--- | :--- |
| `64.235.45.122` | IP server |
| port `2232` | SSH (root, key-only) |
| `/opt/blogku/blogku` | Binary (owner `blogku:blogku`, mode 755) |
| `/opt/blogku/data/` | Direktori data, satu-satunya path yang writable |
| `/opt/blogku/data/data.db` | SQLite utama |
| `/opt/blogku/data/auxiliary.db` | SQLite auxiliary PocketBase |
| `/opt/blogku/data/config.json` | **Runtime config** (`site_url`) |
| `/opt/blogku/blogku.service` | Salinan unit (sumber asli ada di `/etc/systemd/system/`) |
| `/etc/systemd/system/blogku.service` | Unit systemd aktif |
| `/etc/nginx/sites-enabled/blog.artku.my.id.conf` | vhost nginx |
| `/etc/nginx/ssl-certificates/blogku/*.crt,*.key` | Cloudflare Origin Certificate (s/d 2041) |
| `/etc/nftables.conf` baris 22 | `tcp dport 8090 accept` |
| `/etc/nftables.conf` | `tcp dport 2232 accept` (SSH) |

### 3.3 Domain / DNS

| Domain | Peran |
| :--- | :--- |
| `blog.artku.my.id` | **Produksi** — A → `64.235.45.122`, proxied Cloudflare |
| Zone | `artku.my.id` (Cloudflare account id `a463ed812b183e8209eabb6ca1f035`) |
| DNS record id | `97352f2ba6707eb157d8e58d50016898` |

Catatan: `vidsku.com` / `vidku.net` di `AGENTS.md` root **bukan** milik proyek ini —
itu konteks proyek lain (kiraa-fullstack) di mesin yang sama. Untuk Blogku, domain
kanonik adalah `blog.artku.my.id`.

---

## 4. Build & Deploy

### 4.1 Build binary Linux (dari Windows)

```powershell
cd C:\Users\Administrator\Desktop\ncmaz-clone\frontend
$env:VITE_USE_POCKETBASE='true'
$env:VITE_PB_URL=''          # kosong = same-origin (WAJIB untuk single-binary)
npm run build

cd ..
Remove-Item backend\dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory backend\dist -Force | Out-Null
Copy-Item "frontend\dist\*" "backend\dist\" -Recurse -Force

cd backend
$env:CGO_ENABLED='0'; $env:GOOS='linux'; $env:GOARCH='amd64'
go build -trimpath -ldflags="-s -w" -o blogku .
```

Atau sekali jalan: `bash backend/build.sh` (butuh Node/npx di Linux/macOS) atau
`powershell -File backend/build.ps1` (build `.exe` untuk lokal).

**Kenapa `VITE_PB_URL=''`?** SDK PocketBase menerima base URL kosong sebagai
"same-origin". Kode di `frontend/src/lib/pb.ts` sekarang menormalkannya menjadi
`window.location.origin` supaya request tidak jatuh ke `/login/api/...`.

### 4.2 Deploy ke server 64

Pola yang sudah terbukti (PowerShell + OpenSSH):

```powershell
$OPTS = '-o','StrictHostKeyChecking=no','-o','UserKnownHostsFile=NUL','-o','LogLevel=ERROR'

# 1) upload (JANGAN langsung menimpa binary yang sedang berjalan)
scp @OPTS -P 2232 -i "C:\Users\Administrator\.ssh\id_ed25519" `
  "C:\Users\Administrator\Desktop\ncmaz-clone\backend\blogku" `
  root@64.235.45.122:/tmp/blogku-upload

# 2) swap + restart (jalankan lewat script, lihat §8.2)
ssh @OPTS -p 2232 -i "C:\Users\Administrator\.ssh\id_ed25519" root@64.235.45.122 'sh /tmp/deploy.sh'
```

Isi `deploy.sh` yang aman (idempoten, simpan backup):

```sh
#!/bin/sh
set -e
systemctl stop blogku
cp -a /opt/blogku/blogku /opt/blogku/blogku.prev-$(date +%Y%m%d)
mv /tmp/blogku-upload /opt/blogku/blogku
chmod 755 /opt/blogku/blogku
chown blogku:blogku /opt/blogku/blogku
systemctl start blogku
sleep 5
systemctl is-active blogku
```

### 4.3 Setelah deploy — verifikasi wajib

```sh
curl -s -o /dev/null -w "spa:%{http_code}\n"    https://blog.artku.my.id/
curl -s -o /dev/null -w "health:%{http_code}\n" https://blog.artku.my.id/api/health
curl -s https://blog.artku.my.id/ | grep -E 'canonical|og:url'
```

Harapan: `spa:200`, `health:200`, canonical berisi `site_url` dari config.
Semua harus 200 — kalau `spa` 200 tapi aset 404, embed `dist/` kemungkinan salah
subdirektori (lihat §8.4).

---

## 5. Konfigurasi

### 5.1 `data/config.json` (runtime, dibaca saat start)

```json
{ "site_url": "https://blog.artku.my.id" }
```

| Field | Wajib | Efek |
| :--- | :---: | :--- |
| `site_url` | tidak | Mengisi `{{SITE_URL}}` di `index.html` → `<link rel="canonical">`, `og:url`, JSON-LD `url` & `logo` |

- Trailing slash otomatis dipotong.
- File tidak ada → **tidak error**; fallback ke origin request
  (`X-Forwarded-Proto` / TLS / `Host`).
- Ubah nilainya → **restart service** (dibaca sekali saat start).

### 5.2 Flag CLI

| Flag | Default | Keterangan |
| :--- | :--- | :--- |
| `--http` | `127.0.0.1:8090` | Alamat listen (produksi: `0.0.0.0:8090`) |
| `--dir` | `pb_data` | Direktori data (produksi: `/opt/blogku/data`) |

### 5.3 Environment variable

| Variabel | Dipakai kapan | Default |
| :--- | :--- | :--- |
| `PB_SUPERUSER_EMAIL` | first-run superuser | `admin@blogku.com` |
| `PB_SUPERUSER_PASSWORD` | first-run superuser | acak 24 char (dicetak ke log) |
| `SEED_ADMIN_PASSWORD` | seed user `admin` | `admin12345` |
| `SEED_AUTHOR_PASSWORD` | seed user `demo` | `demo12345` |
| `SEED_SUBSCRIBER_PASSWORD` | seed user `subscriber` | `sub12345` |
| `VITE_USE_POCKETBASE` | **build-time** frontend | `false` (mock) |
| `VITE_PB_URL` | **build-time** frontend | kosong → `window.location.origin` |

> ⚠️ **Jangan pernah menulis nilai password/token ke dokumen, commit, atau chat.**
> Untuk verifikasi cukup pakai status code, byte-count, atau `test -n "$VAR"`.

---

## 6. Data Model (PocketBase collections)

| Collection | Peran | Field inti |
| :--- | :--- | :--- |
| `users` (auth) | Akun + RBAC | `username, email, name, role, bio, postCount, avatar` |
| `categories` | Taksonomi | `name, slug, description, color` |
| `tags` | Taksonomi | `name, slug` |
| `posts` | Konten utama | `title, slug, excerpt, content, coverImage, format, status, author→users, categories→categories[], tags→tags[], readingTime, views, likeCount, commentCount` |
| `comments` | Komentar berjenjang | `post→posts, author→users, parent→comments, content, status` |
| `reactions` | Like/bookmark | `post→posts, user→users, type` |
| `media` | Pustaka media | `file, alt, caption, mimeType, size, uploadedBy→users` |
| `pages` | Halaman statis | `title, slug, content, status` |
| `site_settings` | Setting tunggal publik | `siteName, siteDescription, contactEmail, allowRegistration, footerText, logo, logoDark, favicon, allowedImageDomains` |
| `editor_settings` | Konfigurasi Tiptap | `placeholder, show* (bool), autolink, maxContentLength, maxImageUploadSize` |

> **Catatan penting:** `site_settings` **tidak** punya field URL. Kanonik situs
> memang sengaja ditaruh di `config.json` (level infrastruktur, bukan konten),
> supaya bisa berbeda per deployment tanpa menyentuh database.

### 6.1 RBAC (3 peran di `users.role`)

| Peran | Boleh |
| :--- | :--- |
| `subscriber` | Baca konten publik, komentar, reaksi |
| `penulis` | Semua di atas + CRUD post/media miliknya sendiri |
| `admin` | Semua + kelola user, kategori, tag, halaman, site/editor settings |

Superuser PocketBase (`_superusers`) terpisah dari `users` dan dipakai untuk
mengakses `/_/` (admin UI bawaan PocketBase).

**Akun hasil seed:** `admin@blogku.com`, `demo@blogku.com`, `subscriber@blogku.com`
(password mengikuti env/default di §5.3). Superuser = `admin@blogku.com` dengan
password acak yang dicetak **sekali** saat first run:
`journalctl -u blogku | grep -A4 "admin created"`.

---

## 7. Keamanan yang sudah terpasang

- Sanitasi HTML server-side dengan **bluemonday UGCPolicy** (`sanitizeHTML`) untuk `posts.content` dan `pages.content`.
- Sanitasi client-side (DOMPurify) + validasi Zod di frontend.
- Password hashing & auth oleh PocketBase (bcrypt, JWT).
- systemd hardening: `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, `NoNewPrivileges=true`, `ReadWritePaths` hanya `/opt/blogku/data`, capability set kosong.
- Service berjalan sebagai user non-root `blogku`.
- nftables hanya membuka `2232` (SSH) dan `8090` (Blogku; di belakang nginx).
- TLS via Cloudflare Origin Cert (full-strict di Cloudflare).

**Belum ada / perlu dipertimbangkan:** rate-limit eksplisit di level nginx untuk
`/api/collections/users/auth-with-password`, backup otomatis SQLite, dan rotasi
password superuser pasca-handover.

---

## 8. Gotchas & Jebakan (semua sudah pernah terjadi)

### 8.1 PowerShell + OpenSSH memotong tanda kutip
`ssh host 'psql -c "SELECT (1)"'` sering gagal karena PowerShell mem-parsing
kutip. **Solusi:** tulis script `.sh` di lokal → `scp` ke `/tmp` → `ssh ... 'sh /tmp/x.sh'`.

### 8.2 Perintah deploy panjang bisa kena timeout 120s
Upload binary 26 MB + swap dalam satu rantai perintah bisa melewati batas tool.
**Solusi:** pisahkan `scp` dan `ssh`, dan jangan menaruh `&&` berlapis dalam satu
string. Selalu verifikasi `md5sum` file yang di-upload **sebelum** swap.

### 8.3 Jangan langsung menimpa binary yang sedang berjalan
Upload ke `/tmp/blogku-upload`, `systemctl stop`, `mv` (atomic rename), baru
`systemctl start`. Kalau `scp` langsung ke `/opt/blogku/blogku` saat proses hidup,
hasilnya `Text file busy` atau binary korup.

### 8.4 `go:embed` butuh path yang benar
`embed.go` memakai `//go:embed all:dist`, jadi isi build frontend **harus** ada di
`backend/dist/` (bukan `backend/dist/dist/`). Kalau salah, `fs.Sub(embeddedDist, "dist")`
gagal dan SPA jadi 404/panic.

### 8.5 `backend/dist/` di-ignore git, tapi `.gitkeep` di-track
Jangan hapus `backend/dist/.gitkeep` saat membersihkan build. Kalau hilang, folder
tidak ikut ter-clone dan `go build` gagal karena `embed` tidak menemukan `dist`.

### 8.6 WSL1 tidak bisa menjalankan `npx`
Windows `npx`/`node` tidak bisa dieksekusi dari WSL1 (`Exec format error`).
**Solusi:** build frontend di Windows (`npm run build`), build Go di Windows dengan
`GOOS=linux`, atau jalankan `vite build` langsung lewat Node di Windows.

### 8.7 Jangan pakai `curl -d '{"json":"..."}'` di PowerShell
Kutip ganda hilang → server balas 400/404 yang menyesatkan. **Solusi:**
`curl --data @login.json -H "Content-Type: application/json"`, atau jalankan curl
dari dalam script `.sh` di server.

### 8.8 Kanonik URL jangan pernah di-hardcode di `frontend/index.html`
Gunakan `{{SITE_URL}}`; penggantian dilakukan server-side oleh `spa_handler.go`.
Kalau menambah meta baru yang butuh URL absolut, pakai placeholder yang sama —
jangan tulis domain literal.

### 8.9 `sitemap.xml` / `robots.txt` masih statis
Masih di-ignore dari git (`/public/sitemap*.xml`, `/public/robots.txt`) dan belum
digenerate dari `site_url`. Jika domain berubah, file ini **tidak** otomatis ikut.

### 8.10 Edit file di server bisa meninggalkan swap file
Pernah ada `.config.json.swp` milik root di `data/`. Selalu hapus swap file dan
pastikan kepemilikan `blogku:blogku` agar service bisa membaca.

### 8.11 Jangan menulis file lewat `Set-Content` PowerShell 5.1 untuk dokumen UTF-8
`Get-Content -Raw` + `Set-Content -Encoding UTF8` membaca file UTF-8 sebagai
cp1252 lalu menulis ulang → karakter seperti `—` dan `§` jadi mojibake. Pakai
editor/alat yang menulis UTF-8 murni, dan verifikasi dengan membaca ulang.

---

## 9. Status Pekerjaan

### 9.1 Selesai & terverifikasi

| Area | Bukti |
| :--- | :--- |
| Single binary (embed SPA + PocketBase satu port) | `/opt/blogku/blogku` jalan, `/` dan `/api/health` 200 |
| Auto-provision superuser + seed data | login demo 200, koleksi ter-seed |
| Build pipeline (`build.sh` / `build.ps1`) | binary Linux 26,7 MB berhasil dibangun |
| Deploy produksi ke server 64 | https://blog.artku.my.id live |
| nginx + Cloudflare Origin Cert | HTTPS 200, redirect 80→443, cert s/d 2041 |
| nftables 8090 | jarak jauh 200 |
| **Canonical/OG dari `config.json`** | HTML served berisi `https://blog.artku.my.id/`, tanpa `{{SITE_URL}}` |
| Fix base URL PocketBase | login 200 (sebelumnya 404 di `/login/api/...`) |
| Unit test backend | `go test .` → ok |

### 9.2 ⚠️ Deployed tapi BELUM di-commit (ACTION REQUIRED)

Perubahan berikut ada di working tree **dan sudah live**, tetapi belum masuk git:

```
M frontend/src/lib/pb.ts        # originUrl() → window.location.origin
M frontend/src/lib/pb.test.ts   # assert window.location.origin
```

Rekomendasi: commit sebelum pekerjaan lain agar repo = produksi.

```powershell
git add frontend/src/lib/pb.ts frontend/src/lib/pb.test.ts
git commit -m "fix(frontend): default PocketBase base URL to window.location.origin"
```

### 9.3 Belum di-merge / belum di-push

- Branch `feat/blogku-single-binary` (13 commit di atas `main`) **belum** di-merge
  dan **belum punya upstream** (`git push -u origin feat/blogku-single-binary`
  belum pernah dijalankan).
- Keputusan yang belum diambil: **merge lokal ke `main`** atau **push + Pull Request**.

### 9.4 Working tree yang sengaja TIDAK disentuh

```
 M AGENTS.md                    # perubahan konteks proyek lain di mesin ini
?? .agents/rules/change-log.md  # tooling AI
```

Jangan commit keduanya bersama perubahan Blogku.

### 9.5 Backlog / next steps

1. Commit fix `pb.ts` (§9.2).
2. Putuskan merge vs PR (§9.3).
3. **SEO per-halaman**: `index.html` saat ini hanya punya canonical/OG untuk
   homepage. Post/halaman individual belum punya `og:url`/`canonical` dinamis
   (butuh SSR/prerender atau injeksi meta berbasis route).
4. Generate `sitemap.xml` / `robots.txt` dari `site_url` + daftar post (§8.9).
5. Backup otomatis SQLite (`sqlite3 .backup` + cron) dan retensi.
6. Rotasi password superuser & seed setelah handover.
7. Rate limit auth di nginx.
8. Pertimbangkan healthcheck eksternal + alert (uptime monitor).
9. Rapikan `README.md` §"Live Demo" — masih menunjuk `https://blogku-7rq.pages.dev`
   (demo lama); tentukan apakah itu tetap demo publik atau diganti ke
   `https://blog.artku.my.id`.

---

## 10. Verifikasi Cepat (copy-paste)

```sh
# Service & port
systemctl is-active blogku
systemctl is-enabled blogku
ss -ltn | grep 8090

# Endpoint publik
curl -s -o /dev/null -w "%{http_code} /\n"           https://blog.artku.my.id/
curl -s -o /dev/null -w "%{http_code} /api/health\n" https://blog.artku.my.id/api/health
curl -s -o /dev/null -w "%{http_code} posts\n"       "https://blog.artku.my.id/api/collections/posts/records?perPage=1"

# Canonical berasal dari config
curl -s https://blog.artku.my.id/ | grep -E 'canonical|og:url'

# Log (first-run admin + error)
journalctl -u blogku -n 100 --no-pager
```

Di lokal:

```powershell
cd backend;     go test ./...
cd ..\frontend; npm test; npm run lint; npm run typecheck
```

---

## 11. Rollback

| Skenario | Tindakan |
| :--- | :--- |
| Binary baru rusak | `systemctl stop blogku` → `mv /opt/blogku/blogku.prev-YYYYMMDD /opt/blogku/blogku` → `systemctl start blogku` |
| Perubahan `config.json` salah | Edit `data/config.json` → `systemctl restart blogku` |
| Data rusak | Restore `data.db`/`auxiliary.db` dari backup (belum ada backup otomatis — lakukan manual dulu) |
| nginx rusak | `nginx -t` → perbaiki vhost → `systemctl reload nginx` |

**Selalu** simpan binary lama sebelum swap (lihat §4.2) dan simpan salinan
`data/` sebelum upgrade besar.

---

## 12. Konvensi Kerja Repo

1. **Setiap fitur wajib punya dokumen** di `docs/features/<nn>-<nama>.md` mengikuti
   `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`.
2. **Setiap perubahan wajib dicatat di `CHANGELOG.md`** (format: tanggal, what
   changed, why, how verified, handover notes) dan di `.agents/rules/change-log.md`
   bila memakai tooling AI.
3. **Dokumentasi deploy** ada di `docs/how-to-deploy-blogku.md`; dokumen ini
   (`HANDOVER-CONTEXT.md`) adalah ringkasan konteks lintas sesi.
4. **Commit style:** conventional commits (`feat(scope):`, `fix(scope):`, `docs:`).
5. **Jangan commit** `.env`, `*.pem`, `.superpowers/`, `.opencode/`, `.codegraph/`,
   `backend/dist/*` (kecuali `.gitkeep`).
6. **Test sebelum selesai:** `go test ./...` + `npm test`; jangan klaim selesai
   tanpa output test.

---

## 13. Peta Dokumen (urutan baca)

| Urutan | Dokumen | Untuk apa |
| :---: | :--- | :--- |
| 1 | **`docs/HANDOVER-CONTEXT.md`** (ini) | Konteks menyeluruh & status |
| 2 | `docs/features/11-blogku-single-binary-setup.md` | Detail fitur single-binary |
| 3 | `docs/blogku-single-binary-setup-spec.md` | Desain & keputusan teknis |
| 4 | `docs/blogku-single-binary-setup-plan.md` | Rencana implementasi TDD (7 task) |
| 5 | `docs/how-to-deploy-blogku.md` | Langkah deploy dari nol |
| 6 | `docs/blogku-layout-config-example.md` | Layout `/opt` + format `config.json` |
| 7 | `docs/backend-integration-spec.md` | Kontrak `DataSource` ↔ PocketBase |
| 8 | `docs/backend-deployment-spec.md` | Deploy PocketBase umum (TLS, backup, monitoring) |
| 9 | `docs/features/01..10-*.md` | Detail per fitur aplikasi |
| 10 | `CHANGELOG.md` | Riwayat perubahan terbaru |

---

## 14. Ringkasan Satu Paragraf

Blogku adalah platform majalah editorial berbasis Vue 3 dan PocketBase yang
dikemas menjadi satu binary Go statis (±26,7 MB) dengan frontend ter-embed,
auto-provision admin, dan fallback routing SPA. Deploy produksinya berjalan di
server `64.235.45.122` (Debian 13, systemd + nginx + Cloudflare) sebagai
`https://blog.artku.my.id`, dengan data di `/opt/blogku/data` dan kanonik URL
dibaca dari `config.json` (`site_url`) sehingga tidak pernah hardcoded. Pekerjaan
single-binary sudah selesai dan terverifikasi; sisa utangnya adalah meng-commit
fix `pb.ts` yang sudah live, memutuskan merge/PR untuk branch
`feat/blogku-single-binary`, dan menindaklanjuti backlog SEO per-halaman,
sitemap dinamis, serta backup otomatis.
