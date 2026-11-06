# Post Status: Publish, Draft & Private

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Spec — menunggu approval |
| **Fase Arsitektur** | Fase 2 (PocketBase + single binary) |
| **Izin Minimum (RBAC)** | Penulis (author) untuk status miliknya; Admin untuk semua |
| **Komponen Utama** | [EditorPage.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/EditorPage.vue), [DashboardPage.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/DashboardPage.vue), [PostPage.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/PostPage.vue), [pocketbase.source.ts](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/api/pocketbase.source.ts), [main.go](file:///c:/Users/Administrator/Desktop/ncmaz-clone/backend/main.go) |
| **Tanggal** | 2026-11-02 |

> Dokumen ini adalah **spec/desain**, bukan catatan implementasi. Implementasi baru dimulai setelah bagian **13. Keputusan yang Membutuhkan Approval** disetujui.

---

## 1. Ringkasan & Motivasi

Saat ini editor hanya punya satu aksi simpan ke server: **Publish**. Padahal data model internal sudah memiliki `status: 'draft' | 'published'` dan halaman dashboard sudah punya tab Drafts, tetapi penulis tidak bisa menyimpan draft/private ke server dari editor — semua penyimpanan server selalu `status: 'published'`.

Fitur ini menambahkan tiga status yang bisa dipilih penulis:

1. **Published** — tampil publik (perilaku sekarang).
2. **Draft** — karya belum selesai; hanya penulis (dan admin) yang bisa melihat.
3. **Private** — karya selesai tetapi sengaja tidak dipublikasikan; hanya penulis (dan admin) yang bisa melihat.

Perubahan ini menyentuh **core**: schema PocketBase, aturan RBAC (list/view/create/update/delete), kontrak `DataSource`, dashboard, dan tampilan artikel. Karena itu spec ini dibuat sebelum implementasi.

---

## 2. Definisi Status

| Status | Arti untuk penulis | Terlihat publik? | Terlihat penulis? | Terlihat admin? | Muncul di daftar publik? |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `published` | Artikel selesai & tayang | Ya | Ya | Ya | Ya |
| `draft` | Masih dikerjakan | Tidak | Ya (miliknya) | Ya | Tidak |
| `private` | Selesai, sengaja tidak tayang | Tidak | Ya (miliknya) | Ya | Tidak |

**Draft vs Private**: keduanya sama-sama tidak publik. Bedanya semantik/UI: Draft = pekerjaan belum selesai, Private = selesai tapi tidak untuk publik. Ini mengikuti pola WordPress. Tidak ada perbedaan aturan akses antara keduanya.

---

## 3. Kondisi Saat Ini (Hasil Audit Kode)

| Area | Temuan | Lokasi |
| :--- | :--- | :--- |
| Tipe frontend | `PostStatus` sudah `'published' \| 'draft'`, belum ada `private` | `frontend/src/api/types.ts:1` |
| Schema backend | `posts.status` hanya berisi `draft`, `published` | `backend/main.go:367` |
| Aturan baca posts | `status = "published" \|\| @request.auth.role = "admin" \|\| author = @request.auth.id` | `backend/main.go:354` |
| Editor | Selalu mengirim `status: 'published'` saat create/update | `frontend/src/pages/EditorPage.vue:399,416` |
| Mapping PocketBase | Status selain `draft` dipaksa `published` | `frontend/src/api/pocketbase.source.ts:220,327` |
| Mock source | Sudah meneruskan `input.status`, filter default `published` | `frontend/src/api/mock.source.ts:217,301` |
| Dashboard penulis | Tab hanya `published` dan `draft` | `frontend/src/pages/DashboardPage.vue:29-33` |
| Admin dashboard | Hanya mengambil `published` + `draft` | `frontend/src/pages/admin/AdminDashboardPage.vue:50-66` |
| Komentar | View rule sudah memperhitungkan status post; create rule hanya cek login | `backend/main.go:417-420` |
| Reaksi | Create rule hanya cek login (belum cek status post) | `backend/main.go:446` |
| View counter | `POST /track-view` menaikkan counter tanpa cek status/visibilitas | `backend/main.go:97-117` |
| `postCount` author | Menghitung **semua** post (termasuk draft) | `backend/main.go:1181` |
| Local draft | Autosave localStorage terpisah dari status server | `frontend/src/stores/draft.ts` |

**Kesimpulan**: pondasi status sudah ada, tetapi belum diekspos ke UI dan belum konsisten di layer data/RBAC.

---

## 4. Tujuan, Non-Goals, Anti-Goals

### Tujuan
- Penulis bisa memilih **Publish / Draft / Private** saat menyimpan dari editor.
- Draft & private tidak muncul di halaman publik (home, kategori, tag, search, author, related posts).
- Penulis bisa melihat daftar dan pratinjau draft/private miliknya; admin bisa melihat semuanya.
- Penulis bisa mengubah status kapan saja (publish → draft/private dan sebaliknya).
- Status bertahan di backend (bukan hanya localStorage) dan konsisten antara mock & PocketBase.

### Non-Goals (fase ini)
- Penjadwalan publish (`publishedAt`/scheduled).
- Password-protected post atau secret link publik untuk private.
- Kolaborasi multi-author / review workflow.
- Riwayat revisi.
- Perubahan sistem komentar (nested) atau reaksi sebagai fitur baru.

### Anti-Goals (dianggap gagal jika terjadi)
- Draft/private bisa diakses publik lewat list, search, atau URL langsung.
- Penulis bisa melihat draft/private milik penulis lain.
- Status hilang saat edit ulang (mis. private berubah jadi published diam-diam).
- Komentar/reaksi baru bisa dibuat pada post yang tidak published oleh pengguna yang tidak berhak.
- Migrasi merusak data lama atau mengubah status post yang sudah ada.

---

## 5. Pendekatan yang Dipertimbangkan

### Opsi A — Perluas enum `status` (rekomendasi)
Tambah `private` ke `posts.status`, pakai `status` yang sama untuk rules dan filter.

- **Kelebihan**: perubahan kecil, memakai pondasi yang sudah ada, satu konsep untuk UI & API, query filter sederhana.
- **Kekurangan**: draft & private tidak bisa dibedakan aturan aksesnya (memang tidak perlu).
- **Risiko**: perlu migrasi nilai SelectField di database yang sudah berjalan.

### Opsi B — Pisahkan `status` dan `visibility`
`status: draft|published` + `visibility: public|private`.

- **Kelebihan**: bisa merepresentasikan draft+private (kombinasi).
- **Kekurangan**: dua field harus dijaga konsisten, rules jadi lebih kompleks, UI membingungkan.
- **Kesimpulan**: over-engineering untuk kebutuhan saat ini.

### Opsi C — Tambah `publishedAt`/scheduling sekaligus
- **Kesimpulan**: di luar scope; ditunda.

**Rekomendasi: Opsi A.**

---

## 6. Desain Data & Kontrak

### 6.1 Tipe frontend
```ts
// frontend/src/api/types.ts
export type PostStatus = 'published' | 'draft' | 'private'
```
`Post`, `PostInput`, dan `PostFilter` otomatis mengikuti karena sudah memakai `PostStatus`.

### 6.2 Schema backend
```go
posts.Fields.Add(&core.SelectField{
    Name:      "status",
    Values:    []string{"draft", "published", "private"},
    MaxSelect: 1,
    Required:  true,
})
```
Migrasi idempoten untuk database lama:
```go
// ensurePostStatusField(app): no-op jika "private" sudah ada di Values,
// jika belum: ambil SelectField "status", set Values baru, saveCollection.
```

### 6.3 Mapping PocketBase
```ts
function statusToPb(status: PostStatus | undefined): PostStatus {
  return status === 'draft' || status === 'private' ? status : 'published'
}
// mapPost: status = record.status jika valid, fallback 'published'
```

### 6.4 Default
- Create/update tanpa `status` → `published` (kompatibel dengan perilaku lama).
- `listPosts` tanpa `filter.status` → `published` (sudah berlaku).

---

## 7. RBAC & Aturan PocketBase

### 7.1 Matriks akses

| Aksi | Anonim | Subscriber | Penulis (bukan pemilik) | Penulis (pemilik) | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Lihat post published | Ya | Ya | Ya | Ya | Ya |
| Lihat draft/private | Tidak | Tidak | Tidak | Ya | Ya |
| Buat post | Tidak | Tidak | Ya | Ya | Ya |
| Edit/hapus post sendiri | Tidak | Tidak | Tidak | Ya | Ya |
| Edit/hapus post siapa pun | Tidak | Tidak | Tidak | Tidak | Ya |
| Ubah status post sendiri | Tidak | Tidak | Tidak | Ya | Ya |
| Komentar/reaksi pada published | Tidak | Ya | Ya | Ya | Ya |
| Komentar/reaksi pada draft/private | Tidak | Tidak | Tidak | Ya | Ya |

### 7.2 Rules posts (tidak berubah, sudah mendukung private)
```
List/View : status = "published" || @request.auth.role = "admin" || author = @request.auth.id
Create    : @request.auth.role = "admin" || @request.auth.role = "penulis"
Update    : @request.auth.role = "admin" || author = @request.auth.id
Delete    : @request.auth.role = "admin" || author = @request.auth.id
```

### 7.3 Rules komentar (perketat create)
```
View   : post.status = "published" || @request.auth.role = "admin" || post.author = @request.auth.id
Create : @request.auth.id != "" && (post.status = "published" || post.author = @request.auth.id || @request.auth.role = "admin")
Update : @request.auth.role = "admin" || author = @request.auth.id
Delete : @request.auth.role = "admin" || author = @request.auth.id
```

### 7.4 Rules reaksi (perketat create)
```
Create : @request.auth.id != "" && (post.status = "published" || post.author = @request.auth.id || @request.auth.role = "admin")
```
View/Update/Delete tetap seperti sekarang (`user = auth || admin`).

### 7.5 View counter
`POST /track-view` hanya menaikkan counter jika post `status = "published"`. Draft/private preview tidak menambah view. Respons untuk post non-published: `404` (agar tidak membocorkan keberadaan draft/private).

### 7.6 `postCount` penulis
Ubah `recomputePostCount` agar menghitung hanya `status = "published"`, supaya angka di profil author ("published") akurat dan tidak membocorkan jumlah draft/private. **Catatan**: ini juga mengubah perilaku draft saat ini; perlu approval (lihat §13).

---

## 8. UI/UX

### 8.1 Editor (`/editor`, `/editor/:id`)
- Autosave lokal tetap berjalan (pemulihan crash), label tombol lokal diganti menjadi **Save locally** agar tidak rancu dengan draft server.
- Tombol aksi utama menjadi split button:
  - Klik utama → **Publish** (default).
  - Chevron → menu: **Publish**, **Save as draft**, **Save as private**.
- Saat mengedit post yang sudah ada, badge status menampilkan status saat ini (`Published` / `Draft` / `Private`).
- Setelah simpan:
  - `published` → redirect `/post/:slug`.
  - `draft`/`private` → redirect `/dashboard` (tab yang sesuai) + toast.
- Jika mengubah post `published` menjadi `draft`/`private`, tampilkan konfirmasi "Artikel akan disembunyikan dari publik".
- Validasi: draft/private tetap memakai `draftSchema` (title/excerpt/content/kategori wajib) karena schema backend saat ini mewajibkan field tersebut. Penyimpanan draft yang belum lengkap tetap bisa lewat **Save locally**.

### 8.2 Dashboard penulis (`/dashboard`)
- Tiga tab: **Published**, **Drafts**, **Private**.
- Fetch paralel `listPosts` dengan `filter.status` masing-masing.
- Aksi edit/hapus per status; tab Private punya ikon Lock.
- Stat card menambahkan jumlah Private.

### 8.3 Halaman artikel (`/post/:slug`)
- `published` → tampilan normal.
- `draft`/`private` + viewer adalah pemilik/admin → tampilan **preview**: banner status, share/like/bookmark/comments disembunyikan atau dinonaktifkan.
- Viewer lain → state "not found" yang sudah ada (backend mengembalikan 404).
- Related posts, canonical, dan metadata publik tidak ditampilkan untuk draft/private.

### 8.4 Admin dashboard
- Sertakan post `private` pada agregasi.
- Tambahkan metric/tab Private agar admin bisa memoderasi semua status.
- Admin tetap bisa membuka & mengedit semua status.

### 8.5 Daftar publik
Tidak ada perubahan UI. Semua pemanggilan `listPosts` tanpa `filter.status` sudah default `published` (PocketBase & mock), sehingga draft/private otomatis tidak muncul.

---

## 9. Perubahan per Layer (Rencana File)

| Layer | File | Perubahan |
| :--- | :--- | :--- |
| Types | `frontend/src/api/types.ts` | `PostStatus` + `'private'` |
| Data | `frontend/src/api/pocketbase.source.ts` | `statusToPb`, `mapPost` mendukung private |
| Data | `frontend/src/api/mock.source.ts` | Verifikasi filter/create/update private |
| Editor | `frontend/src/pages/EditorPage.vue` | split button + menu status, `savePost(status)`, redirect sesuai status, badge status |
| Dashboard | `frontend/src/pages/DashboardPage.vue` | tab Private, fetch, stat, aksi |
| Post view | `frontend/src/pages/PostPage.vue` | preview banner + sembunyikan aksi publik untuk non-published |
| Admin | `frontend/src/pages/admin/AdminDashboardPage.vue` | agregasi & filter private |
| Backend schema | `backend/main.go` | SelectField + migrasi idempoten `ensurePostStatusField` |
| Backend RBAC | `backend/main.go` | perketat create komentar/reaksi |
| Backend counter | `backend/main.go` | `track-view` cek published; `postCount` hanya published |
| Tests | `frontend/src/api/pocketbase.source.test.ts`, `mock.source.test.ts` | mapping/filter private |
| Tests | `backend/*_test.go` | schema/migrasi & guard status |
| Docs | `docs/features/21-...md`, `docs/README.md`, `CHANGELOG.md` | spec + catatan implementasi |

---

## 10. Edge Cases & Migrasi

1. **Database lama** — status existing `draft`/`published` tetap valid; migrasi hanya menambah nilai `private`. Tidak ada perubahan data.
2. **Post published → draft/private** — hilang dari daftar publik & URL publik (404 untuk non-pemilik). Komentar/reaksi lama tetap tersimpan tetapi tidak terlihat publik.
3. **Draft/private → published** — muncul kembali di daftar publik; komentar/reaksi lama kembali terlihat.
4. **Slug** — tetap unik lintas status (index `idx_posts_slug`), sehingga private tidak "menabrak" published.
5. **Post diedit penulis lain** — tetap ditolak oleh UpdateRule (`author = auth`).
6. **Admin mengedit post penulis** — diizinkan; perubahan status tercatat lewat `updatedAt`.
7. **Local draft** — tetap terpisah; setelah "Save as draft" server berhasil, local draft terkait dihapus (perilaku yang sama seperti publish sekarang).
8. **Race condition** — dua tab mengubah status; yang terakhir menang (optimistic, tanpa locking). Diterima untuk fase ini.
9. **Rate limit** — tetap berlaku pada aksi simpan.
10. **Seed/demo data** — tidak diubah; tidak ada post private default.

---

## 11. Testing & Verifikasi

### Unit test frontend
- `statusToPb`: `published`→`published`, `draft`→`draft`, `private`→`private`, `undefined`→`published`.
- `mapPost`: record `private` → `Post.status === 'private'`.
- Mock source: create/update dengan status private; `listPosts` default hanya published; filter status private mengembalikan private.
- Editor: tidak ada test komponen saat ini; verifikasi manual.

### Backend test
- `ensurePostStatusField` menambahkan `private` pada collection lama (idempoten).
- Guard `track-view` menolak post non-published.
- (Opsional) test rule string tidak mudah diuji unit; verifikasi manual via API.

### Manual test matrix
| Skenario | Ekspektasi |
| :--- | :--- |
| Penulis simpan Draft | Muncul di tab Drafts; tidak di home/search/URL publik |
| Penulis simpan Private | Muncul di tab Private; tidak publik |
| Penulis buka preview Draft/Private | Tampil banner; share/like/komentar nonaktif |
| Penulis lain buka URL Draft/Private | 404 |
| Admin buka Draft/Private | Bisa melihat |
| Publish Draft | Muncul publik; hilang dari tab Drafts |
| Unpublish Published → Draft | Konfirmasi; hilang dari publik |
| Anonim komentar/reaksi post private | Ditolak |
| Penulis komentar post private sendiri | Diizinkan |
| `POST /track-view` post draft | 404, counter tidak naik |
| Author profile postCount | Hanya menghitung published |
| Build & deploy | Binary jalan; migrasi otomatis saat boot |

### Quality gate
`npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `go test ./...`.

---

## 12. Rollout

1. Implementasi backend + migrasi + frontend dalam satu branch.
2. Jalankan quality gate.
3. Build single binary Linux (`VITE_USE_POCKETBASE=true`, `VITE_PB_URL=""`).
4. Deploy: upload ke `/tmp`, backup binary lama, swap, restart.
5. Verifikasi produksi: SPA 200, health 200, buat post draft/private dari akun penulis, cek tidak muncul publik, cek preview sebagai pemilik, cek admin melihat.
6. Migrasi schema berjalan otomatis saat boot pertama; tidak perlu downtime tambahan selain restart.

Rollback: kembalikan binary `.prev-<timestamp>`; nilai `private` di database lama tetap aman karena hanya nilai tambahan pada SelectField.

---

## 13. Keputusan yang Membutuhkan Approval

| # | Keputusan | Rekomendasi |
| :--- | :--- | :--- |
| 1 | Private hanya bisa dilihat penulis + admin (bukan link publik) | Ya, setuju |
| 2 | Draft dan Private punya aturan akses sama; beda hanya semantik/UI | Ya, setuju |
| 3 | Halaman preview draft/private menyembunyikan share/like/komentar | Ya, setuju |
| 4 | `postCount` profil author dihitung dari published saja | Ya (perubahan perilaku draft saat ini) |
| 5 | `track-view` hanya untuk published | Ya |
| 6 | Tombol lokal "Save draft" diganti label "Save locally" | Ya |
| 7 | Draft/private tetap wajib lolos validasi lengkap (judul, excerpt, konten, kategori) | Ya, karena schema backend mewajibkan |
| 8 | Tambah tab Private di dashboard penulis & admin | Ya |

Setelah tabel ini disetujui (atau dikoreksi), implementasi dapat dimulai. Perubahan pada #4 dan #7 paling berdampak ke perilaku pengguna saat ini, jadi mohon diprioritaskan untuk dikonfirmasi.
