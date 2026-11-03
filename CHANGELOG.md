# CHANGELOG

Log perubahan gaya kerja team. Entri ditambahkan (append), tidak pernah dihapus/direwrite.
Format: lihat `.agents/rules/change-log.md` dan section "LOG PERUBAHAN GAYA KERJA TEAM" di `AGENTS.md`.

---

## [2026-11-03] - Audio Player Ncmaz Parity (header + global dock)
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/lib/audio-engine.ts` — `AudioTrack` menambah `slug`, `categoryName`, `likeCount`; state menambah `buffered`, `muted`, `playbackRate`; API menambah `setVolume`, `setMuted`, `setPlaybackRate`, `skip`; volume default 0.8.
- `frontend/src/stores/player.ts` — ref/action baru (`buffered`, `volume`, `muted`, `playbackRate`, `setVolume`, `toggleMute`, `cycleRate`, `skip`); mapping track dari `Post`.
- `frontend/src/components/post/AudioPostHeader.vue` (baru) — header Ncmaz: band 240 px, vinyl 20 detik + overlay, play 80 px/equalizer, judul, divider, meta, aksi compact; tanpa excerpt.
- `frontend/src/components/player/AudioPlayer.vue` — mini-card diganti dock full-width: progress buffered, skip -10/+15, speed 1.0/1.5/2.0, volume/mute, waktu, close, like/save, mobile expand 64→128 px.
- `PlayerProgressBar.vue`, `PlayerTrackInfo.vue`, `PlayerControls.vue`, `PlayerVolume.vue`, `SkipButton.vue`, `PlayingEqualizer.vue` (baru) — subkomponen dock/header.
- `frontend/src/components/post/LikeButton.vue` — varian `compact`; tipe prop menjadi `Pick<Post, 'id' | 'likeCount'>`.
- `frontend/src/components/layout/BackToTop.vue` + `ToastHost.vue` — offset mengikuti `--player-dock-height` (ResizeObserver) agar tidak menutupi dock.
- `frontend/src/pages/PostPage.vue` — memakai `AudioPostHeader`; baris aksi lama dan kartu “Written by” disembunyikan untuk audio.
- `frontend/src/styles/main.css` — animasi `nc-animation-spin` 20 detik + reduced motion.
- Review fixes: focus ring pada slider (peer focus), touch target chevron/mute ≥40 px, `role="alert"` untuk error, left dock `xl:basis-80` agar judul tidak kolaps, dan `stop()` melepas `src` + `load()`.
- `frontend/e2e/audio-player.spec.ts` (baru) — header/dock, speed, close, BackToTop desktop/mobile, post non-audio.
- `docs/superpowers/specs/2026-11-02-audio-player-ncmaz-parity-design.md` + `docs/superpowers/plans/2026-11-02-audio-player-ncmaz-parity.md` (baru); `docs/features/22-audio-player-and-upload.md` diperbarui.

### Why
- Permintaan user: UI + fungsi player audio dibuat 1:1 seperti Ncmaz pada post type audio, menggantikan mini-card kiri-bawah. Termasuk header vinyl, dock full-width, volume, speed, skip, mobile expand, dan like/save.
- BackToTop lama (`fixed bottom-6 end-6 z-40`) akan menutupi kontrol dock; offset berbasis tinggi aktual dock diperlukan, termasuk saat mobile expanded.

### How it was verified
- `npm run typecheck` (dari `frontend/`) → `vue-tsc --noEmit` bersih.
- `npm run lint` → `eslint .` bersih.
- `npm test` → **19 file / 200 test passed**.
- `npx playwright test e2e/audio-player.spec.ts` → **3 passed** (header/dock, BackToTop gap desktop + mobile 390 collapsed/expanded, post standard tanpa dock).
- Build produksi: `VITE_USE_POCKETBASE=true VITE_PB_URL=` + `vite build` sukses; cross-compile Linux amd64 `backend/blogku` (28.180.640 byte).
- Deploy: binary baru ke `/opt/blogku/blogku` (backup `blogku.bak-ncmaz-parity-2`), `systemctl restart blogku` → `active`; `spa:200`, `health:200`.
- Smoke produksi final `https://blog.artku.my.id/post/snap-cracle` via Playwright: dock 80 px desktop, 64/128 px mobile, BackToTop gap 24 px di ketiga state, speed 1.0x→1.5x, mute `aria-pressed=true`, close menghilangkan dock, `scrollWidth <= clientWidth`, tidak ada console error.

### Handover notes
- Tidak ada perubahan schema/PocketBase; tidak perlu migrasi data.
- Build artefak (`frontend/dist`, `backend/dist`, `backend/blogku`) tidak di-commit.
- Deviasi sadar dari referensi: equalizer CSS (bukan GIF), badge kategori tetap palet project, menu “more” diganti ikon edit untuk yang berhak, mobile expanded tidak menduplikasi play/pause.
- E2E memakai seed mock `/post/the-producers-reshaping-ambient-music`; smoke produksi memakai `/post/snap-cracle`.

## [2026-11-03] - Hotfix: base URL API kosong merusak semua halaman post (produksi)
**Author**: AI Agent (opencode) · **Role**: Dev/Backend · **Status**: Done

### What changed
- `frontend/src/lib/pb.ts` — `resolveUrl()` memakai `||` menggantikan `??`: ketika `VITE_PB_URL` kosong (string kosong dari `backend/build.sh`), base URL sekarang jatuh kembali ke `window.location.origin`.
- `frontend/src/lib/pb.test.ts` — tambah test "falls back to window.location.origin when VITE_PB_URL is empty string" (RED→GREEN).
- Deploy ulang binary ke server 64 (`64.235.45.122`, service `blogku`).

### Why
- Pasca deploy audio-player, semua halaman post menampilkan "Post not found". Root cause: build.sh mengekspor `VITE_PB_URL=` (kosong); `'' ?? originUrl()` menghasilkan `''`, sehingga request API menjadi relatif (`api/...`) dan di halaman `/post/<slug>/` ter-resolve ke `/post/<slug>/api/...` → server mengembalikan HTML SPA (bukan JSON). Halaman home (`/`) kebetulan bekerja.
- Diperbaiki dengan `fromEnv || originUrl()` + test kosong.

### How it was verified
- `npm test -- src/lib/pb.test.ts` — 4/4 pass (RED awal: `baseURL ''` vs expected origin).
- `npm run typecheck` & `npm run lint` — bersih; `npm test` full — 19 file / 185 test passed.
- Verifikasi produksi via Playwright headless: API kini memanggil `https://blog.artku.my.id/api/...` (JSON), halaman post render lengkap (judul, author, konten) — bukan lagi "Post not found".

### Handover notes
- Migrasi schema collection `media` (MIME audio + 20MB) tetap menunggu dilakukan di admin, agar upload audio berfungsi di produksi.

## [2026-11-02] — Audio Post Player (SPA-global) & Audio Upload — dokumentasi & verifikasi (Task 10)
**Author**: AI Agent (opencode) · **Role**: Docs/QA · **Status**: Done

### What changed
- `docs/features/22-audio-player-and-upload.md` (baru) — dokumen fitur lengkap: status, fase arsitektur, izin RBAC, komponen utama, ringkasan/motivasi, alur pengguna (playback + author), arsitektur engine→store→komponen→halaman, kontrak data (AudioTrack, player store state, media-limits, sanitizeUrl allowData, backend media FileField), keamanan/otorisasi (RBAC + sanitasi, tanpa `eval`), dan pengujian (unit + manual checklist).
- `docs/README.md` — tambah baris indeks **22** Audio Post Player & Upload.
- `CHANGELOG.md` — entri ini.
- `docs/superpowers/specs/2026-11-02-audio-player-feature-design.md` & `docs/superpowers/plans/2026-11-02-audio-player-feature.md` — di-`git add` agar branch membawa dokumen desainnya sendiri.

