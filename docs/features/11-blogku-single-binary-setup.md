# 11 — Blogku Single-Binary Setup

> Status: Stable (verifikasi e2e)
> Referensi: [`blogku-single-binary-setup-spec.md`](../blogku-single-binary-setup-spec.md), [`blogku-single-binary-setup-plan.md`](../blogku-single-binary-setup-plan.md), [`blogku-single-binary-setup.md`](../blogku-single-binary-setup.md)
> Target: Linux amd64 (Go)

## 1. Ringkasan & Motivasi

Sebelum ini, menjalankan Blogku butuh dua proses terpisah: backend custom
PocketBase (Go) yang serve API di `127.0.0.1:8090` + frontend Vue SPA yang
di-build terpisah dan wajib menunjuk backend lewat `VITE_PB_URL`. User awam
harus menguasai build frontend, set env, build Go, dan menyambungkan keduanya.

Fitur ini menyatukan semuanya menjadi **satu binary Go Linux**: frontend
di-embed ke binary, dilayani di port yang sama dengan API, dan admin
di-provision otomatis dengan password acak pada first-run yang dicetak ke
konsol — meniru kemudahan setup OpenList.

## 2. Arsitektur & Komponen

```
./blogku serve [--http 127.0.0.1:8090] [--dir pb_data]
     │
     ├─ SPA (embedded: backend/dist ← frontend/dist) → GET / + fallback index.html
     ├─ API PocketBase → /api/*
     └─ Admin PocketBase → /_/*
```

- `backend/embed.go` — `//go:embed all:dist` memuat `frontend/dist` ke
  `embeddedDist embed.FS`.
- `backend/spa_handler.go` — `newSPAHandler(fsys fs.FS) http.Handler`: file
  nyata dilayani langsung; path tak dikenal jatuh ke `index.html` (history-mode
  routing). Dipasang dengan `fs.Sub(embeddedDist, "dist")` karena embed
  men-namespace di bawah `dist/`.
- `backend/main.go` — `app.OnServe().BindFunc`:
  - `bootstrap(app, se.Server.Addr)` (schema + seed + superuser + print URL).
  - register `se.Router.GET("/", ...)` → `newSPAHandler` (berlaku untuk
    subtree non-API; `/api/*` dan `/_/*` tetap milik PocketBase).
  - `ensureSuperuser(app) (bool, email, password, error)` — auto-provision
    admin. Default email `admin@blogku.com`; bila `PB_SUPERUSER_PASSWORD` tidak
    di-set, generate `randomPassword(24)` (crypto/rand). Hanya dicetak satu
    kali saat `created == true`.
- `frontend/src/lib/pb.ts` — `DEFAULT_PB_URL = ''` (same-origin) bila
  `VITE_PB_URL` tidak di-set → frontend otomatis bicara ke origin yang sama.
- `backend/build.sh` — pipeline build: `vite build` → copy ke `backend/dist`
  → `go build -o blogku` (linux/amd64, `CGO_ENABLED=0`). `backend/build.ps1`
  adalah ekuivalen Windows untuk dev.

## 3. Kontrak Data

Tidak ada perubahan kontrak API/DataSource. Perubahan Java API server:

```go
// backend/main.go
bootstrap(app core.App, httpAddr string) error
ensureSuperuser(app core.App) (bool, string, string, error)
randomPassword(n int) (string, error)
newSPAHandler(fsys fs.FS) http.Handler
```

## 4. Otorisasi & Keamanan

- Superuser admin dibuat dengan **password acak** (24 karakter, alfanumerik)
  dan dicetak ke stdout hanya pada first-run. Jangan pernah dicetak ulang.
- Log first-run tidak mengandung secret selain kredensial admin yang baru
  dibuat (untuk disimpan user).
- SPA hanya dilayani untuk route non-API; `/api/*` tetap di-proteksi RBAC
  PocketBase.
- Tidak ada `eval()`/eksekusi dinamis baru; frontend tetap memakai sanitasi
  DOMPurify untuk render konten kaya.

## 5. Panduan Penggunaan

Lihat panduan lengkap [`blogku-single-binary-setup.md`](../blogku-single-binary-setup.md):

1. Unduh satu binary Linux amd64 `blogku`.
2. `chmod +x blogku && ./blogku serve` → listen `127.0.0.1:8090`, data di
   `pb_data/`.
3. First-run: salin URL + Email + Password admin yang dicetak di konsol.
4. Custom: `./blogku serve --http=0.0.0.0:8090 --dir=/srv/blogku/data`.
5. Rebuild dari source: `bash backend/build.sh`.

## 6. Pengujian & Verifikasi

- `cd backend && go test ./...` — `TestSPAHandler` (fallback index.html),
  `TestEnsureSuperuserGeneratesCredentials` (create → non-empty random password
  → idempotent no-recreate) lulus.
- `npm --workspace=frontend run test -- lib/pb.test.ts` — 2/2 lulus
  (default `''` + pakai `VITE_PB_URL`).
- e2e (WSL Linux, binary cross-compile): first-run mencetak URL+creds sekali;
  `GET /` → 200 berisi `<html`; `GET /post/some-slug` → 200 (fallback);
  login demo (`demo/demo12345`) → token. Second-run pada dir sama → creds
  tidak dicetak ulang.

## Handover notes

- `backend/build.sh` frontend `vite build` **tidak** bisa berjalan di bawah
  WSL1 (Windows `npx`); konfirmasi build penuh di Linux/WSL2.
- Binary Linux `backend/blogku` tidak di-commit (di-ignore di
  `backend/.gitignore`); dibangun saat me-build.
