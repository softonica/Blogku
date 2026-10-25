# Spesifikasi Integrasi Backend PocketBase (Revisi)

| Metadata | Nilai |
| :--- | :--- |
| **Status** | Spesifikasi + adapter frontend terimplementasi; implementasi backend (koleksi, hooks, rate limit) berada di luar repo ini |
| **Baseline frontend** | `v0.0.2-alpha` (`2ef1b52`) |
| **Target backend** | PocketBase `v0.40.6` (Go, SQLite WAL) |
| **Menggantikan** | Fase 2 pada `REWRITE-SPEC.md` (sudah dihapus dari repo) |
| **Tanggal revisi** | 2026-10-24 |
| **Cakupan** | Pemetaan `DataSource`, skema koleksi, RBAC, auth, upload, settings/pages, error contract, rate limit, deployment |
| **Di luar cakupan** | Implementasi kode backend, SSR, multi-tenant, pencarian full-text eksternal |

> Dokumen ini adalah **sumber kebenaran** untuk integrasi PocketBase. Setiap penyimpangan dari frontend saat ini ditulis eksplisit beserta alasannya.
>
> Panduan penerapan (deploy) dan integrasi operasional ada di
> [`backend-deployment-spec.md`](./backend-deployment-spec.md).

---

## 1. Ringkasan Revisi

| Area | Spec lama (Fase 2) | Revisi ini | Alasan |
| :--- | :--- | :--- | :--- |
| Kontrak data | 13 method | **36 method** sesuai `frontend/src/api/source.ts` | Frontend bertambah: pages, editor settings, tags, authors, users, upload |
| `users` publik | Hanya self/admin | Profil publik untuk author, `email` tetap tersembunyi | `/author/:username`, `post.author`, dan `listAuthorsFeatured` butuh akses publik |
| Taxonomies | Penulis boleh CRUD | Kategori: **admin**; Tag create: **penulis/admin**, update/delete: **admin** | Route `/admin/taxonomies` hanya admin; inline tag creation di editor butuh penulis |
| Footer/logo/settings | `site_settings` singleton | `site_settings` singleton + `pages` + `editor_settings` | Fitur CMS halaman statis dan editor settings sudah ada |
| Upload | File field di post | Koleksi `media` + URL teks di record | Frontend menyimpan `cover`, `avatar`, `image` sebagai string URL (termasuk URL eksternal) |
| HTML post | `content_blocks` JSON | `content` HTML tersanitasi (utama) + `content_blocks` opsional | Editor saat ini menghasilkan HTML Tiptap |
| Bookmarks | Reaction `favorite` | **Lokal (localStorage) untuk MVP**; server sync ditunda | `bookmark.ts` belum memakai `DataSource` |
| Newsletter/kontak | Koleksi + rate limit | Ditunda sampai UI benar-benar memanggil backend | Form newsletter masih mock; halaman contact berupa konten statis |
| Rate limit | "Rate limit bawaan PocketBase" | **Layered**: built-in + middleware Go per-route | Kebutuhan endpoint aplikasi (komentar, reaction, upload) tidak tercakup built-in |
| Error 429 | Tidak dibahas | Kontrak `429` + `Retry-After` + perilaku UI | Frontend harus menampilkan pesan yang bisa ditindaklanjuti |
| SVG upload | Diblokir | Tetap diblokir; teks UI admin diperbaiki | `MockSource.uploadFile` menolak SVG, tetapi copy UI menyebut SVG |

---

## 2. Kondisi Frontend Saat Ini

### 2.1 Inventaris `DataSource`

Semua akses data UI wajib melalui `src/api/source.ts`. Implementasi target adalah `PocketBaseSource`; komponen tidak boleh diubah untuk memanggil SDK secara langsung.

| Method | Perilaku saat ini (mock) | Catatan integrasi |
| :--- | :--- | :--- |
| `listPosts` | Paginasi, filter status/kategori/tag/author/search/ids/featured | Map ke `GET /api/collections/posts/records` + `expand` |
| `getPostBySlug` / `getPostById` | Null jika tidak ada | Map ke `getFirstListItem` / `getOne` |
| `createPost` | Sanitasi + slug + reading time + author = user | Author **dipaksa** dari auth, bukan input klien |
| `updatePost` | Pemilik atau admin | Rule + hook |
| `deletePost` | Pemilik atau admin | Rule |
| `listCategories` | Semua kategori | `getFullList` |
| `create/update/deleteCategory` | Admin (route), mock izinkan penulis | Spec: admin saja |
| `saveCategory` | Legacy upsert | Alias kompatibilitas, tidak dipakai UI baru |
| `listTags` | Semua tag | `getFullList` |
| `createTag` | Mengembalikan tag existing bila slug sama | Perlu lookup sebelum create |
| `update/deleteTag` | Admin | Rule |
| `listComments` | Komentar per post, urut lama → baru | Filter `post` |
| `createComment` | Login wajib, 1–5000 karakter | Author dipaksa dari auth |
| `deleteComment` | Pemilik atau admin | Rule |
| `listAllComments` | Semua komentar untuk moderasi | Hanya admin yang memakai UI |
| `toggleReaction` | Toggle `like`/`dislike`/`favorite` per user | Butuh unique index + counter `likeCount` |
| `login` | Username **atau** email | PocketBase `identityFields = email, username` |
| `logout` | Hapus sesi | `pb.authStore.clear()` |
| `currentUser` | Sinkron dari sesi | Baca `pb.authStore.record` |
| `listAuthors` | User non-subscriber | Filter `role != "subscriber"` |
| `getUserByUsername` | Publik | Filter `username` |
| `listAuthorsFeatured` | Urut `postCount` desc | Butuh `postCount` terdenormalisasi |
| `listUsers` | Admin | Rule |
| `updateUserRole` | Admin, tidak boleh demote diri sendiri (UI) | Hook wajib menolak self-demote dan last-admin |
| `get/updateSiteSettings` | Dibaca publik, diubah admin | Singleton |
| `get/updatePage` | `about`, `contact`, `privacy` | Koleksi `pages` |
| `get/updateEditorSettings` | Dibaca editor, diubah admin | Singleton |
| `updateUserProfile` | Nama, bio, avatar | Update record sendiri |
| `uploadFile` | Data URL, validasi MIME/5 MB | Upload ke koleksi `media`, kembalikan URL |

