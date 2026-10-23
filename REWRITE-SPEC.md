# Spesifikasi Rewrite — Vue.js 3 + PocketBase

> Tujuan: menulis ulang `ncmaz-clone` (Next.js 14 + FaustWP/WordPress) menjadi aplikasi modern dengan tiga prioritas: **Aman, Cepat, Sederhana**.
> Dokumen pendamping: [`VULNERABILITY-NOTES.md`](./VULNERABILITY-NOTES.md) (temuan audit stack lama).
>
> Pengerjaan dibagi **2 fase**:
> - **FASE 1 — Frontend**: SPA Vue lengkap dengan **data mock**, tanpa backend. Tujuannya UI/UX, routing, state, dan render aman selesai dulu.
> - **FASE 2 — Integrasi Backend**: ganti mock dengan **PocketBase**, aktifkan otorisasi (RBAC), realtime, upload, dan deployment.

## 0. Meta

| Item | Nilai |
|------|-------|
| Versi target frontend | **Vue 3.5.x** + **Vite 8.3.x** |
| Versi target backend | **PocketBase v0.40.5** (Fase 2) |
| Basis data | **SQLite** (bawaan PocketBase, WAL mode) |
| Bahasa backend | **Go** (PocketBase sebagai library + hooks) |
| Peran pengguna | **admin**, **penulis**, **subscriber** (lihat §2.4) |
| Tanggal spec | 2026-10-22 |

## 0.1 Prinsip Desain

1. **Aman by default** — otorisasi di server (rules + RBAC), sanitasi HTML, tanpa `eval`, header ketat.
2. **Cepat** — paginasi server, index SQLite, gambar responsif, code-split, cache.
3. **Sederhana** — satu binary backend, satu SPA frontend, seminimal mungkin dependensi.
4. **Fase-1 siap fase-2** — frontend mengakses data lewat **satu interface adapter**. Di Fase 1 implementasinya mock; di Fase 2 tinggal ganti ke PocketBase tanpa mengubah komponen.
5. **Terdokumentasi Penuh (Open Source MIT)** — setiap fitur, API, dan modul wajib memiliki dokumen teknis di `docs/features/` sebelum dinyatakan selesai.

> **Aturan emas fase-1:** tidak ada komponen yang boleh memanggil PocketBase secara langsung. Semua lewat layer `src/api` (adapter). Ini kunci migrasi fase-2 yang mulus.

---

# FASE 1 — FRONTEND (Vue, data mock)

**Tujuan fase:** aplikasi SPA bisa dijalankan penuh secara offline dengan data mock, UI identik target akhir, dan aturan render aman sudah ditetapkan.

## 1.1 Stack Frontend

- Vue 3.5 (`<script setup>` + TypeScript).
- Vite 8.3.
- Vue Router 4, Pinia.
- Tailwind CSS (lanjutkan desain lama).
- `@vueuse/core` seperlunya, `date-fns` (bukan moment), `zod` untuk validasi bentuk data.
- **DOMPurify** untuk sanitasi render (dipakai sejak fase 1).
- MSW (Mock Service Worker) **atau** adapter mock in-memory untuk data.

**Larangan:** `eval`, `new Function`, library yang menyuntik HTML mentah, lodash penuh.

## 1.2 Struktur Repo (fase 1)

```
frontend/
├─ src/
│  ├─ main.ts
│  ├─ router/index.ts     # includes route guards per role
│  ├─ stores/             # pinia: auth(dummy), ui, bookmark
│  ├─ api/
│  │  ├─ types.ts         # tipe domain (Post, Comment, User, Category, Role)
│  │  ├─ source.ts        # INTERFACE DataSource (kontrak)
│  │  ├─ mock.source.ts   # implementasi mock (fase 1)
│  │  └─ mock-data/       # fixtures JSON
│  ├─ lib/
│  │  ├─ sanitize.ts      # DOMPurify allowlist
│  │  └─ permissions.ts   # helper can(user, action)
│  ├─ components/         # Card*, Comment*, Nav*, dll (port dari lama)
│  ├─ pages/              # views per route
│  └─ styles/
└─ vite.config.ts
```

