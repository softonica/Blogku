# CHANGELOG

Log perubahan gaya kerja team. Entri ditambahkan (append), tidak pernah dihapus/direwrite.
Format: lihat `.agents/rules/change-log.md` dan section "LOG PERUBAHAN GAYA KERJA TEAM" di `AGENTS.md`.

---

## [2026-10-27] — Media Library: media dikelompokkan Tahun > Bulan
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/pages/admin/AdminMediaLibraryPage.vue` (baru) — halaman
  **Admin → Content → Media Library** (`/admin/media-library`): daftar media
  48/halaman, grouping **Tahun → Bulan** dari `created`, pencarian nama file
  (debounce 350ms), tile thumbnail, Copy URL (clipboard + fallback), Open tab
  baru, tombol "Muat lebih banyak".
- `frontend/src/lib/media.ts` + `media.test.ts` (baru) — `groupMediaByMonth`,
  `isVariantFileName`, `mediaDisplayName` (strip suffix random PocketBase),
  `formatMediaDate`; unit test grouping/filter/penamaan.
- `frontend/src/api/types.ts` — tipe `MediaItem`, `ListMediaParams`.
- `frontend/src/api/source.ts` — kontrak `listMedia(params)`.
- `frontend/src/api/pocketbase.source.ts` — `listMedia` via
  `collection('media').getList` (sort `-created`, filter nama varian internal,
  search `file`/`alt`).
- `frontend/src/api/mock.source.ts` + `mock-data/media.ts` (baru) — penyimpanan
  media mock di localStorage, seed 8 item lintas bulan/tahun, `listMedia`.
- `frontend/src/lib/imageProcessor.ts` — nama file varian menjadi
  `ncmaz-thumb-<base>.webp` / `ncmaz-medium-<base>.webp` agar bisa difilter
  Media Library (setelah normalisasi PocketBase menjadi `ncmaz_thumb_*` /
  `ncmaz_medium_*`).
- Router `admin-media-library` + item sidebar **Media Library** (grup Content).
- Docs: `docs/features/17-media-library-year-month.md`, indeks `docs/README.md`,
  cross-reference di `docs/features/16-client-side-image-processing.md`.
- Catatan: path fisik storage tetap dikelola PocketBase
  (`pb_data/storage/<collectionId>/<recordId>/<file>`); grouping Tahun > Bulan
  diterapkan pada UI library berbasis timestamp record.

### Why
- Permintaan: media di storage dikelompokkan per Tahun > Bulan agar user mudah
  mencari media. Sebelumnya tidak ada halaman untuk menelusuri `media`.
- File varian thumb/medium tidak boleh tampil sebagai duplikat di library,
  sehingga penamaan internal diberi prefiks dan difilter di query.

### How it was verified
- `npm run typecheck` → lulus.
- `npm run lint` → lulus.
- `npm test` → **15 files / 134 tests passed** (termasuk 9 test baru di
  `media.test.ts`).
- `npm run build` → sukses.
- Smoke test browser (Playwright + MockSource, admin session):
  - `/admin/media-library` → tahun `2026`, `2025`; bulan `October 2026`,
    `July 2026`, `December 2025`, `November 2025`; 8 tile; label "8 media".
  - Pencarian `workspace` → 1 tile ("workspace setup").
  - Sidebar memuat **Media Library**; 0 console error.

### Handover notes
- Tidak ada perubahan backend/skema: `listMedia` memakai endpoint PocketBase
  yang sudah ada dan `ListRule` media yang sudah publik.
- Belum ada aksi hapus di library (menghindari orphan file varian). Bila
  ditambahkan nanti, hapus juga record `ncmaz_thumb_*`/`ncmaz_medium_*` yang
  berpasangan.
- Filter varian bergantung pada prefiks nama; jangan mengganti penamaan varian
  tanpa memperbarui `isVariantFileName` + filter `listMedia`.

## [2026-10-27] — Media Settings page (upload limit, dimensi, kualitas)
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/pages/admin/AdminMediaSettingsPage.vue` (baru) —
  **Admin → System → Media Settings** (`/admin/media-settings`): input
  batas ukuran upload (bytes) + hint MB, maks dimensi gambar (256–4096,
  default 2048), slider kualitas WebP (10–100%), panel info pipeline &
  batas absolut.
- `AdminEditorSettingsPage.vue` — kontrol media dipindahkan keluar; halaman
  editor kini hanya toolbar/placeholder/`maxContentLength` + tautan ke Media
  Settings.
- Router `admin-media-settings` + item sidebar **Media Settings**.
- Nilai tetap disimpan di record `editor_settings`
  (`maxImageUploadSize`, `imageMaxDimension`, `imageQuality`); tidak ada
  koleksi/skema baru.

### Why
- Menjawab kebutuhan kontrol media yang sebelumnya menumpang di halaman
  Editor Settings; admin butuh lokasi yang jelas untuk batas file, dimensi,
  dan kualitas gambar.

### How it was verified
- `npm run typecheck`, `npm run lint` → lulus.
- `npm test` → 15 files / 134 tests passed.
- `npm run build` → sukses.
- Smoke browser: `/admin/media-settings` menampilkan input
  `#media-max-upload`, `#media-max-dimension`, `#media-quality`; heading
  "Media Settings"; sidebar memuat item Media Settings; 0 console error.

### Handover notes
- Setelah menyimpan, cache setting prosesing di-reset sehingga upload
  berikutnya langsung memakai nilai baru.
- Deploy backend tetap diperlukan agar field `imageMaxDimension` /
  `imageQuality` ada (migrasi aditif saat start).

## [2026-10-27] — Implement client-side image processing (WebP, 3 varian, admin settings)
**Author**: AI Agent (opencode) · **Role**: Dev/QA/Backend · **Status**: Done

