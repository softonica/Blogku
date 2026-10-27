# 14 - Post View Counter

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Backend endpoint + Frontend tracking |
| **Izin Minimum (RBAC)** | Publik (siapapun yang membaca post) |
| **Komponen Utama** | [`backend/main.go`](../../backend/main.go) (`POST /track-view`), [`frontend/src/composables/useTrackView.ts`](../../frontend/src/composables/useTrackView.ts), [`frontend/src/pages/PostPage.vue`](../../frontend/src/pages/PostPage.vue), `DataSource#trackView` |
| **Tanggal Ditambahkan** | 2026-10-27 |

---

## 1. Ringkasan & Motivasi

Sebelum ini field `viewCount` pada post hanya ditampilkan (di `PostPage`,
`AdminDashboardPage`) tetapi **tidak pernah bertambah** karena tidak ada
mekanisme yang mencatat kunjungan. Fitur ini menambahkan pencatatan view
yang bekerja end-to-end: frontend memberi tahu backend setiap kali sebuah
post dibaca, backend menaikkan `viewCount` secara atomik.

## 2. Arsitektur & Komponen

```
PostPage.vue (mount/load sukses)
   └─ trackViewIfNew(postId)   // composable, dedup per-session
        └─ DataSource#trackView(postId)
             ├─ PocketBaseSource → POST /track-view {postId}
             └─ MockSource        → bump viewCount in-memory + persist
```

- **Backend** (`backend/main.go`): endpoint `POST /track-view` terdaftar di
  `se.Router` (non-API path). Membaca `{ "postId": "..." }`, mencari record
  `posts`, menaikkan `viewCount`, menyimpan, dan merespons
  `{ "ok": true, "viewCount": n }`. Endpoint bersifat best-effort dan tidak
  memerlukan autentikasi.
- **Frontend**: `useTrackView.ts` menyimpan daftar post yang sudah dihitung
  di `sessionStorage` (key `ncmaz.viewed.v1`) sehingga satu browser session
  menghitung setiap post hanya sekali. `PostPage.vue` memanggil
  `trackViewIfNew(found.id)` setelah post berhasil dimuat.

## 3. Kontrak Data & TypeScript Types

- `DataSource` mendapat method baru:
  ```ts
  trackView(postId: string): Promise<void>
  ```
- Request (`POST /track-view`):
  ```json
  { "postId": "p1" }
  ```
- Response:
  - `200` → `{ "ok": true, "viewCount": 11 }`
  - `400` → `{ "error": "postId is required" }` (body tidak valid / kosong)
  - `404` → `{ "error": "post not found" }`

## 4. Otorisasi & Keamanan

- Endpoint **publik** (hanya menaikkan angka, tidak membocorkan data).
- Best-effort: kegagalan jaringan/HTTP di frontend ditelan (`catch`) agar
  tidak mengganggu proses membaca.
- Dedup client-side mencegah spam penghitung dari satu tab.
- Restriksi kecepatan sepenuhnya bukan bagian dari fitur ini; jika perlu,
  tambahkan di layer reverse proxy (CF rate limit).

## 5. Panduan Penggunaan (UI/UX)

- Buka halaman `post/:slug`. Hitungan "views" di header dan sidebar
  bertambah setelah halaman dimuat (satu kali per session per post).
- Tidak ada perubahan UI: angka tetap dirender dari `post.viewCount`.

## 6. Pengujian & Verifikasi

- Unit test frontend:
  - `src/api/mock.source.test.ts` → `trackView` menaikkan `viewCount`.
  - `src/api/pocketbase.source.test.ts` → `trackView` mengirim `POST /track-view`
    dengan body `{ postId }`.
- Backend: `go build ./...`, `go vet ./...`, `go test ./...`.
- Manual smoke (setelah deploy):
  ```bash
  curl -s -X POST https://blog.artku.my.id/track-view \
       -H 'Content-Type: application/json' \
       -d '{"postId":"p1"}'
  # → {"ok":true,"viewCount":N}
  ```
