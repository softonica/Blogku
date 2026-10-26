# 12 - Editor: Tag, Auto-Excerpt, Kategori Admin & Post Styles

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 2 (PocketBase) |
| **Izin Minimum (RBAC)** | Penulis (tag), Admin (kategori) |
| **Komponen Utama** | [EditorPage.vue](../../frontend/src/pages/EditorPage.vue), [PostPage.vue](../../frontend/src/pages/PostPage.vue), [excerpt.ts](../../frontend/src/lib/excerpt.ts) |
| **Tanggal Ditambahkan** | 2026-10-26 |

---

## 1. Ringkasan & Tujuan

Empat perbaikan pada alur menulis:

1. **Tag baru tersimpan.** Sebelumnya tag baru memakai id lokal palsu
   (`tag_<timestamp>`) sehingga relasi `tags` ditolak saat publish.
2. **Tambahkan tag di mobile.** Input tag dulu hanya merespons tombol Enter;
   keyboard virtual sering tidak mengirim `keydown`. Kini memakai form + tombol
   **Add** seperti kontrol kategori.
3. **Excerpt otomatis.** Post tanpa excerpt kini mengambil paragraf pertama
   konten (maks 300 karakter) saat publish/save draft.
4. **Kategori dari editor.** Admin bisa membuat kategori langsung di editor.
5. **Post layout style.** Pilihan Style 1–4 kini benar-benar persisten dan
   memengaruhi tampilan halaman post.

## 2. Alur Pengguna

1. Penulis membuka `/editor`, mengetik judul dan konten.
2. Menambahkan tag: ketik nama pada field **+ New tag** lalu tekan **Add**
   (atau Enter). Tag baru dibuat melalui API dan chip langsung terpilih.
3. Bila excerpt dibiarkan kosong, saat **Save draft** / **Publish** sistem
   mengisi field excerpt dari paragraf pertama konten.
4. Admin melihat field **+ New category** di baris Categories; kategori baru
   langsung dibuat dan terpilih.
5. Pada modal **Post options** (format standard), penulis memilih Style 1–4;
   pilihan tersimpan dan halaman `/post/:slug` dirender sesuai style.

## 3. Arsitektur & Komponen

- `frontend/src/pages/EditorPage.vue`
  - `addNewTag()` — `createTag({ name })` (find-or-create by slug), guard `addingTag`.
  - `addNewCategory()` — `createCategory({ name })`, dedupe nama/slug, khusus `role === 'admin'`.
  - `ensureExcerpt()` — memanggil `firstParagraphExcerpt(content)` bila excerpt kosong.
  - `postStyle` — dimuat dari post/draft dan dikirim pada create/update/draft.
- `frontend/src/lib/excerpt.ts` — ekstraksi paragraf pertama (murni, teruji).
- `frontend/src/api/pocketbase.source.ts` — `mapPost`/`postBody` mendukung `postStyle`.
- `frontend/src/stores/draft.ts` — draft menyimpan `postStyle`.
- `frontend/src/pages/PostPage.vue` — empat varian layout.
- `backend/main.go` — field `postStyle` + migrasi idempoten `ensurePostStyleField`.

## 4. Kontrak Data

```ts
export type PostStyle = 'style1' | 'style2' | 'style3' | 'style4'

export interface Post {
  // ...
  postType?: PostType
  postStyle?: PostStyle
}

export interface PostInput {
  // ...
  postStyle?: PostStyle
}

export function firstParagraphExcerpt(html: string, max = 300): string
```

Koleksi `posts` mendapat field `postStyle` (select, max 1, opsional). Record lama
tanpa nilai dimapping ke `style1`.

## 5. Keamanan & Otorisasi

- **Tag:** `tags.CreateRule = admin || penulis` — penulis boleh membuat tag.
- **Kategori:** `categories.CreateRule = admin` — kontrol UI hanya muncul untuk
  admin, tetapi backend tetap penentu izin (UI bukan kontrol keamanan).
- **Excerpt:** diturunkan dari konten yang sudah disanitasi (`sanitizeHtml`);
  helper membuang tag dan entity sebelum dipakai.
- Tidak ada endpoint baru; memakai `createTag`/`createCategory` yang ada.

## 6. Pengujian & Verifikasi

- Unit: `frontend/src/lib/excerpt.test.ts` (8 kasus: paragraf pertama, paragraf
  kosong di awal, entity, whitespace, fallback non-`<p>`, konten kosong,
  truncation di batas kata).
- Unit: `frontend/src/api/pocketbase.source.test.ts` — mapping `postStyle`
  (default `style1`) dan payload `createPost`.
- Gerbang: `npm test` (93 test), `npm run typecheck`, `npm run lint`, `go test ./...`.
- E2E produksi (Playwright):
  - Mobile (iPhone 13): tap **Add** mengirim `POST /api/collections/tags/records`,
    chip muncul; Enter juga berfungsi.
  - Editor: pilih **Style 2** → Publish → halaman post `data-post-style="style2"`
    dengan artikel `max-w-5xl`; excerpt terisi dari paragraf pertama.
  - Empat style dibuat via API: style1 `max-w-3xl`, style2 `max-w-5xl`,
    style3 memiliki `<aside>`, style4 memiliki hero overlay.

## 7. Catatan Handover

- Konten editor kini dimulai kosong (placeholder TipTap) agar excerpt tidak
  mengambil teks contoh.
- Bila database lama belum punya `postStyle`, restart service akan menambahkannya
  otomatis (idempoten).
- Optimasi lanjutan yang belum dikerjakan: dedupe request in-flight untuk
  taksonomi, dan editor kategori/tag khusus admin di halaman admin.