### 2.2 Gap yang Harus Ditutup Sebelum Fase 2

1. **Registrasi**: `authStore.register()` hanya membuat user di `localStorage`. Tambahkan `register()` ke `DataSource`.
2. **Reset password**: halaman reset hanya simulasi. Tambahkan `requestPasswordReset()` dan `confirmPasswordReset()`.
3. **Newsletter/contact**: form belum memanggil backend. Tambahkan method `subscribeNewsletter()` / `sendContactMessage()` atau sembunyikan form sampai siap.
 4. **Draft**: `DashboardPage` mengirim `filter.status` dan menampilkan tab Published/Drafts (selesai).
 5. **Bookmark**: masih `localStorage`. MVP boleh tetap lokal; sync server ditunda.
 6. **`viewCount`**: belum ada pemanggilan increment. Penambahan view harus lewat custom route yang di-rate-limit dan deduplikasi per sesi/IP.
 7. **Mock fallback**: `HomePage` memakai `DataSource` dan tidak mengimpor seed mock (selesai). Mode Mock tetap tersedia eksplisit via `VITE_USE_POCKETBASE=false` untuk dev/demo.
 8. **Local user override**: `authStore` tidak lagi menyimpan `ncmaz.mock.local-user.v1` (selesai).
 9. **Error 429**: adapter menerjemahkan `429` menjadi `RateLimitError` + `retryAfter`; UI memakai `useRateLimit()` (selesai).
 10. **UI copy upload**: teks dan `accept` SVG di halaman admin diperbaiki; backend menolak SVG (selesai).

---

## 3. Arsitektur Target

```text
┌─────────────────────────────┐         HTTPS/JSON         ┌──────────────────────────────┐
│ Vue 3 SPA (Vite)            │  ────────────────────────▶ │ PocketBase (Go, 1 binary)    │
│ ├─ DataSource adapter       │                            │ ├─ REST + Realtime (SSE)     │
│ ├─ PocketBase JS SDK        │  ◀──────────────────────── │ ├─ SQLite WAL                │
│ ├─ Route guard (UI only)    │         SSE                │ ├─ Collection Rules (RBAC)   │
│ └─ Sanitasi render (DOMPurify)                           │ ├─ Go hooks (validasi/role)  │
└─────────────────────────────┘                            │ ├─ Media collection          │
                                                           │ └─ Rate limit middleware     │
                                                           └──────────────────────────────┘
```

Prinsip:

- **Server adalah otoritas RBAC.** Guard UI hanya UX, bukan keamanan.
- **Sanitasi ganda.** Klien memakai DOMPurify saat render; server memakai allowlist saat menyimpan.
- **Tidak ada akses SDK langsung dari komponen.**
- **Rate limit tidak boleh hanya di klien.**

---

## 4. Model Data (Collections)

### 4.1 Daftar Koleksi

| Koleksi | Tipe | Fungsi | Catatan |
| :--- | :--- | :--- | :--- |
| `users` | auth | Akun + profil + role | `emailVisibility = false` |
| `posts` | base | Artikel semua format | Index slug/status/author/created |
| `categories` | base | Kategori hierarkis | `parent` self-relation |
| `tags` | base | Tag | Slug unik |
| `comments` | base | Komentar | `parent` opsional |
| `reactions` | base | Like/dislike/favorite | Unique `(post,user,type)` |
| `media` | base | Upload gambar | File + owner |
| `site_settings` | base singleton | Branding & kebijakan | ID tetap `site_settings` |
| `pages` | base | Halaman statis | `about`, `contact`, `privacy` |
| `editor_settings` | base singleton | Konfigurasi editor | ID tetap `editor_settings` |
| `subscribers` | base | Newsletter | **Ditunda** |
| `contact_messages` | base | Pesan kontak | **Ditunda** |

### 4.2 `users`

