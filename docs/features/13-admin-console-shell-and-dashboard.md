# 13 - Admin Console Shell & Overview Dashboard

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 2 (PocketBase-ready) |
| **Izin Minimum (RBAC)** | **Role `admin` untuk seluruh `/admin` dan `/admin/*`** |
| **Komponen Utama** | [AdminLayout.vue](../../frontend/src/layouts/AdminLayout.vue), [AdminSidebar.vue](../../frontend/src/components/admin/AdminSidebar.vue), [AdminTopbar.vue](../../frontend/src/components/admin/AdminTopbar.vue), [AdminDashboardPage.vue](../../frontend/src/pages/admin/AdminDashboardPage.vue), [admin-timeline.ts](../../frontend/src/lib/admin-timeline.ts) |
| **Tanggal Ditambahkan** | 2026-10-26 |

---

## 1. Ringkasan & Motivasi

Sebelumnya setiap halaman admin (`/admin/settings`, `/admin/users`, dan lainnya)
berdiri sendiri dengan tab horizontal `AdminNav` di dalam header/footer situs
publik. Pola itu sulit diperluas dan tidak memberi gambaran operasional konten.

Fitur ini menambahkan **shell admin** di `/admin`:

1. **Sidebar bergrup** berisi submenu yang dapat dibuka/tutup (Main, Content,
   Community, System), sehingga setiap menu berada di dalam grupnya.
2. **Topbar admin** dengan judul halaman dinamis, pencarian (membuka dialog
   pencarian yang sudah ada), pintasan moderasi, tema gelap/terang, dan profil.
3. **Overview dashboard** bergaya papan kerja: kartu metrik berwarna, content
   board (Drafts/Published/Featured/Top read), timeline publikasi 7 hari, dan
   ringkasan jangkauan editorial.
4. **Navigasi tersarang** (`/admin` → child routes) sehingga sidebar tetap
   tampil saat berpindah antar halaman admin, tanpa header/footer publik.

## 2. Arsitektur & Komponen

```
App.vue
└── /admin  →  AdminLayout.vue
    ├── AdminSidebar.vue   (grup + submenu, profil, logout)
    ├── AdminTopbar.vue    (judul, search, notifikasi, tema, avatar)
    └── <RouterView>
        ├── /admin/dashboard        → AdminDashboardPage.vue
        ├── /admin/settings         → AdminSettingsPage.vue
        ├── /admin/taxonomies       → AdminTaxonomiesPage.vue
        ├── /admin/users            → AdminUsersPage.vue
        ├── /admin/moderation       → AdminModerationPage.vue
        ├── /admin/pages            → AdminPagesPage.vue
        └── /admin/editor-settings  → AdminEditorSettingsPage.vue
```

### Aliran data dashboard

`AdminDashboardPage.vue` mengambil data **hanya melalui `DataSource`**
(`getDataSource()`), bukan langsung ke PocketBase:

```ts
const [publishedPage, draftPage, allComments, allUsers] = await Promise.all([
  getDataSource().listPosts({ page: 1, perPage: 100, sort: '-createdAt', filter: { status: 'published' } }),
  getDataSource().listPosts({ page: 1, perPage: 100, sort: '-updatedAt', filter: { status: 'draft' } }),
  getDataSource().listAllComments(),
  getDataSource().listUsers(),
])
```

Turunan data yang ditampilkan:

- **Kartu metrik**: jumlah published/draft, komentar, kontributor, total reads,
  serta avatar kontributor (maks 3 + indikator `+N`).
- **Content board**: `drafts`, `published`, `featured`, dan `top read`
  (diurutkan `viewCount` menurun).
- **Publication timeline**: `buildTimeline()` memilih 7 hari terakhir yang
  berakhir pada tanggal post terbaru (atau hari ini jika belum ada post), lalu
  memetakan post ke kolom hari dan posisi jam 08:00–20:00.
- **Editorial reach**: agregat reads, likes, komentar, dan kontributor.

### Komponen & file yang berubah

- `frontend/src/layouts/AdminLayout.vue` — shell dua kolom (sidebar + topbar +
  `RouterView`), state buka/tutup sidebar mobile.
- `frontend/src/components/admin/AdminSidebar.vue` — brand, grup collapsible,
  item aktif, `aria-current`, profil user, logout, tautan kembali ke situs.
- `frontend/src/components/admin/AdminTopbar.vue` — judul dari `route.meta.title`,
  tombol search (memanggil `ui.openSearch()`), tautan settings/moderasi,
  `ThemeToggle`, avatar profil.
- `frontend/src/pages/admin/AdminDashboardPage.vue` — overview dashboard.
- `frontend/src/lib/admin-timeline.ts` — fungsi murni `buildTimeline()` + palette
  warna event. Dipisah agar mudah diuji.