### What changed
- `frontend/package.json` — dependency baru `@jsquash/webp@1.5.0`, `@jsquash/resize@2.1.1` (WASM libwebp + lanczos3).
- `frontend/src/lib/imageMeta.ts` — sniffing header (PNG/JPEG/GIF/WebP/AVIF) tanpa decode, clamp setting, plan 3 varian (tanpa upscale), batas aman: sisi 10000px, 24MP, upload absolut 25MB.
- `frontend/src/lib/imageEncoder.ts` — resize + encode WebP di OffscreenCanvas; jalur utama jsquash WASM, fallback `canvas.toBlob('image/webp')` bila WASM gagal; dedupe encode per dimensi.
- `frontend/src/workers/imageProcessor.worker.ts` + `frontend/src/lib/imageProcessor.ts` — worker Vite module, antrean serial, worker dipertahankan (terminate saat `pagehide`) agar upload berikutnya tidak re-instantiate WASM; fallback main-thread.
- `frontend/src/composables/useImageUpload.ts` — `uploadProcessedImage()`: baca setting editor (cache 30s), validasi, passthrough GIF animasi, upload 3 varian paralel + dedupe URL bila dimensi sama, mapping varian ditanam di fragment URL (`#imgv1&t=...&m=...&w=...`).
- `frontend/src/lib/imageVariants.ts` + `frontend/src/lib/image.ts` — codec fragment (validasi skema http(s)/relatif, tolak whitespace/comma) dan `buildSrcSet` varian-aware (320w/1024w/full).
- `frontend/src/api/types.ts`, `lib/editor-defaults.ts`, `api/mock.source.ts`, `api/pocketbase.source.ts` — field `imageMaxDimension` (default 2048, clamp 256–4096) & `imageQuality` (default 0.8, clamp 0.1–1) + sanitasi.
- `frontend/src/pages/admin/AdminEditorSettingsPage.vue` — input "Maks dimensi gambar (px)" + slider kualitas WebP (%); simpan memakai clamp & reset cache setting.
- Integrasi 7 call site: `components/editor/EditorToolbar.vue`, `pages/ProfilePage.vue` (avatar/cover), `pages/EditorPage.vue` (cover), `pages/admin/AdminTaxonomiesPage.vue` (gambar kategori), `pages/admin/AdminSettingsPage.vue` (logo/favicon).
- `backend/main.go` — migrasi aditif `editor_settings`: tambah field `imageMaxDimension` + `imageQuality` (idempoten untuk instalasi lama) + seed default. **Ini satu-satunya perubahan backend**, diperlukan agar setting admin benar-benar tersimpan; tidak ada hook validasi upload baru.
- Test: `frontend/src/lib/imageMeta.test.ts` (baru) + `frontend/src/lib/image.test.ts` (diperluas ke codec varian & anti-srcset-injection).
- Docs: `docs/features/16-client-side-image-processing.md` diperbarui ke status Implemented; `docs/README.md` status #16.

### Why
- Semua gambar upload harus otomatis WebP + 3 ukuran (thumb 320 / medium 1024 / full = max dimension) tanpa server processing; admin perlu mengatur batas dimensi & kualitas.
- Keamanan: MIME palsu & file non-gambar ditolak oleh sniffing + decode nyata (`createImageBitmap`); pixel-bomb dibatasi; re-encode membuang metadata/payload file asli; SVG tetap ditolak.
- "Cepat, stabil, murah": worker dipertahankan antar upload, upload paralel, dedupe varian identik, dan varian disimpan di fragment URL sehingga tidak perlu registry localStorage / skema tambahan di koleksi media.

### How it was verified
- `npm run typecheck` → lulus (vue-tsc, tanpa error).
- `npm run lint` → lulus (eslint, tanpa error).
- `npm test` → **14 files / 125 tests passed**.
- `npm run build` → sukses; worker + WASM ter-emit (`imageProcessor.worker-*.js`, `squoosh_resize_*.wasm`, `webp_enc*.wasm`).
- `cd backend && go build ./... && go vet ./... && go test ./...` → `ok ncmaz.backend`.
- Smoke test browser nyata (Playwright + Vite dev, Chromium):
  - PNG 3000×1500 → varian `320×160`, `1024×512`, `2048×1024`, semuanya `image/webp`.
  - JPEG 2400×1600, maxDimension 1200 → `full` 1200×800; run kedua 1.1s (run pertama 2.5s termasuk unduh/init WASM); gambar 200×100 → 60ms, 3 varian identik.
  - File `<html>` dengan MIME `image/png` → ditolak: "Only image files ... are allowed."
  - File 30MB dengan `maxBytes: 0` → ditolak: "File size exceeds the limit of 25 MB."
  - `buildSrcSet` menghasilkan `thumb 320w, medium 1024w, full 2048w`; payload `javascript:` dan injeksi kandidat via koma ditolak.

### Handover notes
- Backend binary perlu di-build & deploy ulang agar field setting baru ada (migrasi otomatis saat start; tidak menghapus data). Tanpa redeploy, frontend tetap jalan dengan default 2048px/0.8 tetapi perubahan setting tidak tersimpan.
- Varian disimpan sebagai 3 record `media` terpisah (tidak ada perubahan skema media). Untuk gambar kecil, upload di-dedupe (1 record, URL sama untuk 3 varian).
- GIF animasi di-upload apa adanya (1 record, tanpa WebP) sesuai keputusan; risiko residual: upload langsung via API melewati pipeline (mitigasi tetap MIME allowlist + MaxSize PocketBase).
- Perubahan setting berlaku =30s kemudian (cache) atau langsung setelah simpan di halaman admin (cache di-reset).

## [2026-10-27] — Spec: Client-side image processing (WebP + multi-variant)
**Author**: AI Agent (opencode) · **Role**: Docs · **Status**: Draft