| Field | Tipe | Aturan |
| :--- | :--- | :--- |
| `username` | text | Wajib, unik, 3–30, `^[a-z0-9-]+$` |
| `email` | email | Wajib, unik, `emailVisibility = false` |
| `name` | text | Wajib, 2–80 |
| `avatar` | url | URL media / eksternal yang diizinkan |
| `bio` | text | Maks 500 |
| `role` | select | `admin`, `penulis`, `subscriber`; default `subscriber` |
| `postCount` | number | Denormalisasi, minimal 0 |
| `verified` | bool | Sistem PocketBase |

Catatan:

- `email` hanya terlihat oleh pemilik record, admin, dan superuser. Jangan pernah mengembalikan email pada endpoint publik.
- `role` tidak boleh diubah sendiri oleh non-admin (hook §7.4).
- Sign-up mandiri selalu menghasilkan `subscriber`, meskipun body mengirim role lain.
- `postCount` diperbarui oleh hook saat post dibuat, dihapus, atau berubah status.

### 4.3 `posts`

| Field | Tipe | Aturan |
| :--- | :--- | :--- |
| `title` | text | Wajib, 4–140 |
| `slug` | text | Wajib, unik, lowercase, 3–160 |
| `excerpt` | text | Wajib, 10–300 |
| `content` | editor/text | HTML tersanitasi, maks 50.000 karakter |
| `content_blocks` | json | Opsional untuk migrasi editor blok |
| `cover` | url | URL media / eksternal; divalidasi domain |
| `status` | select | `draft`, `published`; default `draft` |
| `postType` | select | `standard`, `video`, `audio`, `gallery` |
| `videoUrl` | url | Opsional, hanya untuk `video` |
| `audioUrl` | url | Opsional, hanya untuk `audio` |
| `gallery` | json | Array URL, maks 20 |
| `author` | relation → `users` | Wajib, diisi server dari auth |
| `categories` | relation → `categories` | Multi, minimal 1 |
| `tags` | relation → `tags` | Multi, maks 5 |
| `featured` | bool | Default `false` |
| `readingTime` | number | Dihitung server dari `content` |
| `likeCount` | number | Counter reaction `like` |
| `viewCount` | number | Counter view (custom route) |
| `commentCount` | number | Counter komentar |

Index wajib:

```sql
CREATE UNIQUE INDEX idx_posts_slug ON posts (slug);
CREATE INDEX idx_posts_status_created ON posts (status, created DESC);
CREATE INDEX idx_posts_author ON posts (author);
CREATE INDEX idx_posts_categories ON posts (categories);
CREATE INDEX idx_posts_tags ON posts (tags);
```

### 4.4 `categories` / `tags`

`categories`: `name` (2–60), `slug` unik, `description` (maks 300), `image` URL, `parent` relation self, `postCount` number.

`tags`: `name` (2–40), `slug` unik, `postCount` number.

- Hapus kategori yang masih memiliki child ditolak `409` dengan pesan yang bisa ditampilkan UI.
- Relasi post ke kategori/tag yang dihapus dilepas oleh hook; counter diperbarui.

### 4.5 `comments`

| Field | Tipe | Aturan |
| :--- | :--- | :--- |
| `post` | relation → `posts` | Wajib, index |
| `author` | relation → `users` | Wajib, diisi server |
| `content` | text | 2–5.000 karakter, plain text |
| `parent` | relation → `comments` | Opsional (UI saat ini membuat `null`) |

### 4.6 `reactions`

| Field | Tipe | Aturan |
| :--- | :--- | :--- |
| `post` | relation → `posts` | Wajib |
| `user` | relation → `users` | Wajib, diisi server |
| `type` | select | `like`, `dislike`, `favorite` |

```sql
CREATE UNIQUE INDEX idx_reactions_unique ON reactions (post, user, type);
```

`likeCount` di `posts` dihitung ulang secara atomik pada create/delete reaction bertipe `like`. Jangan menghitung `COUNT(*)` pada setiap list request.

### 4.7 `media`

| Field | Tipe | Aturan |
| :--- | :--- | :--- |
| `file` | file | Wajib, satu file, maks 5 MB |
| `owner` | relation → `users` | Diisi server |
| `alt` | text | Opsional, maks 160 |
| `created` | auto | — |

