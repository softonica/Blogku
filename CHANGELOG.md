# CHANGELOG

Log perubahan gaya kerja team. Entri ditambahkan (append), tidak pernah dihapus/direwrite.
Format: lihat `.agents/rules/change-log.md` dan section "LOG PERUBAHAN GAYA KERJA TEAM" di `AGENTS.md`.

---

## [2026-10-25] — Blogku Single-Binary Setup (fitur besar)
**Author** · **Role** (Dev/Backend/DevOps/Docs) · **Status** (Done)

### What changed
- `backend/embed.go` (baru) — `//go:embed all:dist` meng-embed frontend dist.
- `backend/spa_handler.go` (baru) — `newSPAHandler` serve file + fallback index.html (history-mode).
- `backend/main.go` — `bootstrap(app, se.Server.Addr)`; register SPA di `se.Router.GET("/")`; `ensureSuperuser` auto-provision admin password acak (`randomPassword(24)`) + print URL/creds sekali.
- `backend/main_test.go`, `backend/spa_handler_test.go` (baru) — test idempotence superuser + fallback handler.
- `backend/build.sh`, `backend/build.ps1` (baru) — pipeline build frontend→dist→binary; `backend/.gitignore` (+ `blogku`, `blogku.exe`).
- `frontend/src/lib/pb.ts` — `DEFAULT_PB_URL=''` (same-origin); `pb.test.ts` (baru).
- Docs: `docs/features/11-blogku-single-binary-setup.md`, `docs/blogku-single-binary-setup-spec.md`, `docs/blogku-single-binary-setup-plan.md`, `docs/blogku-single-binary-setup.md`, `docs/README.md` (indeks), `README.md` (Quick Start single-binary).

### Why
- Menjadikan Blogku semudah OpenList untuk di-setup: satu binary Linux, tanpa env wajib, admin auto-provision.

### How it was verified
- `cd backend && go test ./...` — lulus (`TestSPAHandler`, `TestEnsureSuperuserGeneratesCredentials`).
- `npm --workspace=frontend run test -- lib/pb.test.ts` — 2/2 lulus.
- e2e (binary Linux di WSL): first-run cetak URL+creds sekali; `GET /` → 200 `<html`; `GET /post/some-slug` → 200; login demo → token; second-run tanpa cetak creds. `go build ./...`/`go vet ./...` bersih.

### Handover notes
- `backend/build.sh` vite build tidak jalan di WSL1 (Windows npx); konfirmasi build penuh di Linux/WSL2.
- Binary `backend/blogku` tidak di-commit (di-ignore).

## [2026-10-25] — Rule agent: log perubahan wajib gaya kerja team
**Author** · **Role** (DevOps/Docs) · **Status** (Done)

### What changed
- `.agents/rules/change-log.md` (baru) — rule agent `always_on`: setiap perubahan wajib dicatat di `CHANGELOG.md` dengan format team-work (Author/Role/What/Why/Verified/Handover).
- `AGENTS.md` — menambah section "ATURAN WAJIB: LOG PERUBAHAN GAYA KERJA TEAM" dan menambah checklist DoD: entri CHANGELOG wajib sebelum tugas dinyatakan selesai.
- `CHANGELOG.md` (baru) — dibuat sebagai log serah-terima, diisi entri retroaktif untuk pekerjaan hari ini.

### Why
- Permintaan user: "buat rule agent setiap perubahan harus tulis perubahan seperti kerja team".
- Kebutuhan handover antar sesi/agent: konteks (apa yang berubah, kenapa, bukti verifikasi, bug terbuka) tidak boleh hilang antar percakapan.

### How it was verified
- File rule dan AGENTS.md dibaca ulang; format entri konsisten dengan template di rule (Author/Role/What/Why/Verified/Handover).
- Entri retroaktif hari ini ditulis dari data nyata sesi (commit, hasil smoke, status deploy).

### Handover notes
- Entri berikutnya harus langsung ditulis sebelum commit/deklarasi selesai — tidak boleh retroaktif besar seperti ini lagi.

## [2026-10-25] — Cloudflare Pages: perbaikan path config deployment
**Author** · **Role** (DevOps) · **Status** (Done)