### Why
- Task 10 dari plan audio-player-feature: verifikasi penuh seluruh gate + dokumentasi fitur mengikuti template `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`, update indeks, entri CHANGELOG format team-work.
- Nomor file fitur memakai **22**, bukan 14 dari brief, karena `docs/features/14-post-view-counter.md` sudah menempati nomor 14 (collision) — 22 adalah nomor bebas berikutnya.

### How it was verified
- `npm run typecheck` (from `frontend/`) → `vue-tsc --noEmit` lulus tanpa error.
- `npm run lint` (from `frontend/`) → `eslint .` bersih.
- `npm test` (from `frontend/`) → **19 file / 183 test passed**.
- `go test ./...` (from `backend/`) → `ok ncmaz.backend`.
- `git status --porcelain` setelah commit → bersih (hanya commit ini).

### Handover notes
- **PENTING (migrasi manual PocketBase):** instalasi PocketBase yang **sudah ada** harus meng-update skema koleksi `media` **secara manual di admin** (tambah MIME audio `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/ogg`, `audio/webm` dan naikkan MaxSize ke 20MB pada field `file`). `ensureMediaCollection` hanya menambahkan field saat koleksi `media` **belum ada** — jadi deployment existing tidak otomatis menerima update ini.
- Fitur terimplementasi penuh dari Task 1–9 (engine, store, AudioPlayer global, header PostPage, PodcastSection/PostCard wiring, upload editor, mock & pocketbase source, backend Go, sanitasi `allowData`); commit Task 10 ini hanya dokumen + verifikasi, tanpa perubahan kode produk.
- Non-goals yang disengaja: playlist/antrean, shuffle/repeat, persistensi posisi putar lintas sesi, auto-play, kontrol volume mini-player.

**Author**: AI Agent (opencode) · **Role**: Docs/QA · **Status**: Done

### What changed
- Menambahkan `docs/superpowers/plans/2026-11-01-mobile-compact-layout.md` dan `docs/superpowers/specs/2026-11-01-mobile-compact-layout-design.md`.
- Menambahkan `pw-check.cjs` (skrip Playwright untuk cek homepage produksi).
- Tidak ada perubahan kode produk; hanya artefak dokumentasi & tooling yang sebelumnya untracked.

### Why
- Permintaan pengguna: commit semua agar working tree bersih.

### How it was verified
- `git status --porcelain --untracked-files=all` setelah commit → bersih (file yang di-ignore seperti `opencode.jsonc`, `.codegraph/`, `.opencode/`, `.superpowers/` tidak ditampilkan).
- Tidak ada secret/kredensial di file yang ditambahkan (dicek dengan pola password/token/secret/api key).

### Handover notes
- `pw-check.cjs` memakai Chrome lokal (`playwright` + executable Chrome) dan menargetkan `https://blog.artku.my.id/`.

## [2026-11-02] — Deploy: site-name titles + SPA CSP (with pending UI fixes)
**Author**: AI Agent (opencode) · **Role**: DevOps · **Status**: Done

### What changed
- Rebuild single-binary Linux amd64 dari working tree yang mencakup: title branding dari `site_settings.siteName`, CSP untuk SPA HTML, Zod `jitless`, serta perubahan UI yang sebelumnya sudah di-deploy (footer/newsletter responsive, header kategori, kontrol & style tabel).
- Deploy ke server 64: upload `/tmp/blogku-upload`, backup `blogku.prev-<timestamp>`, swap, restart.

### Why
- Menjalankan permintaan pengguna untuk deploy + commit perbaikan hasil smoke test.

### How it was verified
- Quality gate: `npm run typecheck`, `npm run lint`, `npm run test` (17 file / 155 test), `npm run build`, `go test ./...` → lulus.
- Binary: 28.143.776 bytes, SHA256 `93189687f3c712fc37617453b98f42d7996f5ec5d87f3912f1a375711e3771b2`.
- Server: `systemctl is-active blogku` → `active`; SHA256 binary server sama dengan build lokal.
- Smoke produksi (Chrome headless): 33/33 check fungsional lulus, 0 request gagal, 0 console error, 0 API ≥400.
- Verifikasi CSP/branding: header CSP ada, tidak mengandung `'unsafe-eval'`, mengandung `'wasm-unsafe-eval'`; title `Home — Blogku` dan `Sign in — Blogku`; JSON-LD `NewsMediaOrganization` valid; Google Font Poppins termuat; editor + menu tabel berfungsi; **0 CSP violation**.

### Handover notes
- Rollback: kembalikan `/opt/blogku/blogku.prev-<timestamp>` lalu restart service.
- CSP ketat: jika ke depan menambah script/style/iframe dari domain baru, update `contentSecurityPolicy` di `backend/spa_handler.go`.

## [2026-11-02] — Fix: title branding from site settings + CSP header for SPA
**Author**: AI Agent (opencode) · **Role**: Dev/Security · **Status**: Done

### What changed
- `frontend/src/composables/useSiteName.ts` (baru): memuat `site_settings.siteName` sekali (fallback `Blogku`) dan membagikannya ke seluruh app.
- `frontend/src/composables/useDocumentTitle.ts`: title memakai `siteName` dari settings, bukan hardcode `Ncmaz`.
- `frontend/src/router/index.ts`: fallback title route memakai `siteName`; memicu pemuatan settings setelah navigasi.
- `frontend/src/components/layout/AuthShell.vue`: teks "Ncmaz" → "Blogku".
- `frontend/src/lib/validation.ts`: `z.config({ jitless: true })` agar Zod tidak memicu `securitypolicyviolation` `script-src eval` di bawah CSP ketat.
- `backend/spa_handler.go`: header `Content-Security-Policy` hanya untuk respons SPA HTML (bukan API/static/PocketBase admin).
- `backend/spa_handler_test.go`: test header CSP pada `/` dan history-route fallback.

### Why
- Smoke test produksi menemukan title `Home — Ncmaz` (branding salah) dan CSP belum ada.