MIME yang diterima: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/avif`. **SVG dan HTML ditolak.**

`uploadFile()` mengembalikan:

```ts
{ url: pb.files.getURL(record, record.file), name: file.name }
```

URL eksternal (Unsplash/Pexels/Cloudinary) tetap diizinkan selama domainnya ada di `site_settings.allowedImageDomains`.

### 4.8 Singleton & Halaman

`site_settings` (ID tetap `site_settings`):

```json
{
  "siteName": "Blogku",
  "siteDescription": "...",
  "contactEmail": "contact@blogku.com",
  "allowRegistration": true,
  "footerText": "...",
  "logo": "",
  "logoDark": "",
  "favicon": "/favicon.ico",
  "allowedImageDomains": ["images.unsplash.com", "images.pexels.com"]
}
```

`editor_settings` mengikuti `EditorSettings` di `frontend/src/api/types.ts` secara 1:1 (placeholder, show\*, autolink, maxContentLength, maxImageUploadSize).

`pages`: `slug` unik (`about`, `contact`, `privacy`), `title`, `body` HTML tersanitasi, `updatedBy` relation. Halaman baru boleh ditambah admin.

---

## 5. Pemetaan `DataSource` → PocketBase

| Method | Endpoint / query | Mapping response |
| :--- | :--- | :--- |
| `listPosts` | `GET /api/collections/posts/records?page&perPage&sort&filter&expand=author,categories,tags` | `created → createdAt`, `updated → updatedAt`, `expand → author/categories/tags` |
| `getPostBySlug` | `getFirstListItem('slug = {:slug}')` | `null` bila `404` |
| `getPostById` | `getOne(id)` | `null` bila `404` |
| `createPost` | `POST /api/collections/posts/records` | Author/readingTime/counters diisi hook |
| `updatePost` | `PATCH /api/collections/posts/records/{id}` | Sanitasi + slug unik |
| `deletePost` | `DELETE /api/collections/posts/records/{id}` | Counter author diperbarui |
| `listCategories` | `getFullList({ sort: 'name' })` | `parent → parentId` |
| `create/updateCategory` | `POST/PATCH .../categories/records` | Admin |
| `deleteCategory` | `DELETE .../categories/records/{id}` | `409` bila ada child |
| `listTags` | `getFullList({ sort: 'name' })` | — |
| `createTag` | Lookup slug → create bila belum ada | Kembalikan existing (idempoten) |
| `update/deleteTag` | `PATCH/DELETE .../tags/records/{id}` | Admin |
| `listComments` | `getFullList({ filter: 'post = {:id}', sort: 'created', expand: 'author' })` | — |
| `createComment` | `POST .../comments/records` | `parent = null` |
| `deleteComment` | `DELETE .../comments/records/{id}` | Rule |
| `listAllComments` | `getFullList({ sort: '-created', expand: 'post,author' })` | Admin/ moderator |
| `toggleReaction` | Cari `(post,user,type)` → `delete` atau `create` | Hook update `likeCount` |
| `login` | `authWithPassword(identity, password)` | Simpan token di SDK |
| `logout` | `authStore.clear()` | Hapus state |
| `currentUser` | `authStore.record` | Mapping sinkron |
| `listAuthors` | `getFullList({ filter: 'role != "subscriber"', sort: 'name' })` | — |
| `getUserByUsername` | `getFirstListItem('username = {:username}')` | `null` bila `404` |
| `listAuthorsFeatured` | Query yang sama, sort `-postCount`, limit N | — |
| `listUsers` | `getFullList({ sort: 'created' })` | Admin |
| `updateUserRole` | `PATCH .../users/records/{id}` | Hook menolak eskalasi |
| `getSiteSettings` | `GET .../site_settings/records/site_settings` | Map snake/camel |
| `updateSiteSettings` | `PATCH` singleton | Admin |
| `getPage` | `getFirstListItem('slug = {:slug}')` | `null` bila `404` |
| `updatePage` | `PATCH .../pages/records/{id}` | Admin |
| `getEditorSettings` | `GET` singleton | — |
| `updateEditorSettings` | `PATCH` singleton | Admin |
| `updateUserProfile` | `PATCH .../users/records/{id}` | Hanya field profil |
| `uploadFile` | `POST .../media/records` (multipart) | `{ url, name }` |

### 5.1 Contoh query list

```ts
const filters: string[] = ['status = "published"']
if (p.filter?.featured !== undefined) filters.push('featured = {:featured}')
if (p.filter?.categorySlug) filters.push('categories.slug ?= {:categorySlug}')
if (p.filter?.tagSlug) filters.push('tags.slug ?= {:tagSlug}')
if (p.filter?.authorUsername) filters.push('author.username = {:authorUsername}')
if (p.filter?.ids?.length) filters.push('id ?= {:ids}')
if (p.filter?.search) {
  filters.push('(title ~ {:q} || excerpt ~ {:q} || content ~ {:q})')
}

