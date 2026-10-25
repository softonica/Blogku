# 09 — PocketBase Backend Integration

> Status: Implementasi frontend (adapter `PocketBaseSource`) — DoD frontend.
> Referensi: [`docs/backend-integration-spec.md`](../backend-integration-spec.md) (sumber kebenaran).

## 1. Ringkasan & Motivasi

`MockSource` (localStorage) tetap tersedia sebagai mode pengembangan/demo eksplisit
(lihat `src/main.ts`). Integrasi ini menyiapkan frontend agar dapat berpindah ke
**PocketBase v0.40.6** (Go + SQLite WAL) lewat kontrak `DataSource`. Semua akses
data UI tetap lewat `src/api/source.ts`; tidak ada komponen yang memanggil SDK
secara langsung.

Motivasi:

- Server menjadi otoritas RBAC, sanitasi, dan counter (tidak dapat dimanipulasi klien).
- Menutup gap auth: registrasi nyata, reset password nyata (bukan simulasi).
- Kontrak error yang bisa ditindaklanjuti, termasuk `429` dengan `Retry-After`.

## 2. Arsitektur & Komponen

```text
Komponen UI (Vue 3)  ->  DataSource (source.ts)  ->  PocketBaseSource  ->  PocketBase SDK
                                                      (pocketbase.source.ts)   (lib/pb.ts)
```

| Komponen | Path | Peran |
| :--- | :--- | :--- |
| `DataSource` | `src/api/source.ts` | Kontrak 36+ method; satu-satunya pintu data UI |
| `PocketBaseSource` | `src/api/pocketbase.source.ts` | Implementasi target: mapping, filter, error normalization |
| `lib/pb.ts` | `src/lib/pb.ts` | Factory client SDK (URL dari `VITE_PB_URL`) |
| `api/errors.ts` | `src/api/errors.ts` | `AppError`, `RateLimitError`, `toAppError()` |
| Pemilihan source | `src/main.ts` | `VITE_USE_POCKETBASE=true` memakai PocketBase; default Mock |
| `stores/auth.ts` | `src/stores/auth.ts` | Delegasi `login`/`register`/`logout`; local user override dihapus |

Aliran data:
1. Komponen memanggil `getDataSource().<method>()`.
2. `PocketBaseSource` menyusun query (`pb.filter`, `expand`, `sort`), memanggil SDK.
3. Record di-map ke tipe domain (`created`→`createdAt`, `expand.author`, dst).
4. Error SDK dinormalkan via `toAppError()` menjadi `AppError`/`RateLimitError`.

## 3. Kontrak Data & TypeScript Types

- Tipe domain tidak berubah (lihat `src/api/types.ts`).
- Method auth baru ditambahkan ke `DataSource`:
  ```ts
  register(input: { name; username; email; password }): Promise<User>
  requestPasswordReset(email: string): Promise<void>
  confirmPasswordReset(token: string, newPassword: string): Promise<void>
  ```
- `MockSource` mengimplementasikan method baru agar kontrak tetap satisfiable di mode mock.
- Error ter-normalisasi:

  | HTTP | Perilaku adapter |
  | :--- | :--- |
  | `400` | Ambil pesan field pertama dari `data.data` |
  | `401` | `LOGIN_REQUIRED` |
  | `403` | `FORBIDDEN` |
  | `404` | getter → `null`; mutasi → error |
  | `409` | Pesan konflik |
  | `429` | `RateLimitError` (`retryAfter` dari header/body) |
  | `5xx` | `The server is having trouble. Please try again.` |

## 4. Otorisasi & Keamanan

- Guard UI hanya UX; otoritas sebenarnya ada di collection rules + Go hooks (lihat spec §6).
- `PocketBaseSource` tidak pernah mengirim `role`/`author` dari input klien — server yang mengisi.
- Registrasi server-side memaksa `role = subscriber` dan memeriksa `allowRegistration`.
- Sanitasi klien tetap aktif sebelum mengirim (`sanitizeHtml`/`sanitizePlainText`/`sanitizeUrl`).
- Upload divalidasi MIME + 5 MB di klien dan server; SVG/HTML ditolak.

## 5. Panduan Penggunaan (UI/UX)

Aktifkan PocketBase:

```bash
# frontend/.env.local
VITE_USE_POCKETBASE=true
VITE_PB_URL=http://127.0.0.1:8090
```

Reset password: halaman `/reset-password` kini punya dua mode:

- Tanpa `?token=` → mode minta link (`requestPasswordReset(email)`).
- Dengan `?token=...` → mode konfirmasi (`confirmPasswordReset(token, password)`).

Rate limit: saat backend mengembalikan `429`, `toAppError()` melempar
`RateLimitError`. Form (login, register, reset password, komentar, profil,
editor, admin) memakai `useRateLimit()` untuk menampilkan pesan dan menonaktifkan
tombol submit selama `retryAfter` detik tanpa retry otomatis.

## 6. Pengujian & Verifikasi

- `src/api/pocketbase.source.test.ts` (frozen SDK):
  - mapping record post (created/updated + `expand` author/categories/tags),
  - builder filter `listPosts` (status/kategori/author/search),
  - getter `404` → `null`,
  - normalisasi `429` → `RateLimitError` dengan `retryAfter` dari header,
  - normalisasi `401` → `LOGIN_REQUIRED`, `400` → pesan field,
  - `toggleReaction` create/delete,
  - `login`/`register` (username dinormalisasi lowercase),
  - `uploadFile` multipart + URL,
  - normalisasi `403` → `FORBIDDEN`, `409` → pesan konflik, `5xx`/`0` → pesan generik,
  - batasan `perPage` ≤ 100,
  - preserve slug di `updatePost` saat hanya judul berubah.
- Verifikasi CI: `vue-tsc --noEmit`, `eslint .`, `vitest run`, `vite build`.
- Backend (di luar repo ini): seed koleksi, rules §6.3, hooks §6.4, rate limit middleware — lihat spec §13–14.
