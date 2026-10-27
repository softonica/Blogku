# 17 - Media Library (Grouped by Year > Month)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Implemented |
| **Fase Arsitektur** | Fase 2 (PocketBase) + mock |
| **Izin Minimum (RBAC)** | Admin (`manage_settings`; parent route `/admin` = `adminOnly`) |
| **Komponen Utama** | [`frontend/src/pages/admin/AdminMediaLibraryPage.vue`](../../frontend/src/pages/admin/AdminMediaLibraryPage.vue), [`frontend/src/lib/media.ts`](../../frontend/src/lib/media.ts), [`frontend/src/api/source.ts`](../../frontend/src/api/source.ts), [`frontend/src/api/pocketbase.source.ts`](../../frontend/src/api/pocketbase.source.ts), [`frontend/src/api/mock.source.ts`](../../frontend/src/api/mock.source.ts) |
| **Tanggal Ditambahkan** | 2026-10-27 |

---

## 1. Ringkasan & Motivasi

Gambar yang di-upload tersebar di record koleksi `media` tanpa halaman untuk
menelusurinya. Penulis/admin harus mengingat URL atau membuka setiap post untuk
menemukan kembali sebuah gambar.

Fitur ini menambahkan **Media Library** di admin yang:

1. Menampilkan semua media yang pernah di-upload.
2. **Mengelompokkan per Tahun → Bulan** berdasarkan `created` record, sehingga
   mudah ditelusuri kronologis.
3. Menyediakan pencarian nama file, salin URL, dan buka gambar di tab baru.
4. Menyembunyikan file varian internal (`thumb`/`medium`) agar tidak muncul
   sebagai duplikat.

> Catatan: PocketBase menyimpan file fisik di
> `pb_data/storage/<collectionId>/<recordId>/<file>` dan path itu dikelola
> internal PocketBase. "Pengelompokan Tahun > Bulan" diterapkan pada **UI
> library** (berbasis timestamp record), bukan dengan memindahkan folder fisik.

## 2. Alur Pengguna (User Flow)

1. Admin membuka **Admin → Content → Media Library**
   (`/admin/media-library`).
2. Halaman memuat 48 media terbaru (`sort: -created`) dan mengelompokkannya:
   header tahun (mis. `2026`) lalu sub-header bulan (`October 2026`) dengan
   jumlah file.
3. Admin mengetik di kolom pencarian → daftar difilter (debounce 350 ms) dan
   dimulai ulang dari halaman 1.
4. Hover sebuah tile → tombol **Copy URL** (clipboard + fallback) dan **Open**
   (`target="_blank"`, `rel="noopener noreferrer"`).
5. Jika masih ada halaman berikutnya, tombol **Muat lebih banyak** mengambil
   halaman selanjutnya dan menambahkannya ke grup yang sudah ada.

## 3. Arsitektur & Komponen

```
AdminMediaLibraryPage.vue
  ├─ getDataSource().listMedia({ page, perPage: 48, search })
  │    ├─ PocketBaseSource.listMedia → collection('media').getList(filter, sort)
  │    └─ MockSource.listMedia → localStorage ncmaz.mock.media.v1
  ├─ lib/media.ts
  │    ├─ groupMediaByMonth(items) → YearGroup[] → MonthGroup[]
  │    ├─ isVariantFileName(name)  → sembunyikan varian internal
  │    ├─ mediaDisplayName(name)   → nama ramah (strip suffix random PB)
  │    └─ formatMediaDate(iso)     → "20 Oct 2026"
  └─ UI: search, year/month sections, grid tile, copy/open, load more
```

File terkait:

- `frontend/src/lib/media.ts` + `media.test.ts` — grouping & helper murni.
- `frontend/src/pages/admin/AdminMediaLibraryPage.vue` — UI library.
- `frontend/src/api/types.ts` — `MediaItem`, `ListMediaParams`.
- `frontend/src/api/source.ts` — kontrak `listMedia`.
- `frontend/src/api/pocketbase.source.ts` — implementasi produksi.
- `frontend/src/api/mock.source.ts` + `mock-data/media.ts` — implementasi mock
  (seed 8 item dengan tanggal lintas bulan/tahun).