const page = await pb.collection('posts').getList(p.page, p.perPage, {
  filter: pb.filter(filters.join(' && '), params),
  sort: sortToPb(p.sort), // '-createdAt' -> '-created'
  expand: 'author,categories,tags',
})
```

Aturan:

- Selalu gunakan `pb.filter()`; jangan menyambung nilai user ke string filter.
- Batasi `perPage` maksimum 100 (sama dengan mock).
- Jangan meminta `email` pada `fields`.

### 5.2 Normalisasi error

`PocketBaseSource` harus menormalkan error agar UI tidak menampilkan pesan mentah:

| HTTP | Perilaku adapter |
| :--- | :--- |
| `400` | Ambil pesan field pertama dari `data` |
| `401` | `LOGIN_REQUIRED` → route login |
| `403` | `FORBIDDEN` |
| `404` | `null` untuk getter; error untuk mutasi |
| `409` | Pesan konflik (slug duplicate, child category) |
| `429` | `RateLimitError` (§10) |
| `5xx` | `Server sedang bermasalah. Coba lagi.` |

---

## 6. RBAC & Collection Rules

### 6.1 Peran

| Peran | Hak |
| :--- | :--- |
| **admin** | Semua konten, settings, pages, users, moderasi, taxonomies |
| **penulis** | CRUD post miliknya, buat tag, komentar, reaction, upload media |
| **subscriber** | Baca konten publik, komentar, reaction, edit profil sendiri |
| **guest** | Baca konten publik, sign-up, reset password |

### 6.2 Matriks Izin

| Aksi | Guest | subscriber | penulis | admin |
| :--- | :---: | :---: | :---: | :---: |
| Baca post published | ✅ | ✅ | ✅ | ✅ |
| Baca draft | – | – | milik sendiri | semua |
| Buat/ubah/hapus post | – | – | milik sendiri | semua |
| CRUD kategori | – | – | – | ✅ |
| Buat tag | – | – | ✅ | ✅ |
| Ubah/hapus tag | – | – | – | ✅ |
| Komentar | – | ✅ | ✅ | ✅ |
| Hapus komentar | – | milik sendiri | milik sendiri | semua |
| Reaction | – | ✅ | ✅ | ✅ |
| Upload media | – | – | ✅ | ✅ |
| Edit profil sendiri | – | ✅ | ✅ | ✅ |
| Ganti role | – | – | – | ✅ |
| Settings/pages/editor settings | baca | baca | baca | ubah |
| Moderasi komentar | – | – | – | ✅ |

### 6.3 Collection Rules

| Koleksi | List / View | Create | Update / Delete |
| :--- | :--- | :--- | :--- |
| `users` | `role != "subscriber" \|\| id = @request.auth.id \|\| @request.auth.role = "admin"` | `""` + hook `allowRegistration` | `id = @request.auth.id \|\| @request.auth.role = "admin"` + hook role |
| `posts` | `status = "published" \|\| @request.auth.role = "admin" \|\| author = @request.auth.id` | `@request.auth.role = "admin" \|\| @request.auth.role = "penulis"` | `@request.auth.role = "admin" \|\| author = @request.auth.id` |
| `categories` | `""` | `@request.auth.role = "admin"` | `@request.auth.role = "admin"` |
| `tags` | `""` | `@request.auth.role = "admin" \|\| @request.auth.role = "penulis"` | `@request.auth.role = "admin"` |
| `comments` | `post.status = "published" \|\| @request.auth.role = "admin" \|\| post.author = @request.auth.id` | `@request.auth.id != ""` | `@request.auth.role = "admin" \|\| author = @request.auth.id` |
| `reactions` | `@request.auth.id != "" && (user = @request.auth.id \|\| @request.auth.role = "admin")` | `@request.auth.id != ""` | `user = @request.auth.id \|\| @request.auth.role = "admin"` |
| `media` | `""` | `@request.auth.role = "admin" \|\| @request.auth.role = "penulis"` | `owner = @request.auth.id \|\| @request.auth.role = "admin"` |
| `site_settings` | `""` | `null` | `@request.auth.role = "admin"` |
| `pages` | `""` | `@request.auth.role = "admin"` | `@request.auth.role = "admin"` |
| `editor_settings` | `""` | `null` | `@request.auth.role = "admin"` |

Catatan:

- Rule kosong `""` berarti publik. `null` berarti tertutup.
- `users.email` tetap tersembunyi karena `emailVisibility = false`; jangan mengandalkan `fields` query sebagai kontrol keamanan.
- Jangan memberi `manageRule` kepada role aplikasi.

### 6.4 Go Hooks Wajib

1. **Role guard** (`users` update/create):
   - Non-admin tidak boleh mengubah `role`.
   - Sign-up mandiri dipaksa `role = "subscriber"`.
   - Admin tidak boleh menurunkan dirinya sendiri.
   - Admin terakhir tidak boleh diturunkan/dihapus.
2. **Sanitasi**:
   - `posts.content`, `pages.body`: allowlist HTML (`bluemonday`).
   - `comments.content`, `categories.description`, `tags.name`, `users.bio`: plain text.
   - `cover`, `avatar`, `image`, `videoUrl`, `audioUrl`, `gallery`: URL validation + domain allowlist.
3. **Derivasi**:
   - `author` post/komentar/reaction dari `e.Auth.Id`, bukan input.
   - `readingTime` dari konten.
   - `likeCount`, `commentCount`, `postCount` diperbarui dalam transaksi.
4. **Validasi bisnis**:
   - Slug unik dan dinormalisasi.
   - Maksimal 5 tag per post.
   - Kategori tanpa child sebelum dihapus.
   - MIME/ukuran upload.
5. **Audit**: catat perubahan role, penghapusan konten, moderasi, dan upload gagal.

---

## 7. Auth

- Gunakan PocketBase Auth (token), bukan cookie WordPress.
- `passwordAuth.identityFields = ["email", "username"]` agar login `demo` atau `demo@blogku.com` sama-sama bekerja.
- `authStore` Pinia menyimpan `user` hasil mapping. Token disimpan oleh SDK.
- `currentUser()` membaca `pb.authStore.record`; `logout()` memanggil `authStore.clear()`.
- Sign-up:
  1. `POST /api/collections/users/records` dengan nama, username, email, password.
  2. Hook memaksa `role = subscriber` dan memeriksa `site_settings.allowRegistration`.
  3. Adapter memanggil `authWithPassword` agar user langsung login (opsional; frontend saat ini langsung set user).
- Reset password:
  - `requestPasswordReset(email)` → email berisi token.
  - Halaman `/reset-password` perlu dua mode: minta link dan konfirmasi token (`?token=`).
- Jangan pernah menyimpan password di state, log, atau `localStorage`.
- Token XSS: CSP ketat + sanitasi + tidak ada `v-html` tanpa `sanitizeHtml`.

---

## 8. Upload & Storage

- Semua upload melewati `uploadFile()` → koleksi `media`.
- Validasi klien (UX) **dan** server (kebenaran): MIME, ukuran 5 MB, ekstensi.
- SVG, HTML, dan file yang dapat mengeksekusi script ditolak.
- Gambar ditampilkan lewat `pb.files.getURL()`; jangan menulis path `pb_data` ke UI.
- Thumbnail: gunakan `?thumb=600x0` untuk kartu, bukan file asli.
- Storage backend:
  1. Local filesystem (`pb_data/storage`) untuk single VPS.
  2. S3-compatible (R2/S3/MinIO) untuk produksi.
- Hapus media yatim (tidak direferensikan) lewat job terjadwal, bukan langsung saat update.

---

## 9. Settings, Pages, dan Editor

- `getSiteSettings()` dipanggil di hampir semua halaman. Cache di Pinia sekali per sesi; invalidasi setelah admin menyimpan.
- `allowedImageDomains` menjadi sumber validasi `isAllowedImageDomain()` di klien dan server.
- `getPage()` mengembalikan `null` untuk slug tidak dikenal; `StaticPage` sudah menampilkan empty state.
- `updatePage()` hanya admin, sanitasi `body`, dan memperbarui `updatedBy`.
- `getEditorSettings()` dibaca publik (editor membutuhkannya); `updateEditorSettings()` admin.
- Nilai `maxContentLength`/`maxImageUploadSize` harus ditegakkan juga di server.

---

## 10. Kontrak Error & Rate Limit

### 10.1 Bentuk Error 429

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 30
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1761350400

{
  "status": 429,
  "message": "Too many requests. Please try again in 30 seconds.",
  "data": {
    "code": "rate_limit_exceeded",
    "retryAfter": 30
  }
}
```