## 1.3 Kontrak Data (kunci migrasi fase-2)

Definisikan **interface tunggal** yang jadi batas antara UI dan data:

```ts
// src/api/source.ts
export type Role = 'admin' | 'penulis' | 'subscriber'
export type ReactionType = 'like' | 'dislike' | 'favorite'

export interface DataSource {
  listPosts(p: { page: number; perPage: number; sort?: string; filter?: PostFilter }): Promise<Page<Post>>
  getPostBySlug(slug: string): Promise<Post | null>
  createPost(input: PostInput): Promise<Post>          // penulis/admin
  updatePost(id: string, input: PostInput): Promise<Post>
  deletePost(id: string): Promise<void>
  listCategories(): Promise<Category[]>
  saveCategory(input: CategoryInput): Promise<Category> // penulis/admin
  listComments(postId: string): Promise<Comment[]>
  createComment(input: { postId: string; content: string }): Promise<Comment>
  toggleReaction(input: { postId: string; type: ReactionType }): Promise<void>
  login(username: string, password: string): Promise<User>
  logout(): Promise<void>
  currentUser(): User | null
}
```

- Fase 1 → `MockSource implements DataSource`.
- Fase 2 → `PocketBaseSource implements DataSource` (satu file baru, komponen tidak berubah).

Komponen **hanya** bergantung pada `DataSource` (via `provide/inject` atau store), bukan implementasi konkret.

## 1.4 Routing & Halaman (dengan guard peran)

| Route | Halaman | Akses minimum |
|-------|---------|----------------|
| `/` | Home (hero + section) | publik |
| `/post/:slug` | Single post + komentar | publik |
| `/category/:slug`, `/tag/:slug` | Arsip | publik |
| `/author/:username` | Profil author | publik |
| `/search` | Hasil pencarian | publik |
| `/login`, `/sign-up`, `/reset-password` | Auth | publik |
| `/editor`, `/editor/:id` | Buat/edit post | **penulis**, admin |
| `/dashboard` | Kelola post milik sendiri | **penulis**, admin |
| `/bookmarks`, `/profile` | Favorit & profil | subscriber+ |
| `/admin/settings` | Pengaturan situs | **admin** |
| `/admin/users` | Manajemen user & peran | **admin** |
| `/admin/moderation` | Moderasi komentar | **admin** |

- Fase 1: guard memakai `authStore.role` (dummy). Fase 2: role sama, sumbernya dari PocketBase.

## 1.5 State (Pinia)

- `authStore` — `user` (termasuk `role`), token, status login; `isAdmin`, `isAuthor` getter.
- `uiStore` — tema (dark/light), modal, banner.
- `bookmarkStore` — daftar favorit (optimistic UI).
- Persist hanya data non-sensitif.

Helper izin terpusat (dipakai UI & guard):

```ts
// src/lib/permissions.ts
export const can = (role: Role | null, action: 'manage_settings' | 'manage_users' | 'write_post' | 'moderate_comment' | 'comment' | 'react') => {
  switch (action) {
    case 'manage_settings':
    case 'manage_users':
    case 'moderate_comment':
      return role === 'admin'
    case 'write_post':
      return role === 'admin' || role === 'penulis'
    case 'comment':
    case 'react':
      return role != null
  }
}
```

> Catatan: `permissions.ts` hanya menyembunyikan UI. **Keputusan akhir tetap di backend** (§2.5).

## 1.6 Render Aman (WAJIB sejak fase 1)

- Teks judul/excerpt/komentar → **`{{ }}`** (auto-escape).
- Konten kaya → `v-html` **hanya** pada hasil `sanitizeHtml()` (`lib/sanitize.ts`, DOMPurify allowlist: `p,br,strong,em,ul,ol,li,a[href],h2,h3,blockquote,code,pre,img[src|alt]`, buang `script`,`on*`,`javascript:`).
- **Hilangkan** komponen bergaya `CoreHtml` yang menjalankan `<script>` — akar kerentanan #1.
- Tambahkan CSP dasar via meta di `index.html` (CSP penuh di fase 2 lewat server).

