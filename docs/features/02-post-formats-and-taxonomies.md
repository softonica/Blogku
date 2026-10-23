# 02 - Post Formats & Taxonomies (Categories & Tags)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (Mock Data) → Siap PocketBase Fase 2 |
| **Izin Minimum (RBAC)** | Penulis / Admin (untuk membuat), Publik (untuk melihat) |
| **Komponen Utama** | [`src/pages/EditorPage.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/EditorPage.vue), [`src/components/post/PostCard.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/post/PostCard.vue), [`src/pages/PostPage.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/PostPage.vue) |
| **Tanggal Ditambahkan** | 2026-10-22 |

---

## 1. Ringkasan & Tujuan Fitur
Menyediakan fleksibilitas editorial khas majalah digital modern. Penulis dapat menentukan jenis format cerita (**Standard**, **Video**, **Audio / Podcast**, **Gallery**) serta mengelompokkan konten dengan multi-kategori dan tag dinamis (*on-the-fly*).

---

## 2. Alur Pengguna (User Flow)
1. **Pemilihan Format Cerita**:
   - Di `/editor`, penulis memilih salah satu tombol format: Standard, Video, Audio, atau Gallery.
   - Jika memilih **Video**: Muncul input URL video (YouTube, Vimeo, MP4).
   - Jika memilih **Audio**: Muncul input URL file audio/podcast (MP3/SoundCloud).
2. **Pemilihan Kategori**:
   - Penulis memilih satu atau beberapa kategori dari daftar pill button.
3. **Pemilihan & Pembuatan Tag**:
   - Penulis memilih tag yang sudah ada dari chip list, atau mengetikkan nama tag baru di input dan menekan tombol *Add* / Enter untuk membuat tag baru secara instan.
4. **Tampilan Pembaca**:
   - Di kartu artikel (`PostCard.vue`): Ditampilkan badge format interaktif (icon Play untuk video, Headphones untuk audio, Layers untuk galeri).
   - Di halaman detail cerita (`PostPage.vue`): Ditampilkan pemutar video responsif 16:9 (YouTube/Vimeo embed) atau pemutar audio berlatar gambar cover.

---

## 3. Arsitektur & Komponen Terkait
- **`src/lib/video.ts`**: Parser URL video pintar yang mendukung YouTube (`watch`, `youtu.be`, `shorts`) dan Vimeo menjadi iframe URL `youtube-nocookie.com` / `player.vimeo.com`.
- **`src/components/post/PostCard.vue`**: Menampilkan indikator format di semua layout (vertical, horizontal, overlay).
- **`src/pages/PostPage.vue`**: Header media dinamis berbasis tipe konten.

---

## 4. Kontrak Data & TypeScript Schema
```typescript
export type PostType = 'standard' | 'video' | 'audio' | 'gallery'

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover: string
  postType?: PostType
  videoUrl?: string
  audioUrl?: string
  gallery?: string[]
  categories: Category[]
  tags: Tag[]
  // ...
}
```

---

## 5. Keamanan & Otorisasi
- **Iframe Embed Sandboxing**: Parser `getEmbedUrl()` hanya mengekstrak ID alfanumerik YouTube/Vimeo yang ketat (`[a-zA-Z0-9_-]{11}`), mencegah injeksi script jahat pada atribut `src` iframe.
- **Validasi URL**: Validasi schema Zod (`draftSchema`) memastikan URL yang dimasukkan bertipe URL yang valid.

---

## 6. Pengujian & Verifikasi
- **Unit Test**: [`src/lib/video.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/video.test.ts) dan [`src/api/mock.source.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/api/mock.source.test.ts).
- Jalankan:
  ```bash
  cd frontend
  npm run test -- src/lib/video.test.ts
  ```