Frontend:

- `PocketBaseSource` mendeteksi `status === 429`, membaca `Retry-After` (fallback `data.retryAfter`), lalu melempar `RateLimitError` dengan `retryAfter`.
- `LoginPage`, `CommentForm`, `ProfilePage`, `EditorPage`, dan form admin menampilkan pesan dari error tersebut dan menonaktifkan tombol selama `retryAfter` detik.
- Jangan melakukan retry otomatis pada `429`; gunakan backoff hanya untuk `5xx`/jaringan.

### 10.2 Tujuan Rate Limit

Melindungi dari:

- Brute force dan credential stuffing pada login/reset.
- Spam komentar dan reaction farming.
- Abuse upload dan pembuatan post.
- Spam newsletter/kontak (saat diaktifkan).
- Scraping/DoS ringan pada endpoint baca.

Rate limit **bukan** pengganti CAPTCHA, verifikasi email, honeypot, atau moderasi. `CommentForm` sudah memiliki honeypot `website`; pertahankan.

### 10.3 Arsitektur Berlapis

| Lapisan | Fungsi |
| :--- | :--- |
| **Edge / Cloudflare** (opsional) | Rate limit per IP, bot management, DDoS |
| **PocketBase built-in** | Batas kasar per path (semua endpoint) |
| **Middleware Go aplikasi** | Batas per route + identitas (user/IP) + multi-window |
| **Hook bisnis** | Deduplikasi reaction, validasi, audit |

Aktifkan rate limiter bawaan PocketBase di **Dashboard → Settings → Application → Rate limits**. Isi minimal:

| Label | maxRequests | duration (detik) |
| :--- | ---: | ---: |
| `/api/collections/users/auth-with-password` | 20 | 60 |
| `/api/collections/users/records` | 10 | 3600 |
| `/api/collections/users/request-password-reset` | 5 | 900 |
| `/api/` | 600 | 60 |

Middleware aplikasi memberi batas yang lebih ketat dan sadar identitas.

### 10.4 Algoritma

- **Token bucket** per `(ruleID, identityKey)`:
  - Kapasitas = `limit`.
  - Refill = `limit / window`.
  - Satu request mengonsumsi 1 token.
- Alasan: tidak ada lonjakan ganda di batas window seperti fixed-window.
- Key:
  - `ip`: `e.RealIP()` (butuh `--trustedProxy` yang benar).
  - `user`: `e.Auth.Id`.
  - `user+ip`: keduanya, untuk mencegah satu akun dipakai dari banyak IP dan satu IP membuat banyak akun.
  - `account`: hash dari identity login (opsional) untuk credential stuffing terdistribusi.
- Penyimpanan: in-memory `map` + `sync.Mutex` (single binary). Bersihkan bucket idle setiap 10 menit; TTL 1 jam.
- Multi-instance: gunakan Redis atau rate limit di edge. Jangan mengandalkan sticky session.
- Fail mode: untuk endpoint auth, **fail-closed** bila store eksternal error; untuk endpoint baca, **fail-open** sambil mencatat alert.