## 1.7 Performa Frontend

- Route-level code splitting (`() => import()`).
- Lazy-load gambar (`loading="lazy"`, `decoding="async"`, `srcset`).
- Virtualisasi/infinite-scroll untuk daftar panjang.
- Tree-shaking; hindari bundel besar.

## 1.8 DoD Fase 1

- [x] Semua route di §1.4 tampil dengan data mock.
- [x] Guard peran (`/editor`, `/dashboard`, `/admin/*`) berfungsi dengan role dummy.
- [x] Helper `can()` dipakai untuk menyembunyikan aksi (tombol edit/hapus, menu admin).
- [x] Tidak ada `eval`/`new Function`; `v-html` hanya lewat `sanitizeHtml`.
- [x] Komponen tidak mengimpor data langsung — semua via `DataSource`.
- [x] `DataSource` + `MockSource` terdefinisi & bertipe.
- [x] `vitest` untuk `sanitize.ts`, `permissions.ts` & util; Playwright untuk alur navigasi utama.
- [x] Typecheck & lint bersih.
- [x] Setiap fitur memiliki dokumen spesifikasi di `docs/features/` & terdaftar di `docs/README.md`.

---

# FASE 2 — INTEGRASI BACKEND (PocketBase)

**Tujuan fase:** ganti `MockSource` dengan `PocketBaseSource`, aktifkan otorisasi/RBAC, realtime, upload, dan hardening deployment. UI tidak berubah.

## 2.1 Langkah Integrasi

1. Jalankan PocketBase, buat koleksi (§2.3).
2. Buat `frontend/src/api/pb.source.ts` (`PocketBaseSource`) + `lib/pb.ts` (instance SDK).
3. Tukar penyedia `DataSource` dari `MockSource` → `PocketBaseSource` (satu titik di `main.ts`).
4. Terapkan RBAC: field `role`, Collection Rules (§2.5), hook proteksi role (§2.6).
5. Implement auth token, error handling, refresh, realtime.
6. Jalankan Fase-1 DoD sebagai regression.

## 2.2 Arsitektur Akhir

```
┌──────────────────────────┐        HTTPS/JSON        ┌───────────────────────────┐
│  Vue 3 SPA (Vite)        │  ───────────────────────▶│  PocketBase (Go, 1 binary)│
│  - DataSource adapter    │  ◀───────────────────────│  - REST + Realtime (SSE)  │
│  - PocketBase JS SDK     │        SSE (realtime)    │  - SQLite (WAL)           │
│  - Guard peran (UI)      │                          │  - Collection Rules (RBAC)│
│  - Sanitasi render       │                          │  - Go hooks (validasi)    │
└──────────────────────────┘                          └───────────────────────────┘
```

## 2.3 Model Data (Collections)

| Collection | Tipe | Field inti | Catatan |
|-----------|------|-----------|---------|
| `users` | auth | `username`,`email`,`name`,`avatar` (file),`bio`,**`role`** | `role` = select `admin`\|`penulis`\|`subscriber`, default `subscriber` |
| `posts` | base | `title`,`slug`,`excerpt`,`content` (HTML tersanitasi),`content_blocks` (json),`cover` (file),`status`,`author`→users,`categories`→categories,`tags`→tags | index `slug`,`status`,`created` |
| `categories` | base | `name`,`slug`,`description`,`image`,`parent`(self) | index `slug` |
| `tags` | base | `name`,`slug` | index `slug` |
| `comments` | base | `post`→posts,`author`→users,`content`(teks aman),`parent`(self) | index `post` |
| `reactions` | base | `post`→posts,`user`→users,`type` = `like`\|`dislike`\|`favorite` | index unik `(post,user,type)` |
| `subscribers` | base | `email`(unique),`name` | rate-limit create |
| `contact_messages` | base | `name`,`email`,`message`,`handled` | create-only publik |
| `site_settings` | base singleton | field JSON | **bukan** file config |