### How it was verified
- `npm run typecheck`, `npm run lint`, `npm run test` → 17 file / 155 test lulus.
- `npm run build` → sukses.
- `backend: go test ./...` → `ok ncmaz.backend`.
- Local production-mode smoke (binary + Chrome headless): header CSP ada, title `Home — Blogku`, `/login` & `/search` memakai suffix `Blogku`, editor ProseMirror tampil, **0 CSP violation**, 0 console error.
- CSP yang dipakai: `script-src 'self' 'wasm-unsafe-eval'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, font Google, img `https:`, frame YouTube/Vimeo, `object-src 'none'`, `frame-ancestors 'self'`.

### Handover notes
- Perubahan belum di-deploy; produksi masih memakai binary/asset sebelumnya.
- Saat deploy, verifikasi ulang: structured data JSON-LD tetap terbaca, upload gambar (WASM) tetap jalan, Google Fonts termuat.

## [2026-11-02] — Deploy: footer/newsletter, category header, table controls & styles
**Author**: AI Agent (opencode) · **Role**: DevOps · **Status**: Done

### What changed
- Rebuild single-binary Linux amd64 dari working tree yang berisi perubahan frontend yang belum terdeploy:
  - kontrol Style/Rows/Columns popup tabel selalu tampil + disabled state & hint,
  - fix selector style header tabel (`th` di `tbody`),
  - form subscribe footer responsive + hapus list tag footer,
  - header CategoryPage center seperti TagPage,
  - `vite.config.ts` allowedHosts trycloudflare (dev-only) dan `playwright-core` devDependency.
- Deploy ke server 64: upload `/tmp/blogku-upload`, backup `blogku.prev-<timestamp>`, swap, restart.

### Why
- Permintaan pengguna untuk menjalankan rebuild + deploy perubahan yang belum live.

### How it was verified
- Quality gate: `npm run typecheck`, `npm run lint`, `npm run test` (17 file / 155 test), `npm run build` → lulus.
- Binary baru: 28.143.776 bytes, SHA256 `8eb329c1461403c956e324f19ca5234d777dcca168819c55083319a2e99dc3a3`.
- Server: `systemctl is-active blogku` → `active`; SHA256 binary server sama dengan build lokal.
- Produksi: `spa:200`, `health:200`, `EditorPage-D40eLN4A.js:200`, `EditorPage-CfAM5Om3.css:200`, canonical benar.

### Handover notes
- Perubahan frontend tersebut masih **belum di-commit** (working tree).
- Rollback: kembalikan `/opt/blogku/blogku.prev-<timestamp>` lalu restart service.

## [2026-11-02] — Deploy: table popover mobile, 3 table styles, status spec
**Author**: AI Agent (opencode) · **Role**: DevOps/Docs · **Status**: Done

### What changed
- Rebuild single-binary Linux amd64 dari working tree yang berisi: popover tabel terpusat di mobile, 3 style tabel (Classic/Striped/Minimal), dan spec status post (spec saja, belum diimplementasi).
- Upload binary ke `/tmp/blogku-upload`, backup `/opt/blogku/blogku.prev-<timestamp>`, swap, lalu restart `blogku.service`.

### Why
- Menjalankan permintaan pengguna untuk deploy perubahan terakhir sekaligus meng-commit-nya.

### How it was verified
- Frontend build: `VITE_USE_POCKETBASE=true VITE_PB_URL="" npm run build` → sukses.
- Binary: `GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o blogku .` → `backend/blogku` 28.143.776 bytes.
- Server: `systemctl is-active blogku` → `active`; binary baru terpasang di `/opt/blogku/blogku`.
- Produksi: `https://blog.artku.my.id/` → `spa:200`; `/api/health` → `health:200`; chunk editor baru `EditorPage-DnOU73Gg.js` → `200`; canonical tetap `https://blog.artku.my.id/`.
- Quality gate kode (sebelum deploy): `npm run typecheck`, `npm run lint`, `npm run test` (155/155), `npm run build`, `go test ./...` → lulus.

### Handover notes
- Status Draft/Private **belum diimplementasi**; hanya spec di `docs/features/21-post-status-draft-private.md` yang menunggu approval.
- Rollback: kembalikan `/opt/blogku/blogku.prev-<timestamp>` lalu `systemctl restart blogku`.

## [2026-11-02] — Spec: Post status Publish / Draft / Private
**Author**: AI Agent (opencode) · **Role**: Docs/Dev · **Status**: In Review

### What changed
- Menambahkan `docs/features/21-post-status-draft-private.md`: spec lengkap untuk status post `published`/`draft`/`private` (motivasi, definisi, audit kode saat ini, tujuan/non-goal/anti-goal, opsi pendekatan, kontrak data, matriks RBAC, rules PocketBase, UI/UX, edge case, testing, rollout, dan keputusan yang butuh approval).
- Menambahkan baris 21 pada indeks `docs/README.md` dengan status `Spec (review)`.

### Why
- Permintaan pengguna: tambahkan pilihan Draft & Private di editor. Perubahan menyentuh core (schema PocketBase, RBAC, `DataSource`, dashboard), sehingga spec perlu disetujui sebelum implementasi.

### How it was verified
- Belum ada perubahan kode; verifikasi yang dilakukan adalah audit kode pada `frontend/src/api/types.ts`, `frontend/src/api/pocketbase.source.ts`, `frontend/src/pages/EditorPage.vue`, `frontend/src/pages/DashboardPage.vue`, dan `backend/main.go` untuk memastikan isi spec sesuai kondisi nyata.
- Dokumen menunggu review/approval pada tabel keputusan §13.

### Handover notes
- Implementasi belum dimulai. Jangan merge/deploy apa pun dari spec ini sampai keputusan §13 disetujui.
- Dua keputusan paling berdampak: (4) `postCount` hanya published, dan (7) draft/private tetap wajib validasi lengkap.

## [2026-11-02] — Three selectable table styles (Classic / Striped / Minimal)
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/components/editor/RichTextEditor.vue` — `StyledTable` (turunan `Table`) menambahkan atribut `tableStyle` dengan default `classic`; `parseHTML` membaca class `table-style-*` dan `renderHTML` menulisnya kembali ke `<table>`.
- `frontend/src/components/editor/EditorToolbar.vue` — section **Style** di menu tabel (saat kursor di dalam tabel) dengan tombol Classic / Striped / Minimal dan state aktif; `setTableStyle()` memanggil `updateAttributes('table', { tableStyle })`.
- `frontend/src/styles/main.css` — 3 varian visual: `table-style-classic` (grid netral + zebra), `table-style-striped` (header primary + zebra aksen + border primary), `table-style-minimal` (garis horizontal saja, header transparan kapital).
- `docs/features/20-editor-table-controls-and-rendering.md` — dokumentasi gaya tabel & alur pemilihan.

### Why
- Permintaan pengguna: penulis perlu memilih model/style tabel, bukan hanya satu tampilan default.

### How it was verified
- `npm run typecheck` → lulus.
- `npm run lint` → bersih.
- `npm run test` → 17 file, 155/155 passed.
- `npm run build` → vite build sukses.

### Handover notes
- Style disimpan sebagai class pada `<table>`; `class` sudah lolos sanitizer frontend (DOMPurify) dan backend (bluemonday), jadi bertahan saat publish.
- Tabel lama tanpa class otomatis tampil sebagai Classic.
- Perubahan belum di-deploy; binary produksi masih versi sebelumnya.

## [2026-11-02] — Table picker popover centered on mobile
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/components/editor/EditorToolbar.vue` — popover tabel di layar <640px kini dirender lewat `<Teleport to="body">` sebagai modal overlay `fixed inset-0` dengan panel `max-w-sm` di tengah viewport, backdrop gelap, dan scroll internal (`max-h-[calc(100dvh-2rem)]`). Di desktop tetap dropdown `absolute end-0` di bawah tombol.
- `onClickOutside` memakai opsi `ignore` untuk panel yang di-teleport agar klik di dalam popover tidak menutupnya.
- Grid ukuran tabel dibuat `mx-auto w-fit` agar tetap rapi di panel mobile.

### Why
- Popover sebelumnya ter-anchor ke tombol tabel dan terpotong/keluar layar di device mobile (lihat screenshot produksi).

### How it was verified
- `npm run typecheck` → lulus.
- `npm run lint` → bersih.
- `npm run test` → 17 file, 155/155 passed.
- `npm run build` → vite build sukses.

### Handover notes
- Perubahan belum di-deploy; binary produksi masih versi sebelumnya sampai rebuild + deploy dijalankan.

