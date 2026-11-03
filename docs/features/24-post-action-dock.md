# 24 - Post Action Dock (Floating Control Menu)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (Mock) + Fase 2 (PocketBase) — murni frontend |
| **Izin Minimum (RBAC)** | Publik (tampilan); like/bookmark mengikuti aturan store masing-masing |
| **Komponen Utama** | [`PostActionDock.vue`](../../frontend/src/components/post/PostActionDock.vue), [`usePostReading.ts`](../../frontend/src/composables/usePostReading.ts), [`PostPage.vue`](../../frontend/src/pages/PostPage.vue) |
| **Tanggal Ditambahkan** | 2026-11-03 |

---

## 1. Ringkasan & Tujuan Fitur

Pembaca yang berada di tengah artikel tidak punya akses cepat ke aksi post dan
tidak bisa melihat struktur artikel. Fitur ini menambahkan **floating control
menu** di bawah halaman post (mengikuti referensi Ncmaz) yang berisi:

- like + jumlah, komentar + jumlah, dan bookmark;
- **persentase progress baca** selama berada di area konten;
- **tombol back-to-top** yang menggantikan persentase begitu section komentar
  tercapai/terlewati;
- tombol **TOC "On this page"** berisi heading artikel (`h2`/`h3`, `h4` bila ada).

Karena back-to-top sudah tersedia di dock, komponen `BackToTop.vue` lama
dihapus dari aplikasi.

---

## 2. Alur Pengguna (User Flow)

1. Pembaca membuka halaman post (tipe apa pun: standard, video, gallery, audio,
   hero). Dock muncul di bawah tengah halaman.
2. Selama membaca artikel, chip kanan menampilkan persentase (0–100%).
3. Saat section komentar masuk viewport, chip yang sama berganti menjadi tombol
   panah atas (back-to-top).
4. Klik tombol komentar → halaman scroll halus ke `#comments`.
5. Klik tombol TOC → popover "On this page" terbuka ke atas; klik salah satu
   heading → scroll ke heading tersebut.
6. Pada post audio, dock otomatis berada **di atas player dock** (offset
   `--player-dock-height`), tidak bertumpuk.

---

## 3. Arsitektur & Komponen

```
PostPage.vue
├── <article ref="articleRef" v-html="cleanContent">
├── <CommentList id="comments">
└── <Teleport to="body"><PostActionDock /></Teleport>

usePostReading({ articleRef })
├── headings: TocHeading[]      // { id, level, text }
├── progress: number            // 0–100
├── showBackToTop: boolean      // comments section tercapai
├── collectHeadings()           // baca h2/h3/h4 + assign slug id
└── backToTop()                 // window.scrollTo smooth
```

- `PostActionDock` memakai atom yang sudah ada: `LikeButton` (compact, md),
  `SaveButton` (md), ikon `MessageCircle`, `List`, `ArrowUp`.
- Posisi: `fixed inset-x-0 z-40`, `bottom: calc(var(--player-dock-height, 0px) + 1rem)`.
- Dua pill: pill aksi dan pill TOC (pill TOC disembunyikan bila tidak ada heading).
- Progress dihitung dari posisi scroll relatif terhadap elemen `<article>`:
  `clamp((scrollY - articleTop) / (articleHeight - viewportHeight))`.
- `showBackToTop` = `#comments.getBoundingClientRect().top <= window.innerHeight`.

---

## 4. Kontrak Data & TypeScript Types

```ts
// usePostReading.ts
export interface TocHeading {
  id: string
  level: 2 | 3 | 4
  text: string
}

usePostReading(options: {
  articleRef: Ref<HTMLElement | null>
  commentsId?: string // default 'comments'
})

// PostActionDock.vue
defineProps<{
  post: Post
  headings: TocHeading[]
  progress: number
  showBackToTop: boolean
}>()

defineEmits<{ comments: [] }>()
```

- `id` heading: memakai `id` yang sudah ada atau slug dari teks (lowercase,
  non-alfanumerik → `-`, maks 60 karakter), dengan dedupe `-2`, `-3`, dst.
- Tidak ada perubahan tipe `Post`, store, DataSource, atau API.

---

## 5. Keamanan & Otorisasi

- **Sanitasi**: heading diambil dari DOM artikel yang sudah melewati
  `sanitizeHtml` (DOMPurify). TOC dirender sebagai teks Vue (`{{ }}`), bukan
  `v-html`; `id` dibuat lokal. Tidak ada `eval()`/`new Function()`.
- **RBAC**: dock bersifat publik (tampilan). Like/bookmark memakai store yang
  sudah ada (redirect login bila belum autentikasi). Tidak ada aksi
  edit/hapus di dock.
- **Aksesibilitas**: semua tombol memiliki `aria-label`, TOC memakai
  `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, `role="dialog"`,
  focus ring, dan bisa ditutup dengan `Escape`/klik luar.
- **Dark mode**: seluruh elemen memakai varian `dark:`.

---

## 6. Pengujian & Verifikasi

Unit test:

- `frontend/src/composables/usePostReading.test.ts` — slug + dedupe id, level
  heading, clamp progress 0–100, `showBackToTop` saat komentar masuk viewport,
  `backToTop()` memanggil `window.scrollTo({ top: 0, behavior: 'smooth' })`.
- `frontend/src/components/post/PostActionDock.test.ts` — progress tampil saat
  membaca; berganti back-to-top saat `showBackToTop`; klik back-to-top memanggil
  scroll; TOC membuka daftar heading; `Escape` menutup; tombol TOC tersembunyi
  bila tidak ada heading.

Perintah:

```bash
npm run typecheck && npm run lint && npm run test
```

Smoke manual (produksi/dev): buka post standard, video, audio, dan hero;
scroll artikel → persentase naik; masuk komentar → tombol back-to-top muncul;
TOC melompat ke heading; audio → dock di atas player; viewport 390px & 1280px.