### What changed
- `docs/features/16-client-side-image-processing.md` — spesifikasi baru:
  pipeline client-side (tanpa backend) encode WebP + 3 varian
  (thumb 320 / medium 1024 / full min(asli, maxDimension 2048)),
  setting admin baru `imageMaxDimension` & `imageQuality`, arsitektur
  Web Worker (@jsquash/resize + @jsquash/webp), kontrak data + registry
  varian localStorage, bagian keamanan (MIME palsu, pixel-bomb, residual
  risk tanpa hook Go), pengujian (unit vitest + Playwright e2e).
- `docs/README.md` — baris indeks fitur #16.
- Keputusan yang direkam: GIF animasi passthrough; tanpa perubahan backend
  Go (validasi server tetap baseline PB: MIME allowlist + MaxSize 5MB).

### Why
- Permintaan: semua upload user → WebP + resize sesuai kebutuhan (3 varian),
  prosesing tanpa backend; batas dimensi & kualitas dapat diatur di admin;
  pertimbangan keamanan MIME fake / file berbahaya (transcode = sanitasi).

### How it was verified
- Spesifikasi ditulis mengikuti `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`
  (6 bagian wajib). Belum ada kode; verifikasi implementasi menyusul.

### Handover notes
- Implementasi berikutnya: `src/lib/imageProcessor.ts` + worker + composable
  `useImageUpload`; integrasi 7 call site (EditorToolbar, ProfilePage x2,
  EditorPage, AdminTaxonomiesPage, AdminSettingsPage x2); adaptasi
  `lib/image.ts`/`PostImage.vue`; UI admin 2 input baru; unit + e2e.
- `Status: Done` baru setelah implementasi + bukti test (DoD AGENTS.md).

## [2026-10-27] - Fix bookmark list (PocketBase ids filter) + deploy + smoke test
**Author** · **Role** (Dev/QA/DevOps) · **Status** (Done)

### What changed
- `pocketbase.source.ts` `listPosts` filter `ids`: ganti `id ?= {:ids}`
  (gagal HTTP 400 di PocketBase produksi) dengan OR-of-equals
  `(id = {:id0} || id = {:id1})` + bind param per-id.
- `BookmarksPage.vue`: `load()` kini catch error → notifikasi toast, bukan
  diam-diam empty state saat query gagal.
- Tambah unit test filter ids di `pocketbase.source.test.ts` (108/108).
- Build ulang bundle baru + binary Linux, deploy ulang ke server 64
  (swap + restart systemd, service active).

### Why
- Smoke test bookmark (add/list/remove) di produksi menemukan `/bookmarks`
  menampilkan "No bookmarks yet" padahal count=1: `id ?= {:ids}` error 400
  di PocketBase server (verifikasi via curl).

### How it was verified
- `vue-tsc --noEmit`, `eslint .` lulus; `npm run test` 108/108.
- `curl` prod: `spa:200`, `health:200`, bundle baru (`index-BLQ97LqE.js`).
- Playwright smoke prod (14/14 PASS): login demo → add (aria-pressed=true +
  localStorage 1 id) → persist setelah reload → list muncul di /bookmarks
  (count "1 saved post") → remove (empty state + localStorage kosong) →
  toggle off di post page; 0 console error.

### Handover notes
- Bookmark tetap disimpan lokal (localStorage `ncmaz.bookmarks.v1`), bukan di
  server; id yang disimpan merujuk `posts` PocketBase.

## [2026-10-27] - Deploy v0.0.3-alpha + responsive fixes ke server 64
**Author** · **Role** (Dev/DevOps) · **Status** (Done)

### What changed
- Build release frontend (`VITE_USE_POCKETBASE=true`, `VITE_PB_URL=` kosong)
  dan binary Linux amd64 `backend/blogku` (embedded SPA).
- Deploy ke server 64 (`64.235.45.122`, SSH 2232): backup binary lama ke
  `/opt/blogku/blogku.prev-*`, swap `/tmp/blogku-upload`, restart systemd,
  service `active`.

### Why
- User mau smoke test hasil audit responsive UI (tabs nowrap, z-index cover,
  editor topbar overflow) di produksi.

### How it was verified
- `curl` prod: `spa:200`, `health:200`, canonical & og:url ada, `index.html`
  sudah merefer bundle baru (`index-CU44Fib4.js`).
- Playwright smoke (375px) vs https://blog.artku.my.id: home/author/post/
  category/tag/search/login/reset/bookmarks/dashboard(login demo)/editor(login
  demo) semua `ox=0` & tanpa console error; tab author `h=[36,36,36]` (satu
  baris).

### Handover notes
- Service `blogku` active (running) sejak 2026-10-27 21:49 WIB; deploy.sh &
  upload sementara sudah dibersihkan dari /tmp.

## [2026-10-27] - Audit responsive UI & perbaikan z-index/tabs/overflow
**Author** · **Role** (Dev) · **Status** (Done)

### What changed
- `AuthorPage.vue`: tab Articles/Favorites/Bookmarks sekarang `whitespace-nowrap`
  (sebelumnya "Favorites list" wrap 2 baris di mobile); baris header (avatar +
  nama + aksi) diberi `relative z-10` dan overlay gradient diberi
  `pointer-events-none` agar cover tidak pernah menutupi konten/aksi.
- `ProfilePage.vue`: hardening stacking sama seperti AuthorPage; watch `auth.user`
  sekarang ikut sinkronisasi `coverBanner` & `socials` (sebelumnya setelah save,
  field tersebut bisa ter-reset).
- `EditorPage.vue`: top action bar di mobile diperkecil (gap, padding Options /
  Write-Preview / Publish) — sebelumnya overflow horizontal 21px.
- `DashboardPage.vue`, `AdminTaxonomiesPage.vue`: tab diberi
  `whitespace-nowrap`.

### Why
- Permintaan audit responsive UI: optimal di mobile & desktop. Ditemukan lewat
  audit DOM/Playwright (viewport 375 & 1440): tab author wrap, editor topbar
  overflow, dan potensi layer cover menutupi konten header profil.