**Prinsip:** `content` disimpan **sudah tersanitasi** (hook Go) atau disimpan sebagai `content_blocks` JSON; jangan simpan secret di collection/repo.

## 2.4 Peran & Hak Akses (RBAC)

### Peran

| Peran | Deskripsi |
|-------|-----------|
| **admin** | Akses penuh: semua konten, **pengaturan situs**, **manajemen user & peran**, moderasi komentar. |
| **penulis** | CRUD **post miliknya**, CRUD **tag & kategori**, komentar, like/dislike/favorit, upload media. |
| **subscriber** | Baca semua konten publik, komentar, like/dislike/favorit, kelola profil sendiri. |

- Disimpan di **`users.role`** (select). Default saat sign-up = `subscriber`.
- Panel admin PocketBase (`_superusers`) tetap terpisah dan **hanya untuk operasional** — role aplikasi tidak memberi akses ke panel tersebut.

### Matriks Izin (ringkas)

| Resource / Aksi | Guest | subscriber | penulis | admin |
|-----------------|:-----:|:----------:|:-------:|:-----:|
| Baca post terbit | ✅ | ✅ | ✅ | ✅ |
| Lihat post draft | – | – | milik sendiri | semua |
| Buat/ubah/hapus post | – | – | milik sendiri | semua |
| CRUD tag & kategori | – | – | ✅ | ✅ |
| Komentar (buat) | – | ✅ | ✅ | ✅ |
| Ubah/hapus komentar | – | milik sendiri | milik sendiri | semua (moderasi) |
| Like / Dislike | – | ✅ | ✅ | ✅ |
| Favorit (add to favorite) | – | ✅ | ✅ | ✅ |
| Upload media | – | – | ✅ | ✅ |
| Newsletter subscribe | ✅* | ✅ | ✅ | ✅ |
| Kirim pesan kontak | ✅* | ✅ | ✅ | ✅ |
| Baca/kelola subscriber | – | – | – | ✅ |
| Pengaturan situs (ubah) | – | – | – | ✅ |
| Manajemen user & peran | – | – | – | ✅ |

`*` publik dengan rate-limit + honeypot.

> **Asumsi:** hak `subscriber` (komentar, like/dislike/favorit) ditetapkan oleh spec ini; sesuaikan bila berbeda.

## 2.5 Otorisasi (Collection Rules)

**Aturan emas: rule kosong = publik.** Isi semua rule eksplisit. Pakai `@request.auth.role` untuk RBAC.

| Collection | list/view | create | update/delete |
|-----------|-----------|--------|----------------|
| `posts` | `status = "published" \|\| @request.auth.role = "admin" \|\| author = @request.auth.id` | `@request.auth.role = "admin" \|\| @request.auth.role = "penulis"` | `@request.auth.role = "admin" \|\| author = @request.auth.id` |
| `categories`/`tags` | `""` (baca publik) | `@request.auth.role = "admin" \|\| @request.auth.role = "penulis"` | idem create |
| `comments` | `""` | `@request.auth.id != ""` | `@request.auth.role = "admin" \|\| author = @request.auth.id` |
| `reactions` | `""` | `@request.auth.id != ""` | `user = @request.auth.id` |
| `users` | `id = @request.auth.id \|\| @request.auth.role = "admin"` | auth signup (default subscriber) | `id = @request.auth.id \|\| @request.auth.role = "admin"` (+ hook §2.6) |
| `subscribers` | `@request.auth.role = "admin"` | `""` (+ rate-limit) | `@request.auth.role = "admin"` |
| `contact_messages` | `@request.auth.role = "admin"` | `""` (+ rate-limit) | `@request.auth.role = "admin"` |
| `site_settings` | `""` (baca publik) | `null` | `@request.auth.role = "admin"` |

