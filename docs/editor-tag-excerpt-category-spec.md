# Spec — Tag Editor, Auto-Excerpt, Kategori (Admin), dan Post Layout Style

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Approved (2026-10-26) |
| **Fase Arsitektur** | Fase 2 (PocketBase) |
| **Izin Minimum** | Penulis (tag), Admin (kategori) |
| **Komponen Utama** | `frontend/src/pages/EditorPage.vue`, `frontend/src/lib/excerpt.ts` |
| **Tanggal** | 2026-10-26 |

---

## 1. Latar Belakang

Tiga masalah pada editor (`/write`):

1. **Tag baru tidak tersimpan.** `EditorPage.addNewTag()` membuat objek tag lokal dengan
   id palsu `tag_<timestamp>` lalu memasukkan id itu ke `selectedTagIds`. Saat publish,
   `postBody()` mengirim `tags = tagIds`, dan PocketBase menolak relasi dengan id tak
   valid (400). Akibatnya publish gagal atau tag tidak pernah tersimpan.
2. **Excerpt wajib.** `draftSchema` (`frontend/src/lib/validation.ts`) menuntut excerpt
   minimal 10 karakter, sehingga post tanpa excerpt tidak bisa dipublikasikan.
3. **Admin tidak bisa menambah kategori dari editor.** UI hanya menampilkan chip
   kategori yang sudah ada. Backend sebenarnya sudah mengizinkan
   (`categories.CreateRule = @request.auth.role = "admin"`, `backend/main.go:225`)
   dan `DataSource.createCategory()` sudah tersedia.

## 2. Ruang Lingkup

**Termasuk:** perbaikan alur tag, auto-excerpt dari paragraf pertama, dan kontrol
tambah kategori khusus admin di editor.

**Tidak termasuk:** perubahan skema/koleksi backend, perubahan aturan RBAC, editor
kategori di halaman admin, dedupe request (backlog terpisah).

## 3. Desain

### 3.1 Tag — buat tag nyata saat Enter

Perubahan di `EditorPage.vue`:

- `addNewTag()` menjadi `async`:
  1. Bersihkan input (`replace(/[,#]/g,'')`, trim) — sama seperti sekarang.
  2. Jika kosong → return. Jika `selectedTagIds.length >= 5` → notifikasi, kosongkan input, return.
  3. Cari tag existing dengan nama/slug sama (case-insensitive). Jika ada → pilih id-nya.
  4. Jika tidak ada → `await getDataSource().createTag({ name: clean })`.
     - Sukses: tambahkan hasil (id asli) ke `tags`, pilih id tersebut.
     - Gagal: `ui.notify(err.message, 'error')`, pertahankan input agar bisa diperbaiki.
  5. Kosongkan input hanya bila berhasil (atau saat tag existing ditemukan).
- Tambah `addingTag` (ref boolean) sebagai guard agar Enter beruntun tidak membuat
  dua request/dua tag.
- `onTagInputKeydown` memanggil `void addNewTag()`.

Catatan: `PocketBaseSource.createTag()` sudah *find-or-create* berdasarkan slug,
sehingga duplikat aman. `tags.CreateRule` mengizinkan `admin` dan `penulis`.

### 3.2 Auto-excerpt dari paragraf pertama

Helper baru `frontend/src/lib/excerpt.ts`:

```ts
export function firstParagraphExcerpt(html: string, max = 300): string
```

Aturan:
- Ambil isi `<p>…</p>` pertama yang memiliki teks; jika tidak ada `<p>`, ambil blok
  teks pertama dari HTML.
- Buang seluruh tag, ubah `<br>`/blok menjadi spasi, decode entity dasar
  (`&nbsp; &amp; &lt; &gt; &quot; &#39;`).
- Rapikan spasi berlebih (termasuk newline) menjadi satu spasi.
- Jika panjang > `max`, potong pada batas kata terakhir sebelum `max` dan tambahkan `…`.
- Kembalikan `''` bila tidak ada teks.

Integrasi di `EditorPage.vue` (`publishStory()` dan `saveLocalDraft()`):
- Sebelum `draftSchema.safeParse`, jika `excerpt.value.trim() === ''` →
  `excerpt.value = firstParagraphExcerpt(content.value)`.