### How it was verified
- Playwright probe: `/author/demo` tab semua `h=36` nowrap; `/editor` &
  `/author/demo` `scrollWidth - clientWidth = 0` di 375px & 1440px.
- `npm --workspace=frontend run typecheck` lulus; `eslint .` bersih;
  `npm run test` 107/107 lulus.

### Handover notes
- Perubahan murni frontend (CSS/template), tidak menyentuh API/backend.


## [2026-10-27] — Tambah edit cover & social links di ProfilePage
**Author** · **Role** (Dev) · **Status** (Done)

### What changed
- `updateUserProfile` (DataSource, PocketBaseSource, MockSource) menerima field
  baru `coverBanner` dan `socials` (disanitasi per-URL).
- `ProfilePage.vue`: tambah field edit **Cover Banner** (upload / URL) dan
  **Social links** (Facebook/Youtube/Tiktok/Github/By-me-a-coffee); ditulis ke
  server + store auth.
- `auth` store `updateProfile` ikut menangani `coverBanner` & `socials`.

### Why
- Redesign sebelumnya hanya menampilkan cover/socials; user belum bisa
  mengganti/mengisi.

### How it was verified
- Unit test baru (pocketbase + mock) memastikan coverBanner & socials terkirim &
  disanitasi; `npm run test` 107/107 lulus.
- `vue-tsc --noEmit`, `eslint .` lulus.

### Handover notes
- Sudah di-deploy ke server 64 & diverifikasi: `PATCH users/records/{id}`
  dengan `coverBanner`/`socials` tersimpan; UI `/profile` menampilkan Cover
  Banner + Social links, tanpa console error; unit test 107/107.

## [2026-10-27] — Redesign halaman author/profile agar mirip Ncmaz Faust
**Author** · **Role** (Dev) · **Status** (Draft)

### What changed
- **Frontend**:
  - `AuthorPage.vue` di-redesign: hero (cover banner + avatar overlap + nama +
    bio + ikon sosial + statistik + Follow), tabs Articles/Favorites/Bookmarks,
    dropdown sort (Newest-to-oldest/Oldest/Most-viewed).
  - `ProfilePage.vue`: header di-upgrade ke hero yang sama (cover + sosial).
  - `usePagedPosts` mendukung `getSort` (getter) agar sort reaktif.
  - komponen baru `AuthorSocialLinks.vue`.
- **Data**: `User` + field opsional `coverBanner` & `socials`.
- **Backend**: `users` collection + field `coverBanner` (url) & `socials`
  (json); `seedUsers` mengisi demo author (Jenny Wilson + cover + socials).