- `frontend/src/router/index.ts` — route `/admin` menjadi parent dengan child
  routes; `/admin` redirect ke `/admin/dashboard`.
- `frontend/src/App.vue` — `AppHeader`, `AppFooter`, dan `BgGlassmorphism`
  tidak dirender pada area `/admin`.
- Enam halaman admin lama — `AdminNav` dilepas; padding disesuaikan dengan shell
  baru. `components/admin/AdminNav.vue` dihapus (sudah tidak dipakai).

## 3. Kontrak Data & TypeScript Types

Tidak ada endpoint atau field backend baru. Dashboard memakai tipe yang sudah
ada (`Post`, `Comment`, `User`, `Page<T>`).

```ts
// frontend/src/lib/admin-timeline.ts
export interface TimelineDay {
  key: string          // yyyy-MM-dd
  weekday: string      // Mon, Tue, ...
  dateLabel: string    // dd.MM.yyyy
  date: Date
}

export interface TimelineEvent {
  id: string
  title: string
  slug: string
  author: User
  time: string         // HH:mm
  dayKey: string
  top: number          // persentase posisi vertikal (0–82)
  color: string        // kelas Tailwind palette
}

export interface Timeline {
  days: TimelineDay[]
  events: TimelineEvent[]
  label: string
  startHour: number
  endHour: number
}

export interface TimelineOptions {
  reference?: Date
  startHour?: number
  endHour?: number
}

export function buildTimeline(source: Post[], options?: TimelineOptions): Timeline
```

Aturan `buildTimeline`:

- Window selalu **7 hari**, berakhir pada `options.reference`; jika tidak diberi,
  memakai `createdAt` terbaru dari `source`; jika `source` kosong, memakai hari
  ini.
- Post di luar window diabaikan; post dengan tanggal invalid diabaikan.
- Jam diklem ke rentang `startHour`–`endHour` dan `top` dibatasi maksimum 82%
  agar kartu event tidak keluar dari kolom.
- Warna berputar mengikuti `TIMELINE_PALETTE` berdasarkan urutan post.

Tidak ada input form baru di dashboard, sehingga tidak memerlukan skema Zod
tambahan. Halaman admin lain tetap memakai validasi masing-masing
(`categorySchema`, `tagSchema`, dan validasi settings).

## 4. Otorisasi & Keamanan

> **ATURAN WAJIB:** `/admin` dan **seluruh** `/admin/*` hanya boleh diakses
> **role `admin`**. Jangan menambahkan child route admin dengan permission yang
> bisa diberikan ke `penulis` atau `subscriber`.

- **Guard level parent:** route `/admin` memakai meta
  `{ requiresAuth: true, adminOnly: true }`. `router.beforeEach()` memeriksa
  `adminOnly` **sebelum** permission child. Karena meta parent diwarisi oleh
  semua child, aturan ini berlaku untuk setiap halaman admin sekarang maupun
  yang ditambahkan nanti — bahkan jika child tersebut lupa memasang permission
  atau memakai permission lain.
- **Redirect non-admin:**
  - belum login → `/login?redirect=<path>`;
  - `penulis` → `/dashboard`;
  - `subscriber` → `/profile`.
- **RBAC per child route** tetap dipertahankan sebagai lapisan kedua:
  - `/admin/dashboard` → `manage_settings` (admin).
  - `/admin/settings`, `/admin/pages`, `/admin/editor-settings` → `manage_settings`.
  - `/admin/taxonomies` → `manage_taxonomies`.
  - `/admin/users` → `manage_users`.
  - `/admin/moderation` → `moderate_comment`.
- Sidebar **bukan** batas keamanan — ia hanya affordance UI. Otorisasi nyata ada
  di guard route, meta `adminOnly`, dan aturan koleksi PocketBase.
- Tidak ada `v-html`, `eval()`, atau `new Function()` di fitur ini. Semua judul,
  nama author, kategori, dan komentar dirender dengan interpolasi Vue
  (`{{ }}`), sehingga otomatis di-escape.
- Tautan keluar dari shell admin memakai `RouterLink` internal; tombol logout
  memanggil `auth.logout()` lalu `router.push({ name: 'home' })`.
- Semua akses data melewati `DataSource`, menjaga layering yang sama dengan
  halaman lain dan menghindari pemanggilan backend langsung dari komponen.

## 5. Panduan Penggunaan (UI/UX)

1. Buka `/admin`. Sistem mengarahkan ke `/admin/dashboard`.
2. Gunakan grup di sidebar:
   - **Main** — Overview, My Posts, New Post.
   - **Content** — Categories & Tags, Pages, Comments.
   - **Community** — Users & Roles.
   - **System** — Site Settings, Editor Settings.