- Tidak pernah menimpa excerpt yang sudah diisi user.
- Nilai terisi ke field sehingga user melihat & bisa mengeditnya.

### 3.3 Tambah kategori (khusus admin)

Perubahan di `EditorPage.vue`:
- State: `newCategoryName` (string), `addingCategory` (boolean).
- UI: input + tombol `+ New` inline di baris **Categories**, hanya dirender bila
  `auth.user?.role === 'admin'`.
- `addCategory()`:
  1. Bersihkan input; jika kosong → return.
  2. Dedupe terhadap `categories` berdasarkan nama/slug (case-insensitive) → jika ada,
     cukup pilih kategori tersebut.
  3. `await getDataSource().createCategory({ name })` → push ke `categories`, pilih id,
     kosongkan input, notifikasi sukses.
  4. Gagal → notifikasi error.
- Penulis/subscriber tidak melihat kontrol ini. Backend tetap menjadi penentu izin
  (UI bukan kontrol keamanan).

### 3.4 Post layout style (style1–style4)

Akar masalah: `postStyle` hanya state lokal `EditorPage`; tidak dikirim saat publish,
tidak ada field backend, dan `PostPage` tidak membacanya — sehingga semua post
dirender sama.

Perubahan:
- **Backend** (`backend/main.go`): field `postStyle` (`select`: `style1..style4`, max 1)
  pada koleksi `posts` untuk instalasi baru, plus migrasi idempoten
  `ensurePostStyleField()` yang menambahkan field ke database lama saat boot.
- **Frontend tipe & mapper**: `PostStyle` di `types.ts`; `Post.postStyle` &
  `PostInput.postStyle`; `mapPost()` default `style1`; `postBody()` mengirim
  `postStyle`.
- **Editor**: style dimuat dari post/draft, disertakan di autosave draft,
  save draft, create, dan update.
- **`PostPage`** merender 4 layout:
  | Style | Layout |
  | :--- | :--- |
  | style1 | Classic centered (perilaku lama): header tengah, artikel `max-w-3xl` |
  | style2 | Wide / no sidebar: header rata kiri, cover banner, artikel `max-w-5xl` |
  | style3 | Magazine: cover banner + grid konten & sidebar lengket (author, share, detail) |
  | style4 | Full-bleed hero: cover besar + judul overlay, artikel `max-w-3xl` |

Style hanya berlaku untuk `postType = standard` (selain itu selalu `style1`).

## 4. Kontrak Data

Tidak ada perubahan tipe/DB. Memakai kontrak yang ada:

- `createTag(input: TagInput): Promise<Tag>` → `{ id, name, slug, postCount? }`
- `createCategory(input: CategoryInput): Promise<Category>` → `{ id, name, slug, … }`

## 5. Pengujian

Unit test (vitest):
- `excerpt.test.ts`
  - satu paragraf → teksnya
  - banyak paragraf → hanya paragraf pertama
  - tag inline/entity → teks bersih
  - teks > 300 → dipotong di batas kata + `…`, panjang ≤ 300
  - konten kosong / hanya tag → `''`
- Test komponen tidak ditambahkan (belum ada harness mount); verifikasi alur editor
  dilakukan end-to-end di produksi setelah deploy.

Gerbang kualitas: `npm test`, `npm run typecheck`, `npm run lint`.

Verifikasi produksi setelah deploy:
1. Login sebagai penulis → tambah tag baru → publish → tag muncul di halaman post.
2. Publish tanpa excerpt → excerpt terisi otomatis dari paragraf pertama.
3. Login admin → tambah kategori dari editor → kategori terpilih & tersimpan.

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
| :--- | :--- |
| User mengetik tag salah lalu Enter → tag "sampah" tersimpan | Sesuai keputusan produk; chip bisa dihapus, tag bisa dibersihkan admin |
| Excerpt otomatis mengambil teks yang tidak representatif | Hanya mengisi bila kosong; user tetap bisa edit |
| Race Enter ganda | Guard `addingTag` |
| Kategori duplikat | Dedupe nama/slug sebelum create; backend juga punya index unik slug |

## 7. Rollout

Rebuild frontend → salin ke `backend/dist` → build binary Linux → deploy ke
server 64 → verifikasi (§5). Tidak ada migrasi DB. Rollback: kembalikan binary
sebelumnya (`/opt/blogku/blogku.prev-*`).
