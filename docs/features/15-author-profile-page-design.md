# 15 - Author & Profile Page Design (align Ncmaz Faust)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Draft |
| **Referensi** | https://ncmaz-faust-delta.vercel.app/author/demo/ |
| **Komponen Utama** | [`frontend/src/pages/AuthorPage.vue`](../../frontend/src/pages/AuthorPage.vue), [`frontend/src/pages/ProfilePage.vue`](../../frontend/src/pages/ProfilePage.vue), [`frontend/src/components/ui/AuthorSocialLinks.vue`](../../frontend/src/components/ui/AuthorSocialLinks.vue), `backend/main.go` (`ensureUsersCollection`, `seedUsers`), `frontend/src/api/types.ts` |
| **Tanggal Ditambahkan** | 2026-10-27 |

---

## 1. Ringkasan & Motivasi

Menyelaraskan desain dan data halaman author/profile di Blogku agar mirip
halaman author demo Ncmaz Faust:
- **Hero**: banner cover besar, avatar (bulat, overlap), nama, badge @username,
  bio, ikon sosial media, statistik (posts / published), tombol Follow.
- **Tabs**: Articles / Favorites list / Bookmarks (Articles aktif; Favorites &
  Bookmarks placeholder).
- **Sort**: dropdown "Newest to oldest / Oldest to newest / Most viewed".
- **Data**: tambah field author `coverBanner` dan `socials` (facebook, youtube,
  tiktok, github, buymeacoffee) agar profil bisa menampilkan ikon sosial.

## 2. Arsitektur & Komponen

```
AuthorPage.vue / ProfilePage.vue
   └─ AuthorSocialLinks.vue (render ikon sosial, skip bila kosong)
   └─ usePagedPosts(getSort, getFilter) → grid + pagination
   └─ backend: users.collections {coverBanner url, socials json}
              + seedUsers (demo author: Jenny Wilson + cover + socials)
```

- `usePagedPosts` diperluas menerima `getSort` (getter) agar sort bisa berubah
  secara reaktif tanpa membuat ulang composable.
- `AuthorSocialLinks` menggunakan ikon lucide (`Facebook`, `Youtube`,
  `Github`, `Coffee`) + inline SVG untuk Tiktok.

## 3. Kontrak Data & TypeScript Types

- `User` bertambah (semua opsional, backward-compatible):
  ```ts
  coverBanner?: string
  socials?: { facebook?: string; youtube?: string; tiktok?: string;
              github?: string; buymeacoffee?: string }
  ```
- Backend `users` collection:
  - `coverBanner` → `URLField`
  - `socials` → `JSONField`
- `mapUser` (pocketbase.source.ts) memetakan kedua field.

## 4. Otorisasi & Keamanan

- Ikon sosial dirender sebagai `target="_blank" rel="noopener noreferrer"`, dan
  hanya `au href` yang terisi.
- Nilai URL sosial/cover disanitasi via `sanitizeUrl` bila di-edit (ProfilePage).
- Tidak ada endpoint baru; hanya perluasan schema + tampilan.

## 5. Panduan Penggunaan (UI/UX)

- Buka `/author/demo` → hero + tabs + grid (seperti referensi).
- `/profile` → hero serupa + form edit: upload avatar, name, bio, **Cover
  Banner** (upload/URL) dan **Social links** (Facebook/Youtube/Tiktok/Github/
  By-me-a-coffee); tersimpan via `updateUserProfile`.

## 6. Pengujian & Verifikasi

- `cd frontend && npm run typecheck && npm run lint && npm run test`
  (105/105 lulus).
- `cd backend && go build ./... && go vet ./... && go test ./...`.
- Manual (setelah deploy): `GET /author/demo` menampilkan hero + socials jika
  field terisi; `PATCH /api/collections/users/records/{id}` tetap bekerja.