### 10.5 Aturan Rate Limit Aplikasi

| Rule ID | Method & path | Key | Limit | Window | Catatan |
| :--- | :--- | :--- | ---: | ---: | :--- |
| `auth-login` | `POST /api/collections/users/auth-with-password` | IP | 10 | 15 menit | Gagal login tetap dihitung |
| `auth-login-account` | idem | hash identity | 5 | 15 menit | Cegah distributed guessing |
| `auth-register` | `POST /api/collections/users/records` | IP | 3 | 1 jam | Sign-up |
| `auth-refresh` | `POST /api/collections/users/auth-refresh` | user | 120 | 1 menit | Normal refresh |
| `auth-reset` | `POST .../request-password-reset` | IP | 3 | 15 menit | Anti email bombing |
| `auth-verify` | `POST .../request-verification` | IP | 3 | 15 menit | Anti email bombing |
| `post-create` | `POST /api/collections/posts/records` | user+IP | 20 | 1 jam | Penulis/admin |
| `post-update-delete` | `PATCH/DELETE /api/collections/posts/records/*` | user+IP | 60 | 1 jam | — |
| `comment-create` | `POST /api/collections/comments/records` | user+IP | 10 / 60 | 1 menit / 1 jam | Dua aturan (burst + harian) |
| `comment-delete` | `DELETE /api/collections/comments/records/*` | user+IP | 30 | 1 menit | — |
| `reaction-write` | `POST/PATCH/DELETE /api/collections/reactions/records*` | user+IP | 120 | 1 menit | Toggle like |
| `taxonomy-write` | `POST/PATCH/DELETE` categories/tags | user+IP | 60 | 1 jam | Tag create oleh penulis |
| `media-upload` | `POST /api/collections/media/records` | user+IP | 20 | 1 jam | Maks 5 MB/file |
| `settings-write` | `PATCH` site_settings/pages/editor_settings | user+IP | 30 | 1 jam | Admin |
| `contact-create` | `POST /api/collections/contact_messages/records` | IP | 3 | 1 jam | Saat diaktifkan |
| `newsletter-subscribe` | `POST /api/collections/subscribers/records` | IP | 3 | 1 jam | Saat diaktifkan |
| `list-posts` | `GET /api/collections/posts/records` | IP | 600 | 1 menit | Opsional, anti-scraping |

Catatan:

- `auth-login-account` hanya jika middleware dapat membaca `identity` dari body; buffer body lalu kembalikan sebelum handler.
- Untuk `user+IP`, pengguna anonim pada endpoint tulis ditolak oleh PocketBase (`401`) sebelum limit dihitung.
- Admin tidak dikecualikan, tetapi limit-nya cukup tinggi. Jangan membuat bypass berdasarkan header/query.
- `Retry-After` dihitung dari waktu token berikutnya tersedia, dibulatkan ke atas.

### 10.6 Middleware (Deskripsi Implementasi)

1. Daftarkan middleware global dengan prioritas **setelah** auth loader (`-1020`) dan **sebelum** rate limit bawaan (`-1000`), misalnya `-1005`, agar `e.Auth` tersedia.
2. Cocokkan method + path ke aturan pertama.
3. Bentuk key sesuai scope.
4. Panggil limiter; set header `X-RateLimit-*`.
5. Jika ditolak:
   - set `Retry-After`,
   - catat metrik `rate_limit.blocked{rule=...}`,
   - kembalikan `429` dengan body §10.1.
6. Jika tidak ada aturan cocok, lanjutkan (`e.Next()`).
7. Jangan membaca body kecuali untuk `auth-login-account`; jika membaca, restore `e.Request.Body`.

Contoh pseudocode:

```go
if !limiter.Allow(rule.ID+"|"+key, rule.Limit, rule.Window) {
    w.Header().Set("Retry-After", strconv.Itoa(retrySeconds))
    return e.JSON(http.StatusTooManyRequests, rateLimitBody(retrySeconds))
}
return e.Next()
```

### 10.7 Verifikasi Rate Limit

**Unit**

- 10 request diizinkan, request ke-11 ditolak.
- Setelah `window/limit` detik, satu token kembali.
- Key berbeda tidak saling memengaruhi.
- Bucket lama dibersihkan.

**Integrasi**

- Login ke-11 → `429`, ada `Retry-After`, lalu berhasil setelah waktu tunggu.
- Komentar ke-11 dalam 1 menit → `429`; komentar dari user lain tetap boleh.
- Reaction 121 dalam 1 menit → `429`; tidak ada duplikasi reaction.
- Upload ke-21 dalam 1 jam → `429`.
- `X-Forwarded-For` palsu tidak mengubah key bila `trustedProxy` tidak dikonfigurasi.

**Beban**

- k6/Artillery: 100 VU login dan 500 VU list posts; pastikan `429` terkontrol dan tidak ada kebocoran memori.
- Pantau p95 latency middleware < 1 ms (in-memory).

**Manual**