Catatan:
- Post **draft** hanya terlihat admin dan penulis pemiliknya.
- Moderasi komentar (hapus/ubah komentar orang lain) = admin.

## 2.6 Go Hooks (validasi, sanitasi, proteksi peran)

- **Proteksi peran (penting):** pada `OnRecordUpdateRequest` untuk `users`, tolak perubahan `role` bila pelaku bukan `admin` (set kembali ke nilai lama). Ini menutup celah self-escalation karena rules tidak bisa membatasi per-field.
- `OnRecordCreateRequest`: paksa `role = "subscriber"` untuk pendaftaran mandiri.
- Validasi + sanitasi HTML (`bluemonday`) untuk `posts.content`, `comments.content`; batas panjang (mis. komentar ≤ 5.000 char).
- Whitelist MIME upload.
- `audit.go`: catat aksi penting (perubahan role, hapus konten, moderasi, login).
- **Tidak** ada custom route tanpa cek `@request.auth`.

Contoh (pseudo-Go):

```go
app.OnRecordUpdateRequest("users").Add(func(e *core.RecordUpdateEvent) error {
  if e.Record.GetString("role") != e.Record.Original().GetString("role") {
    if e.RequestInfo().Auth?.GetString("role") != "admin" {
      e.Record.Set("role", e.Record.Original().GetString("role")) // tolak eskalasi
    }
  }
  return e.Next()
})
```

## 2.7 Kontrak API & Query Aman

- REST: `GET /api/collections/{name}/records` dengan `page`, `perPage`, `sort`, `fields`, `expand`.
- Filter **selalu** pakai parameter binding — jangan concat nilai user:

```ts
await pb.collection('posts').getList(1, 20, {
  filter: 'status = "published" && categories.slug ?= {:slug}',
  params: { slug },
  fields: 'id,title,slug,excerpt,cover,created',
  sort: '-created',
})
```

- Realtime: `pb.collection('comments').subscribe(...)` untuk komentar/like.

## 2.8 Auth

- PocketBase Auth (token), **bukan** cookie WordPress → CSRF tidak berlaku.
- Simpan token dengan sadar XSS (in-memory atau localStorage + CSP ketat).
- Alur: `login` → simpan token + `user.role` → `authStore`. Logout bersihkan state.
- Saat sign-up: peran selalu `subscriber` (promosi ke `penulis` hanya oleh admin).

## 2.9 Upload & Storage System

- File field PocketBase: `maxSize` (mis. 5 MB) + `mimeTypes` allowlist (`image/png,image/jpeg,image/webp`).
- **SVG aman**: disanitasi atau disimpan sebagai attachment.
- Hanya `penulis`/`admin` yang boleh upload media cerita; user terdaftar boleh upload avatar profil.
- Thumbnail via `?thumb=...`.
- **Dua Pilihan Storage Backend (Admin Configurable)**:
  1. **Local Filesystem Storage**: `./pb_data/storage` (default bawaan PocketBase untuk single VPS).
  2. **S3-Compatible Object Storage**: PocketBase Filesystem S3 settings (AWS S3, Cloudflare R2, MinIO, Wasabi) dengan konfigurasi `Bucket`, `Region`, `Endpoint`, `AccessKey`, dan `SecretKey`.
- **Domain Whitelisting untuk URL Gambar Eksternal**: URL gambar dari luar dibatasi hanya pada daftar domain yang diizinkan oleh admin di `site_settings.allowed_image_domains` (mis. Unsplash, Pexels, Cloudinary).

## 2.10 Keamanan Deployment (jawaban audit)

- CSP ketat: `default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; img-src 'self' data: https:`.
- HSTS `max-age=63072000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`.
- **Tidak** memakai `X-Frame-Options: ALLOW-FROM` (deprecated) — pakai `frame-ancestors`.
- Rate limit bawaan PocketBase aktif (login, create).
- Secret via env (`PB_ENCRYPTION_KEY`), CORS origin eksplisit (tanpa wildcard).
- Bila ada iframe preview: cek origin persis (`new URL(o).origin === allowed`), `postMessage` dengan `targetOrigin` spesifik.