## [2026-11-02] — Editor table row/column controls & consistent table rendering
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/lib/sanitize.ts` — menambahkan tag tabel (`table`, `caption`, `colgroup`, `col`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`) dan atribut `style`, `colspan`, `rowspan`, `colwidth`, `scope`, `align` ke allowlist. Menambahkan `filterStyleAttribute()` yang hanya meloloskan `text-align`, `vertical-align`, `width`, `min-width`, `max-width` dengan nilai regex-safe; `style` dihapus dari `FORBID_ATTR`.
- `frontend/src/components/editor/EditorToolbar.vue` — tombol Table kini membuka popover grid 8×8 untuk memilih jumlah baris/kolom, plus menu operasi tabel (tambah/hapus baris & kolom, toggle header, hapus tabel) saat kursor di dalam tabel.
- `frontend/src/components/editor/RichTextEditor.vue` — `table-layout: fixed` untuk kolom resizable, style `.tableWrapper` (scroll horizontal), `.selectedCell`, dan `.column-resize-handle`.
- `frontend/src/styles/main.css` — aturan `.prose-ncmaz` untuk tabel (border, padding, header, zebra row, dark mode, scroll horizontal).
- `frontend/src/pages/PostPage.vue` — artikel terbit memakai `prose-ncmaz` agar tabel dan tipografi sama dengan preview editor.
- `frontend/src/lib/sanitize.test.ts` — 2 test baru: struktur/atribut tabel dipertahankan, dan CSS berbahaya dibuang.
- `backend/main.go` — `sanitizer` sekarang dibangun via `newSanitizer()`: `UGCPolicy()` + allowlist style sempit (`text-align`, `vertical-align`, `width`, `min-width`, `max-width`) untuk elemen tabel, sehingga lebar kolom & perataan tidak hilang saat disimpan.
- `backend/sanitize_test.go` — 2 test baru untuk preservasi tabel dan penolakan CSS berbahaya.
- `docs/features/20-editor-table-controls-and-rendering.md` + indeks `docs/README.md`.

### Why
- Pengguna tidak bisa menentukan jumlah baris/kolom tabel di editor (selalu 3×3).
- `sanitizeHtml()` membuang seluruh tag tabel sehingga preview dan artikel terbit berantakan.

### How it was verified
- `npm run typecheck` → lulus tanpa error.
- `npm run lint` → bersih.
- `npm run test` → 17 file, 155/155 test passed.
- `npm run build` → vite build sukses (dist terbentuk).
- `backend: go test ./...` → `ok ncmaz.backend`.
- Build single-binary Linux amd64 (`VITE_USE_POCKETBASE=true`, `VITE_PB_URL=""`, `GOOS=linux`) → `backend/blogku` 28.135.584 bytes.
- Deploy ke server 64 (`64.235.45.122:2232`): binary di-upload ke `/tmp/blogku-upload`, backup `/opt/blogku/blogku.prev-<timestamp>`, swap, restart → `systemctl is-active blogku` = `active`.
- Verifikasi produksi: `https://blog.artku.my.id/` → `spa:200`; `/api/health` → `health:200`; canonical & `og:url` = `https://blog.artku.my.id/`.

### Handover notes
- Ukuran grid maksimum 8×8; ubah `TABLE_MAX` di `EditorToolbar.vue` bila perlu lebih besar.
- Sanitizer sekarang mengizinkan `style` dengan allowlist ketat; jangan menambah properti CSS baru tanpa regex validasi.
- Verifikasi visual manual (light/dark, mobile scroll) tetap disarankan.