### What changed
- Cloudflare Pages project `blogku` (via Cloudflare API PATCH) — `source.config`:
  - `path_includes`: `["frontend/**", "package.json", "package-lock.json"]`
  - `path_excludes`: `["docs/**", "backend/**"]`

### Why
- Tiga deployment otomatis terakhir (16:05/16:06/16:14 UTC) di-skip `path_config` saat push ke `main`; perubahan frontend tidak memicu build.

### How it was verified
- Trigger deploy manual `17dba8c3` — semua stage sukses (queued/initialize/clone_repo/build/deploy).
- `https://blogku-7rq.pages.dev` — HTTP 200; bundle `api-DBg5WLnK.js` memuat `https://d6gz0ol.app.neoapp.id` (VITE_PB_URL) — frontend tersambung ke backend NEO.
- Env produksi terverifikasi: `VITE_USE_POCKETBASE=true`, `VITE_PB_URL=https://d6gz0ol.app.neoapp.id`.

### Handover notes
- Push `frontend/**` berikutnya seharusnya memicu build otomatis (tidak lagi skip `path_config`).

## [2026-10-25] — Smoke test backend live + fix bug registrasi
**Author** · **Role** (Backend/QA) · **Status** (Done)

### What changed
- `backend/main.go` — fix hook registrasi: lookup `site_settings` dari record pertama (`FindRecordsByFilter`) bukan ID tetap `"site_settings"`.
- Smoke script `smoke_pb.ps1` (temp, tidak di-commit) — 20 check terhadap `https://d6gz0ol.app.neoapp.id`.

### Why
- Registrasi mandiri gagal 404 karena hook mencari record `site_settings` dengan ID yang tidak ada.

### How it was verified
- Smoke: 15/20 PASS (health, login admin/demo/subscriber, settings, RBAC negatif, CRUD, sanitasi HTML, publish, komentar, reaction).
- 5 FAIL teridentifikasi dengan root cause: 2 ekspektasi slug test salah (bukan bug), 2 bug harness PowerShell 5.1 (MultipartFormDataContent, perlu Add-Type), 1 bug registrasi (sudah difix di `2251cb8`).

### Handover notes
- Image backend fix (`pocketbase-custom6/7`) masih gagal deploy di NEO: build-side tidak bisa akses `registry-1.docker.io` (TLS handshake timeout) — masalah infrastruktur, bukan kode.
- Sampai fix terdeploy: sign-up mandiri di live backend (`d6gz0ol`) masih gagal; fitur lain jalan.
- Opsi lanjut: GitHub Actions build image, push ke GHCR, deploy NEO via `image:`.

## [2026-10-25] — PocketBase backend + integrasi frontend (fitur besar)
**Author** · **Role** (Dev/Backend/Docs) · **Status** (Done)

### What changed
- `backend/` — backend PocketBase kustom (Go): schema compile-time, seed, hooks (slug, RBAC guard, sanitasi, rate limit).
- `frontend/src/api/pocketbase.source.ts` + `frontend/src/lib/pb.ts` — adapter `PocketBaseSource`, opt-in `VITE_USE_POCKETBASE=true`.
- `frontend/src/api/errors.ts` — kontrak error `AppError`/`RateLimitError`.
- `frontend/src/composables/useRateLimit.ts`, `LoginPage.vue`, `EditorPage.vue`, `DashboardPage.vue`, `ProfilePage.vue` — cooldown rate-limit, draft server, form ganti password.
- `docs/features/09-pocketbase-backend-integration.md`, `docs/features/10-change-password.md`, `docs/backend-integration-spec.md`, `docs/backend-deployment-spec.md`, `docs/README.md`.

### Why
- Menyambungkan frontend Vue ke backend PocketBase nyata dengan keamanan (sanitasi HTML, RBAC, rate limit).

### How it was verified
- `npm run typecheck`, `npm run lint`, `npm run test` (80 lulus), `npm run build` — semua lulus pada commit b2c3781.
- Push GitHub sukses: b2c3781 (fitur), 2251cb8 (fix registrasi), 9ef57aa (Dockerfile tanpa syntax pragma).

### Handover notes
- Smoke slug/upload test perlu perbaikan ekspektasi + Add-Type sebelum dipakai sebagai gate CI.