3. Klik judul grup untuk melipat/membuka submenu. Grup aktif ditandai pill
   ungu dan `aria-current="page"`.
4. **Kartu metrik** menampilkan angka utama, avatar kontributor, dan progress
   bar relatif terhadap total konten.
5. **Content board** menampilkan maksimal 3 kartu per kolom. Klik kartu untuk
   membuka post; draft membuka editor.
6. **Publication timeline** menampilkan event pada kolom hari dan posisi jam.
   Pada layar sempit, timeline dapat digeser horizontal di dalam kartunya.
7. **Topbar**:
   - ikon kaca pembesar / tombol Search → dialog pencarian global.
   - ikon gear → Site Settings.
   - ikon bantuan → halaman Contact.
   - ikon lonceng (dengan titik merah) → Comment Moderation.
   - ikon matahari/bulan → ganti tema; avatar → profil.
8. Di layar `<lg`, sidebar menjadi off-canvas. Tombol menu di topbar membuka
   panel dengan backdrop; memilih menu otomatis menutup panel.
9. Sidebar dan seluruh kartu mendukung dark mode (`dark:`), dengan focus ring
   dan label `aria-label` pada tombol ikon.

## 6. Pengujian & Verifikasi

Perintah yang dijalankan dari root repo:

```bash
npm run typecheck   # vue-tsc --noEmit → lulus tanpa error
npm run lint        # eslint . → 0 error, 0 warning
npm run test        # vitest run → 13 file, 103 test lulus
npm run build       # vue-tsc + vite build → sukses
cd backend && go test ./...   # → ok ncmaz.backend
```

### Build binary single-file

```powershell
# Windows (dev/smoke): build frontend release + backend/blogku.exe
& .\backend\build.ps1

# Linux amd64 (deploy): dari folder backend
$env:CGO_ENABLED='0'; $env:GOOS='linux'; $env:GOARCH='amd64'
go build -trimpath -ldflags="-s -w" -o blogku .
```

Hasil build terakhir:

| Artefak | Ukuran | Catatan |
| :--- | ---: | :--- |
| `backend/blogku.exe` | 37.481.472 byte | Windows, smoke lokal |
| `backend/blogku` | 26.742.944 byte | Linux amd64, untuk deploy |

Smoke test binary Windows (`serve --http=127.0.0.1:8091 --dir=<temp>`):
`GET /` = 200, `GET /admin` = 200, HTML mengandung `id="app"`. Binary dan
`frontend/dist`/`backend/dist` di-ignore sehingga tidak masuk commit.

Test baru:

- `frontend/src/router/admin-access.test.ts` — 4 test kebijakan akses:
  - seluruh route `/admin` dan `/admin/*` terdaftar,
  - setiap route admin ter-resolve dengan `meta.adminOnly === true`,
  - tidak ada route admin yang permissionnya diberikan ke `penulis`/`subscriber`,
  - `adminOnly` tidak bocor ke route publik/penulis.
- `frontend/src/lib/admin-timeline.test.ts` — 6 test:
  - window 7 hari berakhir pada reference,
  - penempatan event + warna palette,
  - rotasi palette,
  - clamp jam di luar rentang,
  - pengabaian event di luar window,
  - fallback ke tanggal post terbaru.

Verifikasi manual (Playwright, MockSource, sesi `user_admin`):

- `/admin` → redirect ke `/admin/dashboard`; judul dokumen
  `Admin Overview — Ncmaz`.
- 4 kartu metrik, 4 grup sidebar, dan 9 kartu board dirender; **0 console error**.
- Klik menu mobile → sidebar terbuka; klik **Categories & Tags** → URL
  `/admin/taxonomies`, sidebar tetap ada, header situs publik tidak dirender
  (`HAS_SITE_HEADER: 0`).
- Screenshot desktop 1440×1000 (light & dark) dan mobile 390×844 diperiksa:
  kartu, board, timeline, sidebar, dan topbar tampil tanpa overflow halaman.

Verifikasi akses berbasis role (Playwright, MockSource):

| Sesi | Path | Hasil |
| :--- | :--- | :--- |
| `user_admin` | `/admin` | `/admin/dashboard` |
| `user_admin` | `/admin/users` | `/admin/users` |
| `user_demo` (penulis) | `/admin` | `/dashboard` |
| `user_demo` (penulis) | `/admin/settings` | `/dashboard` |
| `user_subscriber` | `/admin` | `/profile` |
| `user_subscriber` | `/admin/moderation` | `/profile` |

Semua navigasi di atas menghasilkan **0 console error**.