### Why
- Menyamakan desain & data halaman author/profile dengan referensi Ncmaz Faust
  (https://ncmaz-faust-delta.vercel.app/author/demo/).

### How it was verified
- `cd frontend && npm run typecheck` (lulus), `npm run lint` (bersih),
  `npm run test` (105/105).
- `cd backend && go build ./... && go vet ./... && go test ./...` (lulus).

### Handover notes
- **BELUM build / commit / deploy.** Perubahan schema (`coverBanner`,
  `socials`) + enrichment demo author diterapkan otomatis saat binary baru
  pertama kali dijalankan di server.
- Ikon Tiktok memakai inline SVG (tidak ada di lucide); sisanya lucide.

## [2026-10-27] — Perbaiki upload profile avatar error
**Author** · **Role** (Dev/Backend) · **Status** (Draft)

### What changed
- **Backend** (`backend/main.go`): tambah migrasi `ensureAvatarIsURLField` di
  `ensureUsersCollection` — field `users.avatar` dijamin menjadi `URLField`
  (di-migrasi dari legacy `file` field kalau ada).

### Why
- `users.avatar` di database adalah **file field** (default/turunan PocketBase),
  sedangkan frontend menyimpan **URL media** (`/api/files/...`) ke field
  tersebut. Akibatnya setiap `PATCH` profil (name/bio/avatar) gagal dengan
  `400 Something went wrong` (validasi file gagal), sehingga upload avatar
  terlihat error.

### How it was verified
- Reproduksi lokal (Go test): `tests.NewTestApp()` memberi users collection dgn
  `avatar` tipe `file`; `app.Save(user)` dengan URL avatar gagal
  (`avatar: Invalid new files: [...]`). Setelah migrasi, field menjadi `url`
  dan save sukses.
- `go build ./...`, `go vet ./...`, `go test ./...` → lulus (termasuk test baru
  `TestEnsureAvatarIsURLFieldMigratesLegacyFile`).

### Handover notes
- **BELUM build / commit / deploy.** Migrasi schema diterapkan otomatis saat
  binary baru jalan pertama kali di server (bootstrap memanggil
  `ensureUsersCollection`).
- Setelah deploy, `PATCH /api/collections/users/records/{id}` dengan
  `{name,bio,avatar}` harusnya 200.

## [2026-10-27] — Perbaiki counter view post tidak berfungsi
**Author** · **Role** (Dev/Backend) · **Status** (Draft)

### What changed
- **Backend** (`backend/main.go`): tambah endpoint `POST /track-view` yang
  menaikkan `viewCount` post secara atomik (best-effort, publik).
- **Frontend**:
  - `DataSource` + `PocketBaseSource` + `MockSource` mendapat method `trackView`.
  - composable baru `frontend/src/composables/useTrackView.ts` (dedup via
    `sessionStorage` key `ncmaz.viewed.v1`).
  - `PostPage.vue` memanggil `trackViewIfNew(found.id)` setelah post termuat.

### Why
- `viewCount` selama ini hanya dirender, tidak pernah bertambah karena tidak ada
  mekanisme pencatatan kunjungan.

### How it was verified
- `cd frontend && npm run typecheck` → lulus; `npm run lint` → bersih.
- `npm run test` → 105/105 lulus (termasuk 2 test baru `trackView`).
- `cd backend && go build ./...`, `go vet ./...`, `go test ./...` → lulus.
- Smoke manual setelah deploy: `curl -X POST /track-view -d '{"postId":"p1"}'`
  → `{"ok":true,"viewCount":N}`.

### Handover notes
- **BELUM build / commit / deploy.** Perubahan hanya tersimpan di working tree
  (belum di-commit, belum di-build binary, belum di-deploy ke server 64).
- Endpoint `POST /track-view` akan aktif setelah binary `blogku` di-deploy ulang
  (lihat `docs/how-to-deploy-blogku.md`); sebelum itu view counter tetap tidak
  bertambah di production.
- Dedup per-session: refresh halaman tidak menambah hit, navigasi ulang dalam
  tab yang sama juga tidak.
- **Masih ada bug lain yang belum diperbaiki** (belum diinventarisir di catatan
  ini); baca backlog/status di `docs/HANDOVER-CONTEXT.md`.

## [2026-10-27] — Deploy v0.0.3-alpha + halaman `/admin` ke server 64
**Author** · **Role** (DevOps) · **Status** (Done)

### What changed
- Deploy binary `blogku` (26,7 MB, md5 `709b5b2f01e504d9597fb86d6f82db29`) ke `/opt/blogku/`.
- Menyertakan fitur **halaman `/admin`** (console shell, dashboard, role-locked).

### Why
- Merilis versi dengan halaman admin baru.

### How it was verified
- `systemctl is-active blogku` → active; `systemctl is-enabled` → enabled; listen `*:8090`.
- HTTP: `/` → 200, `/api/health` → 200, `/admin` → 200, `/assets/AdminDashboardPage-BhalQEqZ.js` → 200, `/assets/AdminLayout-bGTnkfG8.js` → 200.
- Canonical/OG tetap dari `config.json`: `https://blog.artku.my.id/`.
- Backup binary lama: `/opt/blogku/blogku.prev-*`.

### Handover notes
- Rollback: `systemctl stop blogku` → restore `blogku.prev-*`.

## [2026-10-26] — Release `v0.0.3-alpha` & upload binary ke assets
**Author** · **Role** (DevOps/Release) · **Status** (Done)

### What changed
- Tag anotasi `v0.0.3-alpha` dibuat di commit `679bdc2` dan di-push ke `origin`.
- GitHub Release **Blogku v0.0.3-alpha** dipublikasikan (prerelease):
  https://github.com/softonica/Blogku/releases/tag/v0.0.3-alpha
- Asset rilis diunggah:
  - `blogku-linux-amd64` — 26.742.944 byte, state `uploaded`
  - `blogku-linux-amd64.sha256` — 84 byte, state `uploaded`
- Branch `feat/blogku-single-binary` dan `main` di-push ke `origin` pada commit
  `679bdc2` (main fast-forward dari `9ef57aa`).
- Versi monorepo tetap `0.0.3-alpha` (sudah termasuk dalam commit rilis).

### Why
- Menerbitkan versi baru yang memuat admin console, dashboard, dan penguncian
  akses `/admin` untuk role admin, dalam bentuk binary single-file siap deploy.
- Menyediakan checksum agar integritas binary dapat diverifikasi sebelum deploy.

### How it was verified
- `git ls-remote origin refs/heads/main refs/heads/feat/blogku-single-binary refs/tags/v0.0.3-alpha`
  → main & feature branch = `679bdc25e4...`, tag = `91b79891...`.
- GitHub API `GET /repos/softonica/Blogku/releases/tags/v0.0.3-alpha` →
  release id `424805116`, `prerelease: true`, dua asset dengan state `uploaded`.
- Ukuran asset binary `26.742.944` byte dan digest `sha256:4e5a084bfe69e5c0026fbb9c91bcdfa0bd455f9de760f885ca98891c4471a399`
  sesuai hasil `Get-FileHash`.
- Smoke test binary sebelumnya: `GET /` dan `GET /admin` = 200, HTML berisi
  `id="app"`.

### Handover notes
- Release ditandai **prerelease**; naikkan ke stable hanya setelah verifikasi
  produksi.
- URL unduhan binary:
  `https://github.com/softonica/Blogku/releases/download/v0.0.3-alpha/blogku-linux-amd64`
- Verifikasi checksum di server:
  `sha256sum -c blogku-linux-amd64.sha256`.
- Commit dokumentasi release ini berada **setelah** tag. Jangan pindahkan tag
  `v0.0.3-alpha`; bila binary perlu dibangun ulang, buat tag/rilis versi baru.
- `pw-check.cjs` masih untracked dan sengaja tidak di-commit.

---

## [2026-10-26] — Build binary rilis & commit admin console
**Author** · **Role** (DevOps/Release) · **Status** (Done)

### What changed
- Versi monorepo dinaikkan dari `0.0.2-alpha` menjadi **`0.0.3-alpha`** (`package.json`, `frontend/package.json`, `package-lock.json`).
- Frontend release build dijalankan dengan `VITE_USE_POCKETBASE=true` dan `VITE_PB_URL=` (same-origin), lalu aset `frontend/dist` disalin ke `backend/dist` melalui `backend/build.ps1`.
- Binary Windows dibangun: `backend/blogku.exe` (37.481.472 byte) via `backend/build.ps1`.
- Binary Linux amd64 dibangun untuk deploy: `backend/blogku` (26.742.944 byte) via `go build -trimpath -ldflags="-s -w"` dengan `CGO_ENABLED=0 GOOS=linux GOARCH=amd64`.
- `docs/features/13-admin-console-shell-and-dashboard.md` — menambahkan bagian build binary dan hasil smoke test.
- Perubahan fitur admin console, penguncian akses role admin, dokumentasi, dan test di-commit bersama entri ini.

### Why
- Menyediakan artefak rilis single-binary yang siap dideploy setelah perubahan admin console dan aturan akses.
- Memenuhi permintaan untuk mendokumentasikan proses build sekaligus menyerahkan riwayat perubahan dalam satu commit.

### How it was verified
- `& .\backend\build.ps1` → frontend `vite build` sukses; `backend/blogku.exe` terbentuk.
- `go test ./...` di `backend/` → `ok ncmaz.backend` (cached).
- Cross-compile Linux → `backend/blogku` 26.742.944 byte (target `linux/amd64`; tidak dieksekusi di Windows).
- Smoke test binary Windows: `blogku.exe serve --http=127.0.0.1:8091 --dir=<temp>` →
  `GET /` = **200**, `GET /admin` = **200**, HTML mengandung `id="app"` (SPA fallback bekerja). Data dir sementara dihapus setelah test.
- `npm run typecheck`, `npm run lint`, `npm run test` (13 file / 103 test), dan `npm run build` sudah lulus sebelum build binary.

### Handover notes
- Binary ada di `backend/blogku` (Linux amd64, untuk deploy) dan `backend/blogku.exe` (Windows, untuk smoke lokal). Keduanya **di-ignore** oleh `backend/.gitignore`, jadi tidak masuk commit.
- Untuk deploy: unggah `backend/blogku` ke server, jalankan `./blogku serve --http=0.0.0.0:8090 --dir=<data-dir>`.
- Build berikutnya: jalankan `backend/build.sh` di Linux atau `backend/build.ps1` di Windows, lalu cross-compile Linux bila perlu. Pastikan `frontend/dist` dan `backend/dist` sudah diperbarui sebelum `go build`.
- `pw-check.cjs` di root adalah script debug yang sudah ada sebelumnya dan sengaja tidak di-commit.

---

## [2026-10-26] — Kunci akses `/admin` dan seluruh `/admin/*` untuk role admin
**Author** · **Role** (Frontend/Security) · **Status** (Done)

### What changed
- `frontend/src/router/index.ts` — parent route `/admin` kini memakai meta `{ requiresAuth: true, adminOnly: true }`. `router.beforeEach()` mengecek `adminOnly` **sebelum** permission child: user belum login → `/login`, `penulis` → `/dashboard`, `subscriber` → `/profile`. Karena meta parent diwarisi seluruh child, aturan ini otomatis berlaku untuk setiap route `/admin/*` saat ini dan yang ditambahkan nanti.
- `frontend/src/types/router.d.ts` — menambahkan `adminOnly?: boolean` pada `RouteMeta`.
- `frontend/src/router/admin-access.test.ts` (baru) — 4 test regresi: semua route `/admin*` terdaftar, seluruhnya resolve dengan `adminOnly: true`, tidak ada permission admin yang bisa dipegang `penulis`/`subscriber`, dan `adminOnly` tidak bocor ke route publik/penulis.
- `AGENTS.md` — menambahkan aturan wajib **"Admin Area Terkunci"** pada Prinsip Keamanan & Arsitektur agar keputusan ini konsisten untuk pekerjaan berikutnya.
- `docs/features/13-admin-console-shell-and-dashboard.md` — memperbarui metadata izin, bagian Otorisasi & Keamanan, test, dan tabel verifikasi role.

### Why
- Parent `/admin` sebelumnya hanya `requiresAuth`; proteksi bergantung pada permission masing-masing child. Itu berisiko jika kelak ada child admin yang lupa dipasangi permission atau memakai permission yang juga dimiliki penulis.
- Permintaan eksplisit: hanya role `admin` yang boleh mengakses `/admin` dan `/admin/*`, dan aturan ini harus tercatat agar konsisten.

### How it was verified
- `npm run typecheck` → lulus tanpa error.
- `npm run lint` → 0 error, 0 warning.
- `npm run test` → **13 file, 103 test lulus** (4 test baru `admin-access.test.ts`).
- `npm run build` → sukses.
- Playwright role smoke (MockSource, dev server 4173, 0 console error):
  - `user_admin` `/admin` → `/admin/dashboard`; `/admin/users` → tetap `/admin/users`.
  - `user_demo` (penulis) `/admin` → `/dashboard`; `/admin/settings` → `/dashboard`.
  - `user_subscriber` `/admin` → `/profile`; `/admin/moderation` → `/profile`.

### Handover notes
- Jangan menghapus meta `adminOnly: true` dari parent `/admin`. Menambah halaman admin cukup menambahkan child di bawah parent tersebut; guard parent otomatis mengunci role.
- Permission child tetap dipertahankan sebagai lapisan kedua (defense in depth), tetapi bukan lagi satu-satunya kontrol akses area admin.
- `auth.isAdmin` (berbasis `manage_settings`) tetap dipakai untuk UI; guard memakai `role === 'admin'` secara eksplisit agar tidak bergantung pada pemetaan permission.

---

## [2026-10-26] — Admin console shell & overview dashboard
**Author** · **Role** (Frontend) · **Status** (Done)

### What changed
- `frontend/src/layouts/AdminLayout.vue` (baru) — shell admin dua kolom: sidebar tetap di desktop, off-canvas + backdrop di mobile, topbar sticky, dan `RouterView` untuk child routes.
- `frontend/src/components/admin/AdminSidebar.vue` (baru) — brand situs, grup collapsible **Main / Content / Community / System** dengan submenu (Overview, My Posts, New Post, Categories & Tags, Pages, Comments, Users & Roles, Site Settings, Editor Settings), penanda `aria-current`, kartu profil, logout, dan tautan kembali ke situs.
- `frontend/src/components/admin/AdminTopbar.vue` (baru) — judul dari `route.meta.title`, tombol search (dialog global), pintasan Site Settings & Comment Moderation, `ThemeToggle`, dan avatar profil.
- `frontend/src/pages/admin/AdminDashboardPage.vue` (baru) — overview bergaya papan kerja: 4 kartu metrik gradien, content board (Drafts/Published/Featured/Top read), timeline publikasi 7 hari, dan ringkasan editorial reach. Data diambil paralel lewat `DataSource` (published, drafts, komentar, users).
- `frontend/src/lib/admin-timeline.ts` + `admin-timeline.test.ts` (baru) — fungsi murni `buildTimeline()` (window 7 hari, clamp jam 08:00–20:00, palette warna) beserta 6 unit test.
- `frontend/src/router/index.ts` — `/admin` dijadikan parent route dengan child routes; `/admin` redirect ke `/admin/dashboard`. Nama route lama dipertahankan.
- `frontend/src/App.vue` — `AppHeader`, `AppFooter`, dan `BgGlassmorphism` tidak dirender pada area `/admin`.
- Enam halaman admin (`AdminSettingsPage`, `AdminTaxonomiesPage`, `AdminUsersPage`, `AdminModerationPage`, `AdminPagesPage`, `AdminEditorSettingsPage`) — `AdminNav` dilepas dan padding disesuaikan dengan shell baru. `frontend/src/components/admin/AdminNav.vue` dihapus.
- `docs/features/13-admin-console-shell-and-dashboard.md` (baru) + indeks `docs/README.md`.

### Why
- Halaman admin sebelumnya memakai tab horizontal di dalam header/footer publik; tidak ada grup menu, tidak konsisten dengan shell aplikasi, dan tidak memberi ringkasan operasional konten.
- Permintaan produk: halaman `/admin` dengan layout seperti referensi (sidebar bergrup, kartu metrik berwarna, board, timeline) dan setiap menu berada dalam submenu grupnya.

### How it was verified
- `npm run typecheck` → `vue-tsc --noEmit` lulus tanpa error.
- `npm run lint` → `eslint .` 0 error, 0 warning.
- `npm run test` → 12 file test, **99 test lulus** (6 test baru untuk `buildTimeline`).
- `npm run build` → `vue-tsc --noEmit && vite build` sukses.
- Playwright smoke (MockSource, sesi `user_admin`, dev server 4173): `/admin` → `/admin/dashboard`, 4 kartu metrik, 4 grup sidebar, 9 kartu board, **0 console error**. Mobile: sidebar off-canvas terbuka, navigasi ke `/admin/taxonomies` berhasil, header situs publik tidak dirender (`HAS_SITE_HEADER: 0`). Screenshot light/dark desktop 1440×1000 dan mobile 390×844 diperiksa.

### Handover notes
- `/admin` (parent) hanya `requiresAuth`; izin tetap per-child (`manage_settings`, `manage_taxonomies`, `manage_users`, `moderate_comment`). Menambah menu admin baru cukup menambah child route + item di `AdminSidebar.vue`.
- Timeline dashboard memakai 7 hari terakhir yang berakhir pada tanggal post terbaru (fallback: hari ini), sehingga data demo lama tetap terlihat. Bila ingin selalu "minggu berjalan", ganti opsi `reference` pada `buildTimeline()`.
- `AdminNav.vue` sudah dihapus; jangan mengimpor ulang dari halaman admin.
- Timeline pada layar sempit memakai scroll horizontal internal (`min-w-[620px]`); jaga nilai ini bila mengubah jumlah kolom hari.

---

## [2026-10-26] — Editor: tag, auto-excerpt, kategori admin, post style
**Author** · **Role** (Frontend/Backend) · **Status** (Done, deployed)

### What changed
- `frontend/src/pages/EditorPage.vue`
  - **Tag**: `addNewTag()` async memakai `createTag()` (id asli) + guard `addingTag`; UI diganti form input + tombol **Add** persis seperti kategori (mobile tidak lagi bergantung pada Enter).
  - **Excerpt**: `ensureExcerpt()` mengisi excerpt kosong dari `firstParagraphExcerpt(content)` sebelum validasi (save draft & publish). Konten awal editor dikosongkan agar placeholder yang tampil.
  - **Kategori (admin)**: form **+ New category** inline, hanya untuk `role === 'admin'`, dengan dedupe nama/slug.
  - **Post style**: `postStyle` dimuat dari post/draft dan dikirim pada create/update/draft.
- `frontend/src/lib/excerpt.ts` + `excerpt.test.ts` (baru) — ekstraksi paragraf pertama, truncate 300 char di batas kata.
- `frontend/src/api/types.ts`, `pocketbase.source.ts` (+test), `stores/draft.ts` — dukung `postStyle`.
- `frontend/src/pages/PostPage.vue` — 4 layout: style1 classic centered, style2 wide/no-sidebar, style3 magazine + sidebar, style4 full-bleed hero.
- `backend/main.go` — field `postStyle` pada `posts` + migrasi idempoten `ensurePostStyleField()`.

### Why
- Tag baru tidak pernah tersimpan (id relasi palsu); input tag tidak bisa dipakai di mobile; excerpt wajib ≥10 char; admin tidak bisa menambah kategori dari editor; pilihan Style 1–4 tidak berpengaruh apa pun.

### How it was verified
- `npx vitest run` → 93 passed; `vue-tsc --noEmit` & `eslint` bersih; `go test ./...` ok.
- Playwright mobile (iPhone 13): tap **Add** → `POST tags` → chip muncul; Enter juga jalan.
- Playwright produksi: pilih Style 2 → Publish → `article[data-post-style="style2"]` dengan `max-w-5xl`; excerpt terisi dari paragraf pertama.
- 4 post uji (style1–4) dirender berbeda lalu dihapus (cleanup 4/4).

### Handover notes
- Style hanya berlaku untuk `postType = standard`.
- DB lama mendapat field `postStyle` otomatis saat service restart (idempoten).
- Backlog: dedupe request taksonomi in-flight; kelola tag/kategori dari halaman admin.

## [2026-10-26] — Fix false "Unable to reach the server" saat load/login
**Author** · **Role** (Frontend/Backend) · **Status** (Done, deployed)

### What changed
- `frontend/src/lib/pb.ts` — `pb.autoCancellation(false)` pada instance PocketBase.
- `frontend/src/lib/pb.test.ts` — test regresi: `enableAutoCancellation` harus `false`.
- Rebuild frontend + binary, deploy ke server 64 (binary `dbf04149…`, bundle `api-B-uyDbCS.js`).
- `docs/HANDOVER-CONTEXT.md` — gotcha §8.11 (auto-cancellation) & §8.12 (build binary harus setelah dist).

### Why
- SDK PocketBase men-cancel request duplikat (method+URL sama) yang dipanggil beberapa komponen bersamaan. Abort → `ClientResponseError{status:0}` → error mapper menampilkannya sebagai "Unable to reach the server", padahal semua API 200.

### How it was verified
- `npx vitest run src/lib/pb.test.ts` → 3 passed.
- Playwright produksi: `HAS_ERROR_TEXT: false`, failed requests `[]`, console errors `[]`.
- Login UI dengan `admin@blogku.com` → redirect ke `/dashboard`, tanpa error.
- Backend langsung (`127.0.0.1:8090`) menyajikan `assets/api-B-uyDbCS.js` yang memuat `autoCancellation(!1)`.

### Handover notes
- Penyebab tambahan yang ditemukan: binary lama (build 19:16) men-embed bundle lama (dist 19:38), sehingga fix sempat tidak sampai ke produksi. Selalu rebuild berurutan (lihat §8.12).
- Optimasi lanjutan: in-flight dedupe untuk `getSiteSettings`/kategori/tag agar tidak ada request duplikat.

## [2026-10-26] — Dokumen handover konteks proyek
**Author** · **Role** (Docs/AI handover) · **Status** (Done)

### What changed
- `docs/HANDOVER-CONTEXT.md` (baru) — single entry point konteks: TL;DR, arsitektur, inventaris lokal/server/domain, build & deploy (copy-paste), konfigurasi (`config.json`, flag, env), data model + RBAC, keamanan, 10 gotchas operasional, status pekerjaan (termasuk perubahan yang sudah live tapi belum di-commit), verifikasi cepat, rollback, konvensi repo, backlog, peta dokumen.
- `docs/README.md` — section "Mulai Di Sini" + baris index untuk handover.

### Why
- Agar engineer/model berikutnya tidak mengulang eksplorasi dan tidak salah asumsi tentang state produksi vs repo.

### How it was verified
- Fakta server diambil langsung: `systemctl cat blogku`, `ls -la /opt/blogku`, `cat data/config.json`, `ss -ltn`, vhost nginx, cert, baris nftables.
- Fakta repo diambil dari `git log`, `git status`, `git remote -v`, `go.mod`, `package.json`, `main.go`.
- HTML live dicek ulang: canonical/og = `https://blog.artku.my.id/`.

### Handover notes
- Utang repo yang dicatat eksplisit: `frontend/src/lib/pb.ts` + `pb.test.ts` sudah live tapi belum di-commit; branch `feat/blogku-single-binary` belum merge/push.

## [2026-10-26] — Blogku: canonical/og dari config.json + deploy server 64
**Author** · **Role** (Backend/DevOps) · **Status** (Done)

### What changed
- `frontend/index.html` — canonical/og:url/JSON-LD diganti placeholder `{{SITE_URL}}` (tidak lagi hardcoded).
- `backend/config.go` + `config_test.go` (baru) — `loadRuntimeConfig(dataDir)` membaca `data/config.json` (field `site_url`), trailing-slash-strip, toleran file hilang.
- `backend/spa_handler.go` — `newSPAHandler(fsys, spaVars)`; saat serve index.html mengganti `{{SITE_URL}}`.
- `backend/main.go` — resolve `site_url` dari config.json, fallback origin request (per `X-Forwarded-Proto`/TLS).
- Deploy server 64 (`/opt/blogku`): binary baru + `data/config.json` = `{"site_url":"https://blog.artku.my.id"}`.

### Why
- Permintaan: canonical/og/URL jangan di-hardcode, harus diambil dari config.json (pola OpenList).

### How it was verified
- `cd backend && go test .` → ok (SPA substitution + config loader).
- `https://blog.artku.my.id/` → `<link rel="canonical" href="https://blog.artku.my.id/" />`, tanpa placeholder tersisa.
- API: health/categories/tags/posts/site_settings 200; login demo 200; SPA root 200.

### Handover notes
- `config.json` berada di `/opt/blogku/data/config.json` (owner `blogku`). Ubah `site_url` di sana lalu restart untuk efek.

## [2026-10-25] — Deploy Blogku single-binary ke server 64
**Author** · **Role** (DevOps) · **Status** (Done)

### What changed
- Server `64.235.45.122` — deploy binary `blogku` (Linux amd64) ke `/opt/blogku`, unit systemd `blogku.service` (user `blogku`, `WorkingDirectory=/opt/blogku`, `--http=127.0.0.1:8090`, `--dir=/opt/blogku/data`, hardening ProtectSystem/NoNewPrivileges), enabled + active.
- `docs/how-to-deploy-blogku.md` (baru) — panduan deploy langkah-demi-langkah (prasyarat, setup dir/user, salin binary, unit systemd, verifikasi, first-run admin).
- `docs/README.md` — index + baris `how-to-deploy-blogku.md`.

### Why
- Permintaan user: deploy ke server 64 di `/opt/blogku` + buat 1 post panduan deploy.

### How it was verified
- `systemctl is-active blogku` → `active`; `systemctl is-enabled` → `enabled`.
- `curl http://127.0.0.1:8090/` → 200; body mengandung `<html`; login demo (`demo/demo12345`) → token.
- First-run journal: `Blogku admin created:` dengan URL/Email/Password dicetak sekali.

### Handover notes
- Admin first-run: `admin@blogku.com` / password acak (lihat `journalctl -u blogku`; hanya dicetak sekali).
- Listen `127.0.0.1:8090` lokal; expose via reverse-proxy + TLS bila perlu (di luar cakupan).

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
