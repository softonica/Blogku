# 01 - Authentication & Role-Based Access Control (RBAC)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (Mock Auth) → Siap PocketBase Fase 2 |
| **Izin Minimum (RBAC)** | Publik, Subscriber, Penulis, Admin |
| **Komponen Utama** | [`src/stores/auth.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/stores/auth.ts), [`src/lib/permissions.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/permissions.ts), [`src/router/index.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/router/index.ts) |
| **Tanggal Ditambahkan** | 2026-10-22 |

---

## 1. Ringkasan & Tujuan Fitur
Fitur autentikasi dan otorisasi menyediakan identifikasi pengguna yang aman dengan 3 peran (*roles*):
1. **admin**: Hak penuh mengelola situs, moderasi semua komentar, mengubah peran pengguna, dan mengedit pengaturan situs.
2. **penulis (author)**: Membuat, mengedit, dan menghapus artikel miliknya sendiri, serta mengelola kategori dan tag.
3. **subscriber**: Membaca artikel, memberi like/reaksi, bookmark cerita, menulis komentar, dan mengelola profil sendiri.

---

## 2. Alur Pengguna (User Flow)
1. **Login**: Pengguna mengunjungi `/login`, memasukkan username dan password.
2. **Session Storage**: Token dan data profil (termasuk role) disimpan secara aman di Pinia store (`authStore`).
3. **Route Guards**:
   - Jika pengguna bukan penulis/admin mencoba mengakses `/editor` atau `/dashboard`, diarahkan ke `/login` atau ditolak.
   - Jika pengguna bukan admin mencoba mengakses `/admin/*`, diarahkan ke halaman utama.
4. **UI Adaptation**: Tombol aksi seperti "Edit Story", "Delete", atau menu Admin otomatis disembunyikan jika pengguna tidak memiliki izin.

---

## 3. Arsitektur & Komponen Terkait
- **`src/stores/auth.ts`**: Menyimpan state pengguna saat ini, token, role, dan helper getters (`isAdmin`, `isAuthor`).
- **`src/lib/permissions.ts`**: Helper fungsi terpusat `can(role, action)` dan `canManagePost(role, userId, authorId)` untuk evaluasi izin di komponen UI.
- **`src/router/index.ts`**: Navigation guard `beforeEach` memeriksa meta `requiresAuth` dan `allowedRoles`.

---

## 4. Kontrak Data & TypeScript Schema
```typescript
export type Role = 'admin' | 'penulis' | 'subscriber'

export interface User {
  id: string
  username: string
  name: string
  email: string
  avatar: string
  bio: string
  role: Role
  createdAt: string
}
```

---

## 5. Keamanan & Otorisasi
- **Prinsip Fail-Safe**: Jika status role bernilai `null` (tamu/guest), semua aksi berizin ditolak.
- **Pemisahan Tingkat UI & Data**: Fungsi `can()` hanya mengatur visibilitas tampilan UI; di level data adapter (`DataSource`), setiap mutasi (`createPost`, `deleteComment`, dsb.) melakukan pengecekan ulang role pengguna.
- **Fase 2 (PocketBase)**: Aturan otorisasi yang sama ditegakkan pada Collection Rules PocketBase dan Go Hooks (§2.6 `REWRITE-SPEC.md`).

---

## 6. Pengujian & Verifikasi
- **Unit Test**: [`src/lib/permissions.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/permissions.test.ts) menguji semua kemungkinan matriks izin peran.
- Jalankan:
  ```bash
  cd frontend
  npm run test -- src/lib/permissions.test.ts
  ```