- Router `admin-media-library` + item sidebar **Media Library**.

## 4. Kontrak Data & TypeScript Schema

```typescript
export interface MediaItem {
  id: string
  url: string
  name: string        // nama file tersimpan (bisa mengandung suffix random PB)
  ownerId?: string
  createdAt: string   // ISO timestamp → dasar grouping tahun/bulan
}

export interface ListMediaParams {
  page?: number       // default 1
  perPage?: number    // default 48, maksimum 100
  search?: string     // substring nama file / alt
}
```

Filter PocketBase pada `listMedia`:

```
file != "" && file !~ "ncmaz_thumb_" && file !~ "ncmaz_medium_"
```

Penamaan varian dari pipeline gambar:
`ncmaz-thumb-<base>.webp` dan `ncmaz-medium-<base>.webp`; setelah normalisasi
PocketBase menjadi `ncmaz_thumb_<base>_<random>.webp` dan
`ncmaz_medium_<base>_<random>.webp` — sehingga bisa difilter dengan aman tanpa
menyembunyikan file pengguna biasa.

`groupMediaByMonth` mengabaikan tanggal tidak valid dan mengembalikan tahun
serta bulan terbaru lebih dulu.

## 5. Keamanan & Otorisasi

- Route berada di bawah `/admin` (parent `adminOnly: true`), dan child memakai
  `permission: 'manage_settings'` — hanya role `admin`.
- Daftar media memakai `ListRule` koleksi `media` yang sudah publik; tidak ada
  endpoint baru di backend.
- Render hanya `img src` dan `a href` dari respons API; tidak ada HTML mentah.
  Tautan keluar memakai `rel="noopener noreferrer"`.
- Copy URL memakai Clipboard API dengan fallback `textarea` + `execCommand`
  (tidak mengeksekusi konten apa pun).
- Tidak ada aksi hapus pada iterasi ini (menghindari orphan file varian);
  penghapusan media tetap dilakukan lewat PocketBase admin bila diperlukan.

## 6. Panduan Penggunaan (UI/UX)

- Buka `/admin/media-library`.
- Scroll untuk melihat kelompok **2026 → October 2026, July 2026**, lalu
  **2025 → December 2025, November 2025**.
- Gunakan kolom "Cari nama file…" untuk memfilter; hasil tetap dikelompokkan.
- Hover tile → **Copy URL** (notifikasi "Image URL copied.") atau **Open**.
- Tekan **Muat lebih banyak** untuk 48 item berikutnya.

## 7. Pengujian & Verifikasi

Unit test (`frontend/src/lib/media.test.ts`):

- `isVariantFileName` mendeteksi `ncmaz-thumb-*`, `ncmaz_medium_*`, dan format
  lama `.thumb.webp`; tidak salah mendeteksi `thumbnail_*` / `my_thumb_nail.jpg`.
- `mediaDisplayName` membuang suffix random PocketBase.
- `groupMediaByMonth` mengurutkan tahun/bulan menurun, menghitung total, dan
  mengabaikan tanggal invalid.
- `formatMediaDate` aman untuk tanggal invalid.

Verifikasi yang dijalankan:

```bash
cd frontend
npm run typecheck   # lulus
npm run lint        # lulus
npm run test        # 15 files / 134 tests passed
npm run build       # sukses
```

Smoke test browser (Playwright + mock source):

- `/admin/media-library` menampilkan tahun `2026`, `2025`; bulan
  `October 2026`, `July 2026`, `December 2025`, `November 2025`; 8 tile.
- Pencarian `workspace` → 1 hasil ("workspace setup").
- `/admin/media-settings` memuat input upload/dimensi/kualitas.
- Sidebar berisi **Media Library** dan **Media Settings**; 0 console error.
