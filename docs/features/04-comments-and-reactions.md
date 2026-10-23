# 04 - Comments & Reactions (Likes & Bookmarks)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (Mock State) → Siap PocketBase Fase 2 |
| **Izin Minimum (RBAC)** | Subscriber (Membuat / Reaksi), Admin (Moderasi) |
| **Komponen Utama** | [`src/components/comments/CommentList.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/comments/CommentList.vue), [`src/components/post/LikeButton.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/post/LikeButton.vue), [`src/components/post/SaveButton.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/post/SaveButton.vue) |
| **Tanggal Ditambahkan** | 2026-10-22 |

---

## 1. Ringkasan & Tujuan Fitur
Menyediakan fitur keterlibatan komunitas (*community engagement*) yang memungkinkan pembaca terdaftar meninggalkan komentar, menyukai (*like*) artikel, dan menyimpan cerita ke daftar bookmark pribadi.

---

## 2. Alur Pengguna (User Flow)
1. **Komentar**:
   - Pembaca terdaftar (`subscriber`, `penulis`, `admin`) dapat menulis komentar di bagian bawah artikel.
   - Komentar langsung muncul di daftar komentar dan jumlah komentar diperbarui secara reaktif.
2. **Moderasi Komentar**:
   - Pengguna pemilik komentar dapat menghapus komentarnya sendiri.
   - Admin dapat menghapus komentar siapa saja (melalui halaman `/admin/moderation`).
3. **Likes & Reactions**:
   - Tombol Like (`LikeButton.vue`) memungkinkan pembaca menyukai artikel dengan optimistic UI update.
4. **Bookmarks (Save)**:
   - Tombol Bookmark (`SaveButton.vue`) menyimpan ID artikel ke `bookmarkStore` (Pinia dengan persistensi localStorage).
   - Pengguna dapat melihat daftar bacaan tersimpan di `/bookmarks`.
   - Setiap kartu di `/bookmarks` memiliki tombol **Remove** untuk menghapus satu bookmark tanpa menghapus seluruh daftar. Aksi ini memanggil `bookmarkStore.remove(postId)` yang bersifat idempotent, memperbarui `localStorage`, menampilkan toast konfirmasi, dan langsung menampilkan *empty state* bila daftar menjadi kosong.

---

## 3. Kontrak Data & TypeScript Schema
```typescript
export interface Comment {
  id: string
  postId: string
  content: string
  author: User
  createdAt: string
  parentId?: string | null
}

export type ReactionType = 'like' | 'dislike' | 'favorite'
```

---

## 4. Keamanan & Sanitasi
- **Sanitasi Teks Komentar**: Teks komentar dievaluasi dengan auto-escape `{{ }}` pada Vue template dan dibatasi panjang maksimalnya untuk mencegah serangan DoS/bloat teks.
- **Enforcement Otorisasi**: `deleteComment()` di level `DataSource` memverifikasi identitas pengguna — pengguna biasa dilarang menghapus komentar milik orang lain (`FORBIDDEN`), sedangkan admin diizinkan untuk moderasi.

---

## 5. Pengujian & Verifikasi
- **Unit Test**: [`src/api/mock.source.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/api/mock.source.test.ts), [`src/stores/bookmark.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/stores/bookmark.test.ts).
- **E2E Test**: `e2e/navigation.spec.ts` — menyimpan cerita, membuka `/bookmarks`, lalu menghapusnya satu per satu dan memverifikasi *empty state*.
- Jalankan:
  ```bash
  cd frontend
  npm run test -- src/api/mock.source.test.ts src/stores/bookmark.test.ts
  npm run e2e -- -g "bookmarks"
  ```