## [2026-11-01] — Mobile compact layout (spacing & dedup)
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- Task 1: sweep mekanis kelas Tailwind pada 57 file `frontend/src/**/*.vue` — padding/margin/gap/radius diturunkan di mobile (<640px), nilai desktop asli dipertahankan via `sm:` (base=mobile, `sm:`=desktop). Aturan: spacing 4-10 turun 1 langkah; rounded-3xl/2xl/xl/[2rem]/[1.5rem] → rounded-xl/lg; `rounded-full` & spacing <4 & token negatif tidak disentuh; aturan same-string `sm:` mencegah duplikasi `sm:`.
- Task 2: PostPage — counter komentar (MessageCircle + formatNumber(post.commentCount)) ditambahkan di action row sebelum tombol Share (semua layar, scroll ke #comments); blok duplikat disembunyikan di mobile (sidebar magazine `hidden lg:block`; kartu "Written by" `hidden sm:flex`); `id="comments"` di CommentList.
- Task 3: dedup halaman lain — ProfilePage (badge role hidden di mobile), DashboardPage (count duplikat di tab/widget hidden di mobile).
- Task 4: dokumentasi `docs/features/19-mobile-compact-layout.md` + indeks `docs/README.md`.

### Why
- Permintaan pengguna: layout mobile lebih compact & hemat space; aturan "1 info tidak boleh tampil 2x" di mobile.

### How it was verified
- `npm run typecheck` → lulus.
- `npm run lint` → bersih.
- `npm run test` → 150/150 passed.
- `npm run build` → sukses.

### Handover notes
- Desktop (`sm:`+) tidak berubah; verifikasi visual manual 375px vs ≥640px masih direkomendasikan.
- WIP user (`CHANGELOG.md`, PostImage/EditorPage/ProfilePage, mock.source) tidak disentuh/ikut ter-commit; seluruh perubahan ada di working tree (belum di-commit).
- CHANGELOG.md berisi WIP user sebelumnya — jangan di-commit bersama (hanya append).

## [2026-11-01] — Mobile compact layout Task 3: dedup survey halaman lain
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/pages/ProfilePage.vue` — badge role pada header profil disembunyikan di mobile (`hidden sm:inline-flex`, baris 279); role tetap tampil sekali lewat kartu "Your Role" di bawahnya.
- `frontend/src/pages/DashboardPage.vue` — angka duplikat disembunyikan di mobile saja:
  - count tab "Published (N)" → "Published" (baris 205),
  - count tab "Drafts (N)" → "Drafts" (baris 219),
  - count widget samping "Local drafts" (baris 273);
  ketiga angka masih tampil sekali di kartu statistik atas (Published posts / Drafts / Local drafts).

### Why
- Task 3 SDD `2026-11-01-mobile-compact-layout`: survey & perbaiki info duplikat literal di mobile di semua halaman selain PostPage. Hasil survey: hanya ProfilePage dan DashboardPage punya duplikat valid; halaman lain dibiarkan tidak berubah.

### How it was verified
- `npm run typecheck` → lulus.
- `npm run lint` → bersih tanpa error.
- `npm run test` → 150/150 passed.
- `npm run build` → vite build sukses.

### Handover notes
- Tidak ada perubahan tata letak desktop (`sm:`+); hanya blok sekunder yang disembunyikan di mobile.
- AdminDashboardPage menampilkan KPI ganda (metric cards vs content board vs editorial reach) — dinilai desain dashboard multi-view yang disengaja, dicatat sebagai concern di laporan task-3, tidak diubah.
- Task 1 & 2 belum memiliki entri CHANGELOG sendiri (entri gabungan sesuai plan bisa dibuat saat semua task tuntas diverifikasi).

## [2026-10-31] — Hapus clone global `~/.superpowers`
**Author**: AI Agent (opencode) · **Role**: DevOps · **Status**: Done

### What changed
- Menghapus direktori global `~/.superpowers` (clone lama milik plugin lokal yang sudah dihapus). Di luar repo, tidak memengaruhi git.

### Why
- Tidak ada lagi yang merujuk direktori tersebut; plugin resmi memakai paket ter-cache di `~/.cache/opencode/packages/`.

### How it was verified
- `Test-Path ~/.superpowers` → `False`.
- `opencode debug skill` (workdir repo) → 32 skill unik; `using-superpowers` masih terdaftar.

### Handover notes
- Tidak ada aksi lanjutan; skill Superpowers berasal dari plugin resmi (git spec di `opencode.jsonc`).

## [2026-10-31] — Remove legacy local Superpowers plugin
**Author**: AI Agent (opencode) · **Role**: DevOps · **Status**: Done

### What changed
- Menghapus `.opencode/plugins/superpower/` (plugin lokal lama, tidak ter-track git karena `.opencode/` di-ignore).
- `opencode.jsonc` — array `plugin` kini hanya berisi `superpowers@git+https://github.com/obra/superpowers.git`.

### Why
- Plugin lokal lama tidak mendaftarkan skill apa pun di OpenCode 1.18.21 (ditulis untuk harness lain) dan hanya menyisakan kebingungan; plugin resmi sudah mencakup fungsinya.

### How it was verified
- `opencode debug config` (workdir repo) → `plugin` hanya satu entri resmi, ter-resolve.
- `opencode debug skill` (workdir repo) → 32 skill unik, 0 duplikasi; skill Superpowers tetap terdaftar.
- `Test-Path .opencode/plugins/superpower` → `False`.

### Handover notes
- Clone lama di `~/.superpowers` (global, di luar repo) tidak dihapus — aman dibiarkan; hapus manual jika tidak dipakai tooling lain.
- Restart OpenCode agar sesi baru memuat konfigurasi plugin terbaru.

## [2026-10-31] — Install Superpowers plugin (project-scoped)
**Author**: AI Agent (opencode) · **Role**: DevOps · **Status**: Done

### What changed
- `opencode.jsonc` — menambahkan `superpowers@git+https://github.com/obra/superpowers.git` ke array `plugin`, di samping plugin lokal lama `.opencode/plugins/superpower/index.ts`.
- Tidak ada perubahan kode aplikasi (`frontend/`, `backend/`).

### Why
- Agar skills Superpowers resmi (brainstorming, writing-plans, TDD, systematic-debugging, verification-before-completion, dll.) otomatis tersedia setiap repo ini dibuka di OpenCode, tanpa bergantung pada konfigurasi global mesin.

### How it was verified
- `opencode debug config` (workdir repo) → `plugin` berisi dua entri: spec git Superpowers + plugin lokal; keduanya ter-resolve.
- `opencode debug skill` (workdir repo) → 32 skill unik, 0 duplikasi; skill Superpowers ikut terdaftar.

### Handover notes
- Plugin lokal lama `.opencode/plugins/superpower/index.ts` (clone `~/.superpowers`, register nama `superpowers/<skill>`) tidak terlihat mendaftarkan skill apa pun di OpenCode 1.18.21 — kemungkinan ditulis untuk harness lain. Belum dihapus; perlu keputusan tim apakah dibuang agar tidak membingungkan.
- Restart OpenCode setelah perubahan config agar sesi baru memuat plugin.

## [2026-10-31] — Media orphan detection & cleanup (refCount)
**Author**: AI Agent (opencode) · **Role**: Backend/Dev/QA · **Status**: Done

### What changed
- `backend/media.go` (baru) - scanner media yatim + pemeliharaan `refCount`:
  - Field `media.refCount` (NumberField, min 0) ditambahkan idempotent via
    `ensureMediaRefCountField` di bootstrap.
  - `collectReferencedMediaIDs` memindai semua field URL/HTML/JSON konten:
    `posts.cover/gallery/content/content_blocks`, `users.avatar/coverBanner`,
    `pages.body`, `categories.image`, `site_settings.logo/logoDark/favicon`; regex
    mengenali `/api/files/media/<id>/<file>` termasuk fragment varian (`#imgv1`).
  - `findOrphanMedia` mengembalikan media yang tidak direferensikan (termasuk
    varian thumb/medium yatim), diurutkan terbaru.
  - Hook `registerMediaHooks` (create/update/delete) pada
    posts/users/pages/site_settings/categories memelihara `refCount`; delta
    dihitung dari snapshot pre-update (OnModelValidate) vs post-save, clamp ≥ 0.
  - Route admin-only `POST /admin/orphan-media/scan` & `/cleanup` dengan
    `requireAdminAPI` (token superuser atau users role=admin).
- `backend/main.go` - wire `ensureMediaRefCountField`, `registerMediaHooks`,
  `registerMediaRoutes`; perbaikan bug laten: `idx_users_username` tidak lagi
  ditambahkan jika koleksi users sudah punya index kolom username (mencegah
  gagal fresh-install "index definition already exists").
- `backend/media_test.go` (baru) - 11 test: helper murni, scan/cleanup
  integrasi (bootstrap + record), sinkronisasi refCount hooks, clamp nol.
- `frontend/src/api/types.ts` - `MediaItem.refCount?`, `OrphanMediaItem`,
  `OrphanScanResult`, `OrphanCleanupResult`.
- `frontend/src/api/source.ts` - kontrak baru `listOrphanMedia()` &
  `cleanupOrphanMedia()`.
- `frontend/src/api/pocketbase.source.ts` - implementasi prod via fetch ke
  endpoint admin (Authorization Bearer dari `pb.authStore.token`, base URL dari
  `pb.baseURL`).
- `frontend/src/api/mock.source.ts` - implementasi mock: scan lokal dari
  posts/users/pages/settings/categories + cleanup persisten (localStorage).
- `frontend/src/lib/media.ts` - helper `mediaRefKey` (normalisasi URL untuk
  pembanding).
- `frontend/src/pages/admin/AdminMediaLibraryPage.vue` - kartu "Media tidak
  terpakai": tombol Periksa, hasil scan (jumlah + sampel nama), Hapus semua
  dengan konfirmasi, status kosong hijau; dark mode + aria.
- `frontend/src/api/mock.source.test.ts` - 4 test baru (0 orphan seed, deteksi
  & cleanup upload tak terpakai, gambar dalam HTML dipakai, post dihapus →
  orphan).
- `frontend/src/api/pocketbase.source.test.ts` - 3 test baru (scan mapping,
  cleanup, error 403).
- `docs/features/18-media-orphan-cleanup.md` (baru) + indeks `docs/README.md`.

### Why
- Media tidak memiliki relasi formal ke konten (URL di dalam field teks/JSON);
  tanpa pembersihan, gambar yang tidak terpakai menumpuk dan membengkakkan
  storage. Permintaan pengguna: implementasi opsi 1 (backend scanner) + 3
  (preventif `refCount`).

### How it was verified
- `cd backend && go vet ./... && go test ./...` → lulus (12 test, termasuk
  6 integrasi dengan bootstrap).
- `cd frontend && npm run typecheck` → lulus (vue-tsc --noEmit).
- `npm run lint` → bersih (eslint .).
- `npm run test` → 15 files / 143 tests passed (sebelumnya 134).
- `npm run build` → sukses (vite build + vue-tsc).

### Handover notes
- Belum di-deploy; deploy berikutnya wajib menyertakan binary backend baru
  (endpoint `/admin/orphan-media/*` hanya ada setelah bump) dan frontend baru.
- `refCount` mulai terisi untuk perubahan konten setelah versi ini; data lama
  tetap aman karena scanner melakukan scan otoritatif penuh (tidak bergantung
  pada refCount).
- Jika `media.refCount` belum ada di koleksi lama, bootstrap akan menambahkannya
  otomatis (migrasi aditif).
- Keputusan: draft post ikut dipindai, jadi gambar yang hanya dipakai draft
  tidak dihapus.

## [2026-10-31] — Deploy media orphan cleanup (v0.0.3-alpha+1) ke server 64
**Author**: AI Agent (opencode) · **Role**: DevOps/QA · **Status**: Done

### What changed
- Build release same-origin: `frontend` (`VITE_USE_POCKETBASE=true`,
  `VITE_PB_URL=''`) → salin ke `backend/dist/` → cross-compile Linux amd64
  (`blogku`, 27,926,688 byte, `CGO_ENABLED=0`, `-s -w`).
- Deploy ke server **64.235.45.122** (`/opt/blogku/blogku`), backup
  `/opt/blogku/blogku.prev-20261031-211441`, restart `blogku.service` (mulai
  21:14:41 WIB).
- Catatan proses: script deploy pertama gagal akibat CRLF Windows (`systemctl
  stop blogku` + `\r` → "Invalid unit name"); diperbaiki dengan menulis script
  LF murni (`[IO.File]::WriteAllText` + join `\n`).

### Why
- Menyertakan fitur baru Media Orphan Detection & Cleanup (refCount) —
  endpoint admin `/admin/orphan-media/{scan,cleanup}` dan migrasi field
  `media.refCount` — agar produksi ikut menerima perbaikan.

### How it was verified (smoke test di server, `sh /tmp/smoke.sh`)
- `systemctl is-active blogku` → `active`.
- SPA `http://127.0.0.1:8090/` → 200; `/api/health` → 200.
- Bundle frontend baru ter-embed: `assets/index-BoYr7tLe.js`.
- `POST /admin/orphan-media/scan` tanpa auth → **401**; dengan token users
  role `penulis` → **403** (endpoint hidup, RBAC admin terkunci).
- Login demo → 200, `token` ada (panjang 224).
- `GET /api/collections/media/records?perPage=1` → `"refCount":0` ada
  (migrasi field berjalan di data produksi); `totalItems` = 20 (data lama
  utuh).
- Domain publik `https://blog.artku.my.id/` → 200; canonical tetap
  `https://blog.artku.my.id/`.

### Handover notes
- Admin produksi: gunakan kredensial superuser yang tersimpan (bukan default)
  untuk uji end-to-end cleanup via UI `/admin/media-library`.
- Backup binary sebelumnya tersimpan di `/opt/blogku/blogku.prev-20261031-211441`;
  rollback: stop service, salin balik, start.
- Tidak ada perubahan pada Cloudflare Pages (frontend kini dilayani embedded
  dari binary server 64).

## [2026-10-31] — Hotfix: deteksi referensi URL media (collection id) + recovery data
**Author**: AI Agent (opencode) · **Role**: Backend/DevOps/QA · **Status**: Done

### What changed
- **Insiden**: uji cleanup di produksi menghapus SEMUA 20 media (bukan hanya
  yatim). Root cause: `pb.files.getURL` menyimpan URL bentuk
  `/api/files/<collectionId>/<recordId>/<file>` (mis. `pbc_2708086759`),
  sedangkan regex scanner hanya mengenali bentuk
  `/api/files/media/<recordId>/<file>` → referensi tidak terdeteksi → semua
  media dianggap yatim → terhapus.
- Fix `backend/media.go`:
  - `mediaFileRefRe` kini menangkap ketiga segmen
    (`/api/files/<col>/<recordId>/<file>`) dan memakai segmen record id;
    berlaku untuk bentuk nama maupun id koleksi, termasuk dalam fragment
    varian `#imgv1&t=...&m=...` dan `?token=...`.
  - Tambah `orphanCleanupGuard`: cleanup ditolak (409) bila semua record media
    terflag yatim — pengaman terhadap kelas bug mis-deteksi.
- Test baru di `backend/media_test.go`:
  - `TestCollectMediaRefsFromTextCollectionID` (URL id-koleksi + fragment +
    token), `TestOrphanCleanupGuard` (tolak saat semua yatim, izinkan saat
    sebagian).
- Memulihkan 6 dari 20 media (file fisik masih tersisa di
  `/opt/blogku/data/storage/pbc_2708086759/*`) dengan meng-insert ulang row
  media (id asli, nama file asli, timestamp dari mtime file) via python3
  sqlite. 14 media lain hilang permanen — tidak ada backup data di server
  (`/opt/blogku/data/backups` kosong; hanya backup binary).
- Deploy ulang binary fix ke server 64 (backup
  `/opt/blogku/blogku.prev-20261031-*`).

### Why
- Bug deteksi URL me-referensikan seluruh library media; harus diperbaiki dan
  diberi pengaman agar tidak terulang.

### How it was verified
- `go vet ./... && go test ./...` → lulus (16 test).
- Server: `systemctl is-active blogku` → active; SPA/health 200; scan tanpa
  auth 401; dengan token penulis 403; `totalItems` media = 6; `"refCount":0`
  ada; posts = 3.
- Verifikasi referensi via SQL: `0xiaxz6h4lddubd` & `gbindsuy5dzid4h`
  REFERENCED (cover post), 4 lainnya ORPHAN (upload tak terpakai).
- Cover post hasil recovery: `https://blog.artku.my.id/api/files/pbc_2708086759/0xiaxz6h4lddubd/1788097446869_n8h95fj74z.png` → HTTP 200.

### Handover notes
- **Data loss permanen**: 14 media tidak dapat dipulihkan dari server. Jika
  ada backup di luar server (lokal/Cloudflare cache), segarkan kembali lewat
  Media Library; referensi lama di post akan tetap 404 sampai file di-upload
  ulang dengan id baru (URL lama tidak bisa dipakai ulang).
- 4 media yang dipulihkan ternyata tak terpakai (orphan asli) — aman jika
  nanti dibersihkan lewat scan yang sudah diperbaiki.
- Saran: aktifkan backup terjadwal `/opt/blogku/data` (mis. cron harian)
  sebelum fitur cleanup dipakai lebih lanjut.
- Frontend tidak berubah pada hotfix ini; UI yang sama tetap berfungsi.

## [2026-10-31] — Media Library: detail gambar + opsi hapus
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/pages/admin/AdminMediaLibraryPage.vue` - klik tile gambar
  membuka modal **Detail Gambar**: pratinjau besar, nama file, tanggal unggah,
  pemilik (`ownerId`), badge referensi (`refCount`), peringatan kuning bila
  masih dipakai, tombol Salin URL / Buka / **Hapus** (konfirmasi). Modal:
  `role="dialog"`, `aria-modal`, tutup via Escape/backdrop/tombol X.
- `frontend/src/api/source.ts` - kontrak baru `deleteMedia(id)`.
- `frontend/src/api/pocketbase.source.ts` - `deleteMedia` via
  `pb.collection('media').delete(id)` (rule PB: pemilik/admin); `listMedia`
  kini memetakan `refCount`.
- `frontend/src/api/mock.source.ts` - `deleteMedia` mock (LOGIN_REQUIRED,
  FORBIDDEN non-owner, persisten localStorage).
- Test: `mock.source.test.ts` (3: hapus milik sendiri, larang non-owner, admin
  bebas), `pocketbase.source.test.ts` (1: panggil delete id).

### Why
- Permintaan pengguna: klik gambar → detail + opsi hapus.

### How it was verified
- `npm run typecheck` → lulus; `npm run lint` → bersih.
- `npm run test` → 15 files / 147 tests passed (sebelumnya 143).
- `npm run build` → sukses.

### Handover notes
- Belum di-deploy; deploy berikutnya menyertakan frontend baru (backend tidak
  berubah untuk fitur ini).
- Hapus media dengan referensi aktif diperbolehkan dengan peringatan (keputusan
  admin); varian yang tertinggal bisa dibersihkan lewat fitur orphan (18).

## [2026-10-31] — Avatar inisial (tanpa preset) + placeholder "No image" di listing
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/pages/ProfilePage.vue` - hapus seluruh preset avatar image
  (`avatarOptions`); default avatar kosong → inisial nama otomatis (max 2
  huruf, mis. "Eko Siswanto" → "ES"). Tombol **Pakai inisial** untuk
  mengosongkan foto; input URL eksternal tetap ada.
- `frontend/src/components/ui/PostImage.vue` - saat `src` kosong render
  placeholder default thumbnail: ikon + teks **"No image"** (gradien netral,
  dark mode aman). Semua listing (PostCard vertical/horizontal/overlay, Hero,
  Video/Podcast/Categories section, CategoryPage, Editor preview) otomatis
  memakainya karena lewat komponen ini.
- `frontend/src/pages/EditorPage.vue` - hapus default cover sample
  (`sampleCovers`, tombol "Random sample"); draft tanpa cover di-restore
  kosong.
- `frontend/src/api/mock.source.ts` - `createPost` tidak lagi menyisipkan
  cover default (pexels); cover kosong dibiarkan kosong.
- Test: `PostImage.test.ts` (baru, mount vue-test-utils: img vs placeholder),
  `mock.source.test.ts` (post tanpa cover → `cover === ''`).

### Why
- Permintaan pengguna: ganti avatar preset dengan inisial nicename; hilangkan
  default image post, ganti thumbnail icon + state "no image" di card listing.

### How it was verified
- `npm run typecheck` → lulus; `npm run lint` → bersih.
- `npm run test` → 16 files / 150 tests passed (sebelumnya 147).
- `npm run build` → sukses.

### Handover notes
- Belum di-deploy / di-commit; backend tidak berubah (frontend-only).
- Data avatar lama (URL) tetap tersimpan & tampil; hanya preset dan default
  kosong yang berubah perilakunya.

## [2026-10-27] — Deploy v0.0.3-alpha (media) ke server 64 + Cloudflare Pages
**Author**: AI Agent (opencode) · **Role**: DevOps/QA · **Status**: Done

### What changed
- Build frontend same-origin (`VITE_USE_POCKETBASE=true`, `VITE_PB_URL=''`),
  salin ke `backend/dist/`, cross-compile Linux amd64 (`blogku`, 27.9 MB).
- Deploy binary ke server **64.235.45.122** (`/opt/blogku/blogku`), backup
  `blogku.prev-<timestamp>`, restart `blogku.service`.
- Push commit `695e142` ke `origin/feat/blogku-single-binary` dan `origin/main`.
- Cloudflare Pages project **blogku** (production branch `main`) membangun
  otomatis: deployment `961e301e-3761-45bd-bf58-9064cf7bdba8` sukses
  (queued/initialize/clone/build/deploy = success).
- Env Cloudflare Pages (sudah terpasang, diverifikasi): `VITE_PB_URL=https://blog.artku.my.id`,
  `VITE_USE_POCKETBASE=true`.

### Why
- Agar frontend Cloudflare Pages (`https://blogku-7rq.pages.dev`) memakai backend
  produksi di `https://blog.artku.my.id` (cross-origin), dan server 64 menjalankan
  binary terbaru (pipeline gambar + Media Settings/Library + migrasi field).

### How it was verified
- `systemctl is-active blogku` → `active`; binary baru 27,893,920 byte.
- `https://blog.artku.my.id/` → 200, bundle `index-DvVjIWAC.js`.
- `https://blog.artku.my.id/api/health` → 200 `{"message":"API is healthy."}`.
- `GET /api/collections/editor_settings/records` → field `imageMaxDimension`
  dan `imageQuality` ada (migrasi aditif berjalan; nilai 0 → default frontend).
- `GET /api/collections/media/records?perPage=3` → 12 item (ListRule publik).
- `POST auth-with-password` (demo) → 200 + token.
- CORS preflight dari `Origin: https://blogku-7rq.pages.dev` → 204,
  `access-control-allow-origin: *`, `access-control-allow-headers` ter-reflect.
- Cloudflare Pages production `https://blogku-7rq.pages.dev/` → 200, bundle
  `index-CwTToyAG.js`.
- Playwright di Cloudflare Pages: login `demo/demo12345` → `/dashboard`,
  `pocketbase_auth` tersimpan, 0 console error / 0 request gagal (membuktikan
  CORS cross-origin ke backend berfungsi).

### Handover notes
- Password seed admin produksi **bukan** default `admin12345` (login admin via
  API 400). Smoke halaman admin media dilakukan di lokal (MockSource); untuk uji
  produksi gunakan kredensial admin yang tersimpan.
- Binary lama tersimpan sebagai `/opt/blogku/blogku.prev-<timestamp>`; rollback:
  stop service, salin balik, start.
- Cloudflare Pages membangun hanya saat ada perubahan di `frontend/**`,
  `package.json`, `package-lock.json` (path includes). Commit docs/changelog saja
  tidak memicu build.

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

## [2026-11-01] — Deploy mobile compact layout (spacing & dedup) ke server 64
**Author**: AI Agent (opencode) · **Role**: Dev/QA/DevOps · **Status**: Done

### What changed
- Build ulang frontend produksi (VITE_USE_POCKETBASE=true, VITE_PB_URL='') + binary Go Linux amd64 (26,6 MB).
- Deploy ke server **64.235.45.122** (/opt/blogku/blogku), backup binary lama logku.prev-20261101, service systemd restart.

### Why
- Meluncurkan fitur mobile compact layout (T1-T4) ke produksi.

### How it was verified
- md5sum upload vs terpasang identik: c8c401f48cc46d5aa18e48ba6532f61d.
- systemctl is-active blogku → active.
- spa:200, health:200 (https://blog.artku.my.id).
- Aset SPA yang diserve = hash bundle baru (pi-DRzhCBiD.js, index-BG-kQl7V.js).

### Handover notes
- Binary lama tersedia: /opt/blogku/blogku.prev-20261101 (rollback: stop → mv → start).
- Data /opt/blogku/data tidak tersentuh.
- Commit d0108c + PR #1 (belum di-merge ke main).


## [2026-11-01] — Perbaiki upload avatar/cover gagal untuk foto kamera besar
**Author**: AI Agent (opencode) · **Role**: Dev/QA · **Status**: Done

### What changed
- `frontend/src/composables/useImageUpload.ts` — validasi ukuran sumber memakai batas absolut 25MB (bukan `maxImageUploadSize`); `maxImageUploadSize` sekarang diperiksa pada tiap file varian WebP hasil kompresi (dan GIF animasi passthrough) sebelum upload, dengan pesan error yang jelas.
- `frontend/src/composables/useImageUpload.test.ts` (baru) — 3 test: foto 6MB tetap diproses & diupload; GIF animasi 3MB tetap ditolak; varian hasil proses > batas ditolak sebelum upload.
- `docs/features/16-client-side-image-processing.md`, `docs/features/05-media-upload-and-storage.md` — klarifikasi semantik batas ukuran.

### Why
- Foto kamera/HP hampir selalu >2MB (mock) atau >5MB (produksi). Pipeline sebelumnya menolak file sumber lebih dulu, sehingga semua upload avatar, cover profil, dan cover post gagal dengan "File size exceeds the limit of X MB" meski hasil kompresi WebP jauh di bawah batas.

### How it was verified
- RED: `npx vitest run src/composables/useImageUpload.test.ts` gagal dengan `File size exceeds the limit of 2 MB` (reproduksi akar masalah).
- GREEN: test yang sama lulus 3/3; `npm --workspace=frontend run test` = 17 file / 153 test lulus.
- `npm --workspace=frontend run typecheck` dan `npm --workspace=frontend run lint` bersih.
- Playwright Chrome (mock dev, limit 2MB): upload JPEG 6MB sukses untuk avatar, cover profil, dan cover post (`Cover image uploaded.`), tanpa console error.
- Playwright Chrome (produksi lama): upload JPEG 21KB avatar+cover 200 OK, memastikan regresi bukan di API/PocketBase.
- Produksi setelah deploy (https://blog.artku.my.id, sesi penulis demo): 3 alur x JPEG 6MB (avatar, cover profil, cover post) = 9 POST media 200, 3 toast sukses, 0 console error.
- Hash binary terpasang = sha256 `9145822991f57fd0e3aadfa8c589eee86f9060e664945ea5b22f931ceea0fe7d`; bundle `useImageUpload-y1lqED0B.js` live dan memuat pesan validasi baru.

### Handover notes
- Sudah di-deploy ke server 64: `/opt/blogku/blogku` (backup lama `/opt/blogku/blogku.prev-20261102-131352`), service `active`, health/SPA 200.
- Uji produksi membuat 9 record media uji (owner kosong karena `uploadFile` belum mengisi owner). Record ini tidak bisa dihapus sesi penulis; bersihkan lewat scan orphan admin setelah 24 jam atau hapus sebagai admin.
- Semantik `maxImageUploadSize` berubah: dari batas file sumber menjadi batas file varian hasil kompresi (GIF passthrough tetap dihitung sebagai file final). Setting admin yang ada tidak perlu dimigrasi.
- Batas absolut sumber tetap 25MB / 10000px / 24MP; PocketBase FileField tetap `MaxSize` 5MB per file.

## [2026-11-02] - Fix: responsive subscribe form di footer, hapus list tag footer
**Author**: AI Agent (opencode) ** Role**: Dev/Frontend ** **Status**: Done

### What changed
- `frontend/src/components/widgets/NewsletterForm.vue`: varian `compact` kini menumpuk (flex-col) sampai breakpoint `xl`, baru flex-row di atasnya. Sebelumnya flex-row mulai `sm` sehingga di kolom footer yang sempit (md/xl, +/-213-274px) input + tombol meluap keluar kolom.
- `frontend/src/components/layout/AppFooter.vue`: wrapper form subscribe diubah dari `max-w-xs` (320px tetap, meluap saat kolom md hanya +/-213px) menjadi `w-full` agar menyesuaikan lebar kolom.
- `frontend/src/components/layout/AppFooter.vue`: hapus list tag (chip `#tag`) di bottom bar beserta state `tags`, pemanggilan `source.listTags()`, dan import `Tag`.

### Why
- Permintaan pengguna: perbaiki responsive form subscribe di footer dan hapus list tag di footer.

### How it was verified
- `npm run typecheck` (vue-tsc --noEmit) → sukses tanpa error.
- `npm run lint` (eslint .) → bersih tanpa error.
- `npm run test` (vitest run) → 17 files / 155 tests lulus.

### Handover notes
- Perubahan hanya menyentuh frontend; tidak ada perubahan kontrak data atau backend.

## [2026-11-02] - Dev: izinkan host trycloudflare.com di vite config
**Author**: AI Agent (opencode) ** Role**: Dev/Frontend ** **Status**: Done
### What changed
- `frontend/vite.config.ts`: tambah `server.allowedHosts: ['.trycloudflare.com']` agar tunnel Cloudflare (trycloudflare.com) tidak diblokir host check Vite (403).
### Why
- Perlu expose `npm run dev` ke publik sementara via cloudflared quick tunnel.
### How it was verified
- `https://concrete-associate-polyester-discounted.trycloudflare.com` -> HTTP 200.
### Handover notes
- Quick tunnel bersifat sementara; URL berubah tiap restart cloudflared.

## [2026-11-02] - UI: header CategoryPage jadi center identik dengan TagPage
**Author**: AI Agent (opencode) ** Role**: Dev/Frontend ** **Status**: Done
### What changed
- `frontend/src/pages/CategoryPage.vue`: hero header kini memakai layout yang sama dengan TagPage (gradient `from-primary-900/50 via-neutral-950 to-secondary-900/40`, semua teks `text-center`, deskripsi `mx-auto max-w-2xl`). Gambar kategori di hero dihapus, import `PostImage` dibersihkan.
### Why
- Permintaan pengguna: konsistensi visual antara halaman kategori dan tag.
### How it was verified
- `npm run typecheck` (vue-tsc --noEmit) → sukses tanpa error.
- `npm run lint` (eslint .) → bersih tanpa error.
### Handover notes
- Catatan: kategori tetap terlihat di deskripsi; tidak ada perubahan kontrak data.

## [2026-11-02] - Fix: kontrol Style/Rows/Columns popup tabel selalu tampil
**Author**: AI Agent (opencode) ** Role**: Dev/Frontend ** **Status**: Done
### What changed
- `frontend/src/components/editor/EditorToolbar.vue`: bagian Style/Rows/Columns di popup tabel sebelumnya memakai `v-if="editor.isActive('table')"` sehingga tidak muncul saat belum ada tabel aktif (form post baru). Sekarang selalu dirender, dengan tombol `disabled` bila belum ada tabel + hint teks, plus style `:disabled` di `.table-menu-btn`.
### Why
- Permintaan pengguna: popup setting table style/row/columns tidak tampil di form post. Root cause ditemukan via reproduksi Playwright (headless Chrome): menu hanya menampilkan grid \"Insert table\" saat tidak ada tabel aktif.
### How it was verified
- Reproduksi ulang: pada halaman editor baru, `[role=menu]` kini memuat \"Style\" (2 match label), \"Rows\", \"Columns\", 11 tombol disabled, dan hint terlihat. Setelah insert tabel & buka ulang, tombol aktif (probe sebelumnya).
- `npm run typecheck` (vue-tsc --noEmit) → sukses; `npm run lint` → bersih; `npm run test` → 17 files / 155 tests lulus.
### Handover notes
- Tidak ada perubahan backend/kontrak data. Halaman editor menggunakan mock login (demo/demo gagal validasi min 6 karakter — pakai admin/password).

## [2026-11-02] - Fix: header style tabel classic/striped/minimal kini render di semua struktur
**Author**: AI Agent (opencode) ** Role**: Dev/Frontend ** **Status**: Done
### What changed
- `frontend/src/styles/main.css`: selektor style tabel (classic/striped/minimal) yang tadinya hanya `:where(thead)` diperluas ke `:where(thead th, tbody tr:first-child th)` karena TipTap merender baris header sebagai `th` di dalam `tbody` (tanpa `thead`). Zebra/teks header tetap.
### Why
- Permintaan pengguna: pastikan style tabel responsive. Verifikasi Playwright menemukan header row tidak dapat gaya (background transparan) karena tak ada `thead`; selain itu konfirmasi : di mobile 390px tidak ada overflow halaman, tabel men-scroll horizontal di dalam container (`overflow-x:auto` + `display:block`), dan class `table-style-*` lolos sanitize.
### How it was verified
- Playwright (headless Chrome, viewport 390): `docScrollWidth` = 390 (tanpa overflow halaman); tabel preview `table-style-striped` → header bg rgb(67,56,202) (primary-600), teks putih, zebra baris ganjil/genap aktif.
- `npm run typecheck` → sukses; `npm run lint` → bersih.
### Handover notes
- Tidak ada perubahan backend. Style berlaku di editor preview & halaman post publik (sanitize mempertahankan class).

## [2026-11-03] — Post header info component (reusable across post types)
**Author** · **Role** (Dev) · **Status** (Done)
### What changed
- New `frontend/src/components/post/PostHeaderInfo.vue` (avatar, author, date · reading time, round action row: like/comments/views, divider, save, share).
- `LikeButton`/`SaveButton`: new optional `size`/`tone` props (defaults unchanged).
- `AudioPostHeader.vue` and `PostPage.vue` refactored to use it; pill action row, duplicate bottom "Written by" card, and magazine sidebar author/action card removed; Edit link moved to breadcrumb.
- Docs: `docs/features/23-post-header-info-component.md`, `docs/README.md`.
### Why
- Unify header info presentation across audio/standard/video/hero post layouts; avoid duplicated info per feature 19 rule.
### How it was verified
- `npm run typecheck && npm run lint && npm run test` all pass in `frontend/`.
- Manual smoke (dev server): all post styles, dark mode, 375px + 1440px, like/bookmark/share/comments, login redirect.
### Handover notes
- No API/backend changes; stores untouched. If a future design wants a "..." menu, add it inside `PostHeaderInfo` and re-introduce Edit there.