> Checklist lengkap pemetaan tiap temuan → lihat [`VULNERABILITY-NOTES.md`](./VULNERABILITY-NOTES.md) §Checklist.

## 2.11 Migrasi Data dari WP

- Ekspor posts/kategori/tag/komentar dari WordPress → impor ke PocketBase.
- **Sanitasi saat impor** (jangan percaya HTML WP).
- Petakan author WP → `users` + set `role` (`penulis`/`admin`), media → file field, reaction lama → `reactions`.
- Pastikan tidak ada user hasil impor yang diam-diam mendapat `role = admin`.

## 2.12 Deployment

- Satu binary PocketBase + `pb_public` (hasil build Vue). Reverse proxy **Caddy** (TLS + header).
- Backup otomatis `pb_data/`; health `/api/health`.

```
example.com {
  encode zstd brotli
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Content-Security-Policy "default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; img-src 'self' data: https:"
  }
  handle /api/* { reverse_proxy 127.0.0.1:8090 }
  handle { root * /srv/pb_public; try_files {path} /index.html; file_server }
}
```

## 2.13 DoD Fase 2

- [ ] `PocketBaseSource` menggantikan `MockSource` tanpa mengubah komponen.
- [ ] Field `role` aktif; default sign-up = `subscriber`.
- [ ] **Non-admin tidak bisa mengubah `role`** (diuji: eskalasi ditolak).
- [ ] Semua Collection Rules terisi & diuji positif/negatif per peran (admin/penulis/subscriber/guest).
- [ ] Matriks izin §2.4 terbukti di level API (bukan hanya UI).
- [ ] Hook sanitasi & validasi aktif; upload membatasi MIME/ukuran; SVG diblokir.
- [ ] CSP/HSTS aktif & terverifikasi.
- [ ] Realtime komentar/like berfungsi.
- [ ] `govulncheck` & `npm audit` bersih.
- [ ] Backup & restore `pb_data/` teruji.
- [ ] Data WP termigrasi & tersanitasi; tidak ada eskalasi peran hasil impor.

---

## Lampiran A — Non-Goals

- Tanpa GraphQL, tanpa WordPress/PHP, tanpa microservice, tanpa plugin/HTML mentah yang menjalankan script.

## Lampiran B — Testing & CI (kedua fase)

- Frontend: `vitest` (util/sanitizer/permissions) + Playwright (alur + guard peran).
- Backend (fase 2): unit test hooks (terutama proteksi `role`); test rules akses per peran.
- CI gate: lint + typecheck + test + `govulncheck` + `npm audit`.

## Lampiran C — Ringkasan Pembagian Kerja

| | Fase 1 | Fase 2 |
|--|--------|--------|
| Fokus | UI/UX, routing, guard peran (UI), render aman | Otorisasi/RBAC server, realtime, upload, deployment |
| Data | Mock (`MockSource`) | PocketBase (`PocketBaseSource`) |
| Auth | Dummy (`role` mock) | PocketBase token + `users.role` |
| Risiko utama | XSS render | IDOR/rules, eskalasi peran, upload, header |

## Lampiran D — Peran & Izin (rujukan cepat)

| Aksi | admin | penulis | subscriber | guest |
|------|:-----:|:-------:|:----------:|:-----:|
| Pengaturan situs | ✅ | – | – | – |
| Manajemen user & peran | ✅ | – | – | – |
| Moderasi komentar | ✅ | – | – | – |
| CRUD post (semua) | ✅ | milik sendiri | – | – |
| CRUD tag & kategori | ✅ | ✅ | – | – |
| Komentar | ✅ | ✅ | ✅ | – |
| Like / Dislike / Favorit | ✅ | ✅ | ✅ | – |
| Upload media | ✅ | ✅ | – | – |
| Baca konten publik | ✅ | ✅ | ✅ | ✅ |
