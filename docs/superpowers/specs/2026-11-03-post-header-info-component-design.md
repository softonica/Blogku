# Post Header Info Component — Design

| Metadata | Keterangan |
| :--- | :--- |
| **Tanggal** | 2026-11-03 |
| **Status** | Menunggu persetujuan |
| **Ukuran pekerjaan** | Perubahan kecil (komponen reusable + integrasi) |
| **Pendekatan terpilih** | A — satu komponen penuh dengan prop `tone` |

## 1. Intent & Why

Saat ini setiap tipe/layout post menampilkan info author dan aksi dengan gaya
berbeda: `AudioPostHeader.vue` punya versi ringkas, sedangkan `PostPage.vue`
punya header standar, overlay hero, sidebar magazine, dan action row pill
terpisah. Permintaan: satu komponen reusable berisi **avatar, nama author,
tanggal · reading time**, lalu **baris tombol bulat** (like + jumlah, komentar +
jumlah, views + jumlah, pemisah, bookmark, share) sesuai gambar referensi, dan
dipakai di semua tipe post.

## 2. Goals

- Satu komponen `PostHeaderInfo.vue` menjadi satu-satunya sumber tampilan info
  author + aksi post.
- Konten persis: avatar, nama author (link), tanggal · reading time, like,
  komentar, views, pemisah, bookmark, share. **Tanpa tombol `...`** (tidak
  diminta).
- Memakai atom yang sudah ada (`AppAvatar`, `LikeButton`, `SaveButton`,
  `formatDate`, `formatNumber`) agar perilaku (reaction store, bookmark store,
  redirect login, modal share) tetap sama.
- Mendukung mode terang/gelap dan varian teks putih di atas cover hero.
- Aksesibel (label `aria-*`, `<time datetime>`, focus ring) dan mobile-first
  sesuai `docs/features/19-mobile-compact-layout.md`.

## 3. Non-goals & Anti-goals

- **Bukan** mendesain ulang kartu sidebar magazine; hanya menghapus duplikasi.
- **Bukan** mengubah store, DataSource, backend, atau alur komentar.
- **Anti-goal:** menyalin markup tombol yang sama di tiap halaman; menambah menu
  `...`; menghilangkan akses "Edit post" bagi penulis/admin.

## 4. Pendekatan

### A. Satu komponen penuh + prop `tone` — **dipilih**

Komponen merender seluruh blok dan memakai atom tombol yang sudah ada. Prop
`tone: 'default' | 'on-image'` untuk hero. Kekurangan: perlu menambah prop
opsional kecil di `LikeButton`/`SaveButton`.

### B. Komponen shell + slot aksi — ditolak

Hanya mengatur avatar/nama/meta, tombol dirakit per halaman. Lebih fleksibel
tetapi justru mempertahankan inkonsistensi yang ingin dihapus.

## 5. Kontrak Komponen

`frontend/src/components/post/PostHeaderInfo.vue`

```ts
defineProps<{
  post: Post
  tone?: 'default' | 'on-image' // default: 'default'
}>()

defineEmits<{
  comments: []
  share: []
}>()
```

Struktur render:

1. Baris atas: `AppAvatar size="md"` (44px) yang membungkus link
   `/author/:username`, lalu nama author (`text-lg sm:text-xl font-bold`) dan
   `<time>` + `·` + `{readingTime} min read` (`text-sm`).
2. Baris aksi: `LikeButton` varian `compact` + jumlah, tombol komentar bulat +
   jumlah, statistik views (non-interaktif), pemisah vertikal, `SaveButton`
   varian ikon, tombol share. Semua tombol bulat 44px, ikon 20px, jumlah
   `text-sm font-semibold`.
3. Mobile: baris aksi boleh wrap; jarak tetap rapi.

Perubahan atom (opsional, default lama tidak berubah):

- `LikeButton`: tambah `size?: 'sm' | 'md'` dan `tone?: 'default' | 'on-image'`
  untuk varian `compact`.
- `SaveButton`: tambah `size?: 'sm' | 'md'` dan `tone?: 'default' | 'on-image'`.
- Tidak ada perubahan pada `stores/reaction.ts`, `stores/bookmark.ts`, atau API.

## 6. Integrasi

| Lokasi | Perubahan |
| :--- | :--- |
| `AudioPostHeader.vue` | Blok author + meta + action row diganti `<PostHeaderInfo>`; emit `comments`/`share` diteruskan ke `PostPage`. |
| `PostPage.vue` — standard & video (style 1–3) | Baris author/tanggal dan action row pill diganti satu `<PostHeaderInfo>` di bawah excerpt. |
| `PostPage.vue` — hero (style 4) | Meta author di dalam overlay diganti `<PostHeaderInfo tone="on-image">`; action row pill di bawah hero dihapus agar tidak duplikat. |
| `PostPage.vue` — magazine (style 3) | Sidebar "Written by" tidak lagi merender author + Like/Save/Share (duplikat); hanya menyisakan kartu "Post details". |
| Breadcrumb `PostPage.vue` | Tautan kecil "Edit post" (hanya `canManagePost`) dipindah ke sisi kanan breadcrumb agar akses edit tidak hilang setelah tombol edit dihapus dari action row. |

## 7. Spesifikasi Visual

- Avatar 44px; nama author `text-lg sm:text-xl font-bold`; meta `text-sm` warna
  `neutral-500` (`on-image`: `white/80`).
- Tombol bulat 44px (`h-11 w-11`), ikon 20px, jumlah `text-sm font-semibold`.
- Default: lingkaran `bg-neutral-100 dark:bg-neutral-800`, ikon
  `neutral-700 dark:neutral-200`, hover lebih gelap; divider
  `border-neutral-200 dark:border-neutral-700`.
- `on-image`: teks putih, lingkaran `bg-white/10`, border `white/20`,
  `backdrop-blur`, hover `bg-white/20`.
- Like aktif tetap rose, bookmark aktif tetap primary — perilaku store tidak
  berubah.

## 8. Pengujian & Verifikasi

- Unit test `PostHeaderInfo.test.ts`: merender nama author, tanggal, reading
  time; emit `comments` dan `share`; kelas `on-image` diterapkan; jumlah
  terformat.
- `npm run typecheck`, `npm run lint`, `npm run test` di `frontend/`.
- Manual: buka post audio, standard (style 1–4), dan video; cek mode terang &
  gelap, lebar 375px, like tanpa login (redirect login), bookmark, share modal,
  klik komentar scroll ke `#comments`.

## 9. Dokumentasi & DoD

- `docs/features/23-post-header-info-component.md` (template guideline).
- Perbarui indeks `docs/README.md`.
- Entri `CHANGELOG.md` dengan format team-work (Author/Role/What/Why/Verified/
  Handover).

## 10. Yang Diserahkan ke Builder

Detail kelas Tailwind akhir, animasi hover, dan susunan tepat breadcrumb
"Edit post" — tidak mengubah kontrak atau cakupan di atas.