```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://127.0.0.1:8090/api/collections/users/auth-with-password \
    -H "Content-Type: application/json" \
    -d '{"identity":"demo@blogku.com","password":"wrong"}'
done
```

### 10.8 Logging & Monitoring

- Log terstruktur: `rule`, `status`, `retry_after`, `key_hash` (bukan IP/identity mentah), `path`.
- Jangan log password, token, atau isi body.
- Alert bila `429` dari `auth-login` naik > 5x baseline atau `media-upload` > 3x baseline.
- Dashboard metrik: request allowed/blocked per rule, top key hash, p95 latency.

---

## 11. Keamanan Deployment

- CSP:
  `default-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; img-src 'self' data: https:; media-src 'self' https:; frame-src https://www.youtube.com https://player.vimeo.com`
- HSTS `max-age=63072000; includeSubDomains; preload`.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- CORS origin eksplisit, tanpa wildcard.
- `--trustedProxy` diisi hanya dengan IP reverse proxy; tanpa itu `X-Forwarded-For` diabaikan.
- Secret via environment (`PB_ENCRYPTION_KEY`), bukan collection/repo.
- Backup `pb_data/` otomatis dan uji restore.
- Audit log untuk aksi admin.
- Jalankan `govulncheck` dan `npm audit` di CI.

---

## 12. Realtime (Opsional)

- `comments` dan `reactions` boleh berlangganan SSE.
- Realtime bukan pengganti refetch: setelah reconnect, refetch halaman aktif.
- Rate limit tetap berlaku pada koneksi dan pesan.
- Jika realtime menambah kompleksitas, tunda sampai CRUD stabil.

---

## 13. Urutan Implementasi

1. Buat koleksi + index + seed singleton (`site_settings`, `editor_settings`, `pages`).
2. Terapkan rules §6.3 dan hooks §6.4.
3. Implementasikan `PocketBaseSource` + `lib/pb.ts` + error normalization.
4. Tambahkan method auth yang hilang (`register`, reset password).
5. Migrasikan settings/pages/editor settings.
6. Migrasikan posts/taxonomies/media.
7. Migrasikan comments/reactions + counter.
8. Aktifkan rate limit (built-in + middleware) dan uji §10.7.
 9. Hapus mock fallback otomatis (mode Mock tetap eksplisit untuk dev/demo) dan local user override.
10. Regression seluruh DoD frontend.

---

## 14. Definition of Done

- [ ] `PocketBaseSource` menggantikan `MockSource` tanpa mengubah komponen UI.
- [ ] Seluruh 36 method `DataSource` terimplementasi dan bertipe.
- [ ] `users.role` default `subscriber`; non-admin tidak bisa mengubah role (diuji).
- [ ] Admin terakhir tidak bisa diturunkan/dihapus.
- [ ] `email` tidak pernah bocor ke publik (diuji dengan akun guest).
- [ ] Semua collection rules diuji positif/negatif untuk guest/subscriber/penulis/admin.
- [ ] Kategori hanya admin; tag create penulis/admin; tag update/delete admin.
- [ ] Sanitasi server aktif untuk post/page/comment; SVG ditolak.
- [ ] Upload 5 MB, MIME allowlist, URL media benar.
- [ ] `likeCount`, `commentCount`, `postCount`, `readingTime` konsisten setelah create/delete.
- [ ] `429` memiliki `Retry-After`; UI menampilkan pesan dan menonaktifkan submit.
- [ ] Rate limit login/comment/reaction/upload terbukti dengan uji §10.7.
- [ ] `--trustedProxy` dikonfigurasi; spoof `X-Forwarded-For` tidak berpengaruh.
- [ ] CSP/HSTS aktif dan terverifikasi.
- [ ] Tidak ada impor mock data dari komponen.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` bersih.
- [ ] Dokumen ini dan `docs/README.md` diperbarui.

---

## 15. Keputusan & Risiko

| Keputusan | Dampak |
| :--- | :--- |
| `cover`/`avatar`/`image` sebagai URL teks, bukan file field | Mendukung URL eksternal dan file upload; validasi domain wajib |
| `users` list publik (non-subscriber) | Profil author berfungsi; email harus tetap tersembunyi |
| Bookmark tetap lokal di MVP | Tidak ada sinkronisasi lintas perangkat; dapat ditambahkan nanti |
| Newsletter/contact ditunda | Form tetap mock; rate limit disiapkan untuk masa depan |
| Rate limit in-memory | Cukup untuk single binary; multi-instance butuh Redis/edge |
| Rate limit login per akun (hash identity) | Perlu membaca body; implementasi harus restore body |
| Komentar draft tidak publik | Mencegah kebocoran diskusi pada post draft |

---

## 16. Referensi

- `frontend/src/api/source.ts` — kontrak `DataSource`.
- `frontend/src/api/types.ts` — tipe domain.
- `frontend/src/lib/validation.ts` — batas validasi klien.
- `frontend/src/lib/permissions.ts` — matriks izin UI.
- `frontend/src/stores/auth.ts` — alur auth saat ini.
- `docs/features/01-auth-and-rbac.md` s/d `08-blogku-branding-and-taxonomies-crud.md`.
- PocketBase docs: Collections, API rules, Go hooks, Rate limits, Going to production.
