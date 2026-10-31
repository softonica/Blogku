# 18 - Media Orphan Detection & Cleanup (refCount)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Implemented |
| **Fase Arsitektur** | Fase 2 (PocketBase) + mock |
| **Izin Minimum (RBAC)** | Admin (`manage_settings`; parent route `/admin` = `adminOnly`) |
| **Komponen Utama** | [`backend/media.go`](../../backend/media.go), [`backend/main.go`](../../backend/main.go), [`frontend/src/pages/admin/AdminMediaLibraryPage.vue`](../../frontend/src/pages/admin/AdminMediaLibraryPage.vue), [`frontend/src/lib/media.ts`](../../frontend/src/lib/media.ts), [`frontend/src/api/source.ts`](../../frontend/src/api/source.ts), [`frontend/src/api/pocketbase.source.ts`](../../frontend/src/api/pocketbase.source.ts), [`frontend/src/api/mock.source.ts`](../../frontend/src/api/mock.source.ts) |
| **Tanggal Ditambahkan** | 2026-10-31 |

---

## 1. Ringkasan & Motivasi

Media di platform ini **tidak punya relasi formal ke konten**: gambar direferensikan
sebagai string URL di dalam `posts.cover`, `posts.gallery`, `posts.content` (HTML),
`posts.content_blocks` (JSON), `users.avatar`, `users.coverBanner`, `pages.body`,
`categories.image`, dan `site_settings.logo/logoDark/favicon`. Media yang tidak
dipakai oleh field mana pun disebut **media yatim (orphan)**.

Tanpa intervensi, upload yang gagal dipakai, gambar yang dihapus dari draft, atau
varian yang ditinggalkan akan menumpuk dan membengkakkan storage. Fitur ini
menyelesaikan masalah tersebut dengan:

1. **`refCount` preventif (opsi 3)**: counter pada koleksi `media` yang dipelihara
   otomatis oleh hook backend setiap kali konten dibuat/diubah/dihapus.
2. **Scanner & cleanup backend (opsi 1)**: endpoint admin-only yang melakukan scan
   otoritatif menyeluruh (tidak bergantung pada `refCount`), sehingga aman untuk
   data lama sekalipun, lalu menghapus media yatim beserta varian-nya.

## 2. Alur Pengguna (User Flow)

1. Admin membuka **Admin → Content → Media Library** (`/admin/media-library`).
2. Kartu **"Media tidak terpakai"** menampilkan tombol **Periksa**.
3. Scanner backend bekerja 1 detik, mengembalikan jumlah file yatim + pratinjau
   8 nama file pertama.
4. Admin menekan **Hapus semua** → konfirmasi → media yatim (termasuk varian
   `thumb`/`medium`) dihapus; daftar library dimuat ulang. Notifikasi menampilkan
   jumlah yang dihapus.
5. Jika tidak ada media yatim, muncul keterangan hijau **"Tidak ada media yatim."**

## 3. Arsitektur & Komponen

```
Backend (backend/media.go)
  ├─ ensureMediaRefCountField  → tambah field media.refCount (migrasi idempotent)
  ├─ collectReferencedMediaIDs → scan semua field URL/HTML/JSON konten
  │    └─ collectMediaRefsFromText → regex /api/files/media/<id>/<file>
  │    └─ walkStrings → rekursi JSON (gallery, content_blocks)
  ├─ findOrphanMedia  → media yang URL-nya tidak direferensikan (urut terbaru)
  ├─ applyMediaRefDelta / bumpMediaRef → pemeliharaan refCount (clamp ≥ 0)
  ├─ registerMediaHooks → hooks create/update/delete pada
  │    posts, users, pages, site_settings, categories
  └─ registerMediaRoutes → POST /admin/orphan-media/scan & /cleanup (admin-only)

Frontend
  ├─ DataSource.listOrphanMedia() / cleanupOrphanMedia() → kontrak baru
  ├─ PocketBaseSource → fetch ke endpoint admin (Authorization Bearer)
  ├─ MockSource → perhitungan lokal (posts/users/pages/settings/categories)
  └─ AdminMediaLibraryPage.vue → kartu scan + cleanup
```

**Detail penting scanner**:

- Regex mengenali URL media dalam bentuk relatif maupun absolut, dengan atau
  tanpa `?query` / `#fragment`.
- **Keduanya bentuk path PocketBase**: `…/api/files/media/<id>/<file>` (nama
  koleksi) dan `…/api/files/<collectionId>/<id>/<file>` (id koleksi, mis.
  `pbc_2708086759`). `pb.files.getURL` menghasilkan bentuk id-koleksi, jadi
  keduanya wajib didukung — kegagalan pada bentuk inilah yang pernah membuat
  seluruh library terhapus (lihat CHANGELOG 2026-10-31).
- Fragment varian (`#imgv1&t=...&m=...`) berisi URL varian `thumb`/`medium`;
  ketika parent dipakai, varian-nya otomatis ikut terhitung **dipakai**.
- Varian yang parent-nya yatim ikut terhapus (mereka juga yatim).
- Draft post ikut dipindai: gambar yang hanya dipakai draft **tidak** dihapus.
- **Pengaman `orphanCleanupGuard`**: jika *semua* record media terflag yatim,
  cleanup ditolak (HTTP 409) karena itu hampir pasti kegagalan deteksi
  referensi, bukan peluang bersih-bersih yang sah.

## 4. Kontrak Data & TypeScript Schema

```typescript
export interface MediaItem {
  id: string
  url: string
  name: string
  ownerId?: string
  createdAt: string
  refCount?: number   // baru: jumlah referensi konten
}

export interface OrphanMediaItem {
  id: string
  url: string
  name: string
  createdAt: string
  refCount: number
  variant: boolean    // true jika file varian internal (thumb/medium)
}

export interface OrphanScanResult {
  total: number
  items: OrphanMediaItem[]
}

export interface OrphanCleanupResult {
  deleted: number
}
```

Response JSON endpoint backend:

```
POST /admin/orphan-media/scan    → { total, items: OrphanMediaItem[] }
POST /admin/orphan-media/cleanup → { deleted, items: OrphanMediaItem[] }
```

Normalisasi pembanding (frontend & backend): buang whitespace & fragment `#...`
(`mediaRefKey` di [`frontend/src/lib/media.ts`](../../frontend/src/lib/media.ts)).

## 5. Keamanan & Otorisasi

- Route berada di bawah `/admin` (parent `adminOnly: true`), child memakai
  `permission: 'manage_settings'` — hanya role `admin`.
- Endpoint backend **wajib autentikasi admin**: token superuser atau token
  `users` dengan `role = "admin"` (`requireAdminAPI`); selain itu 401/403.
- Hapus media memakai `app.Delete` internal (bukan API publik), tidak terkena
  aturan koleksi; hanya media yatim yang dihapus, tidak pernah menyentuh media
  yang direferensikan.
- Scanner hanya membaca field yang sudah ada; tidak ada input pengguna yang
  dieksekusi. `refCount` dipelihara lewat hook, tidak pernah diisi dari klien.
- Tidak ada HTML mentah yang dirender; UI memakai Vue escaping bawaan.

## 6. Panduan Penggunaan (UI/UX)

- Buka `/admin/media-library`, kartu **"Media tidak terpakai"** di atas daftar.
- **Periksa** → daftar jumlah + sampel nama; jika 0, keterangan hijau.
- **Hapus semua** → konfirmasi browser, lalu status proses; setelah selesai
  daftar media dimuat ulang.
- Tombol **Batal** menyembunyikan hasil scan tanpa menghapus apa pun.

## 7. Pengujian & Verifikasi

Backend (`backend/media_test.go`):

- `TestIsVariantFileName`, `TestCollectMediaRefsFromText`, `TestWalkStrings` —
  helper murni.
- `TestEnsureMediaRefCountField` — migrasi field berjalan di bootstrap.
- `TestFindOrphanMediaKeepsReferencedAndVariants` — parent + varian yang
  direferensikan via fragment tetap dipakai; hanya media tak terpakai yang
  yatim.
- `TestCleanupDeletesOrphansOnly` — cleanup menghapus orphan, media yang dipakai
  selamat, rescan = 0.
- `TestMediaRefCountHooks` — create post → `refCount` 1; ganti cover → 0; dua
  post berbagi cover → 2; hapus per post menurunkan counter.
- `TestApplyMediaRefDeltaClampsAtZero` — counter tidak pernah negatif.

Frontend:

- `mock.source.test.ts`: 0 orphan saat semua seed dipakai; upload tanpa pemakaian
  terdeteksi & bersih; gambar dalam HTML post dianggap dipakai; post dihapus →
  gambar jadi orphan.
- `pocketbase.source.test.ts`: pemetaan response scan/cleanup, header
  `Authorization: Bearer`, error 403 dilempar.

Verifikasi yang dijalankan:

```bash
cd backend
go vet ./... && go test ./...   # lulus (11+ test)
cd ../frontend
npm run typecheck                # lulus
npm run lint                     # lulus
npm run test                     # 15 files / 143 tests passed
npm run build                    # sukses
```
