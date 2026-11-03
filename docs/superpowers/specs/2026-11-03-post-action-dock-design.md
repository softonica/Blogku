# Post Action Dock (floating control menu) — Design

| Metadata | Keterangan |
| :--- | :--- |
| **Tanggal** | 2026-11-03 |
| **Status** | Menunggu persetujuan |
| **Ukuran pekerjaan** | Fitur sedang (komponen baru + composable + hapus BackToTop) |
| **Referensi** | Demo Ncmaz (`div.sticky.z-40` + popover "On this page") |

## 1. Intent & Why

Halaman post saat ini belum punya akses cepat ke aksi (like/komentar/bookmark)
saat pembaca berada di tengah artikel, dan belum punya daftar isi (TOC).
Permintaan: floating control menu di bawah halaman seperti demo Ncmaz, untuk
**semua tipe post**, berisi like/komentar/bookmark, progress baca, TOC, dan
tombol back-to-top yang muncul saat pembaca sampai di section komentar.
Karena back-to-top sudah pindah ke dock, komponen `BackToTop` lama dihapus.

## 2. Goals

- Dock floating di semua halaman post (standard, video, gallery, audio, hero).
- Pill 1: like + jumlah, divider, komentar + jumlah, divider, bookmark,
  divider, lalu **satu slot kontrol**:
  - selama pembaca berada di area konten artikel → tampil **persentase baca
    `NN%`**;
  - begitu section komentar tercapai (dan ke bawah) → slot yang sama berganti
    menjadi tombol **back to top** (ikon panah atas).
- Pill 2: tombol TOC (ikon daftar) → popover **"On this page"** berisi heading
  artikel (`h2`/`h3`, plus `h4` bila ada) dengan indentasi level dan ikon panah;
  klik heading → scroll ke section.
- Untuk post audio, dock berada **di atas player dock** (pakai
  `--player-dock-height`), tidak bertumpuk.
- Hapus `BackToTop.vue` dan pemakaiannya di `App.vue`.

## 3. Non-goals & Anti-goals

- Bukan mengubah isi/urutan komentar, form komentar, atau player audio.
- Tidak menambah aksi share/views ke dock (tetap di header).
- Anti-goal: TOC memakai HTML mentah (`v-html`) baru; semua data heading
  diambil dari DOM yang sudah disanitasi dan dirender sebagai teks Vue.

## 4. Pendekatan

### A. Komponen fixed + composable (dipilih)

`PostActionDock.vue` dirender sekali di `PostPage.vue` dengan posisi
`fixed` di bawah tengah; composable `usePostReading` mengurus progress,
pengumpulan heading, dan deteksi section komentar. Kelebihan: selalu tampil di
semua layout (termasuk hero/magazine), offset audio mudah, tidak terpengaruh
struktur artikel.

### B. Sticky di dalam kolom artikel (seperti Ncmaz) — ditolak

Dock hanya terlihat selama kolom artikel ada di viewport; pada hero/magazine
posisinya sulit konsisten dan harus diduplikasi per layout.

## 5. Arsitektur & Komponen

```
PostPage.vue
├── <article ref="articleRef" v-html="cleanContent">
├── <CommentList id="comments"> (sudah ada)
└── <PostActionDock
        :post :headings :progress :show-back-to-top
        @comments="scrollToComments" />

composables/usePostReading.ts
├── headings: TocHeading[]  (id, text, level)
├── progress: number        (0–100)
├── showBackToTop: boolean  (comments section tercapai)
├── collectHeadings()       (dipanggil setelah konten render)
└── backToTop()

components/post/PostActionDock.vue
├── pill aksi: LikeButton compact md, komentar, SaveButton md, progress,
│              tombol ArrowUp (v-if showBackToTop)
└── pill TOC: tombol ikon + popover "On this page"
```

### 5.1 Composable `usePostReading`

```ts
interface TocHeading { id: string; text: string; level: 2 | 3 | 4 }

function usePostReading(options: {
  articleRef: Ref<HTMLElement | null>
  commentsId?: string // default 'comments'
}): {
  headings: Ref<TocHeading[]>
  progress: Ref<number>
  showBackToTop: Ref<boolean>
  collectHeadings: () => void
  backToTop: () => void
}
```

- `collectHeadings()`: ambil `h2, h3, h4` di dalam article; untuk tiap heading
  buat `id` dari teks (`slugify`, dedupe `-2`, `-3`, …) bila belum ada; isi
  `headings`.
- `progress`: `clamp((scrollY - articleTop) / max(1, articleHeight - innerHeight)) * 100`.
- `showBackToTop`: `comments.getBoundingClientRect().top <= innerHeight` (section
  komentar sudah masuk viewport).
- Listener `scroll` (passive) + `resize`; cleanup `onBeforeUnmount`.
- `backToTop()`: `window.scrollTo({ top: 0, behavior: 'smooth' })`.

## 6. Kontrak Komponen

`frontend/src/components/post/PostActionDock.vue`

```ts
defineProps<{
  post: Post
  headings: TocHeading[]
  progress: number
  showBackToTop: boolean
}>()

defineEmits<{ comments: [] }>()
```

- Root: `fixed inset-x-0 bottom-0 z-40 pointer-events-none` dengan inner
  `pointer-events-auto flex justify-center` dan
  `style="bottom: calc(var(--player-dock-height, 0px) + 1rem)"`.
- Pill: `flex items-center gap-1 rounded-full bg-white p-1.5 text-xs shadow-lg ring-1 ring-neutral-900/5 ring-offset-1 sm:gap-2 dark:bg-neutral-800 dark:ring-neutral-700 dark:ring-offset-neutral-600`.
- Tombol bulat `h-9 w-9` dengan ikon 18px (sesuai Ncmaz).
- Progress: `button`/`span` `h-9 min-w-9 px-1 text-xs font-semibold`.
- Back-to-top: tombol `ArrowUp` `h-9 w-9`, `aria-label="Back to top"`.
- TOC: tombol `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`;
  popover `role="dialog"` `aria-labelledby`, `absolute bottom-full mb-3`,
  `max-h-[min(70vh,600px)] overflow-y-auto .nc-no-scrollbar`, lebar
  `w-[min(90vw,20rem)]`; daftar `ol` dengan `space-y-3 text-sm`; sub-list
  `ps-4 text-neutral-500 dark:text-neutral-300`; tutup pada klik luar/Escape.
- TOC disembunyikan bila `headings.length === 0`.

## 7. Integrasi

| Lokasi | Perubahan |
| :--- | :--- |
| `PostPage.vue` | Tambah `articleRef` pada `<article>`, pakai `usePostReading`, render `<PostActionDock>` sekali (semua post type), panggil `collectHeadings()` setelah `post`/`content` berubah (`watch` + `nextTick`). |
| `App.vue` | Hapus import + `<BackToTop />`. |
| `layout/BackToTop.vue` | Dihapus. |
| `styles/main.css` | `.nc-no-scrollbar` sudah ada; dipakai popover TOC. |

## 8. Aksesibilitas, Keamanan, Mobile

- Semua tombol punya `aria-label`; focus ring `focus-visible:ring-2`.
- TOC hanya teks dari `textContent`; `id` dibuat lokal. Tidak ada `v-html` baru,
  tidak ada `eval`/`new Function`.
- Dark mode pada semua elemen.
- Mobile: dua pill tetap satu baris, popover `max-w-[min(90vw,20rem)]`, bisa
  scroll tanpa scrollbar terlihat.

## 9. Pengujian & Verifikasi

- Unit `usePostReading`: slug + dedupe id, heading level, progress clamp 0–100,
  `showBackToTop` saat komentar masuk viewport (mock `getBoundingClientRect`).
- Unit `PostActionDock`: merender like/komentar/bookmark/progress; TOC toggle
  membuka daftar heading; Escape menutup; tombol back-to-top hanya muncul saat
  `showBackToTop` dan memanggil scroll.
- `npm run typecheck && npm run lint && npm run test` (target tetap 100% lulus).
- Smoke produksi setelah deploy: standard, video, audio (dock di atas player),
  hero; 390px & 1280px; TOC scroll ke heading; back-to-top muncul di komentar.

## 10. Dokumentasi & DoD

- `docs/features/24-post-action-dock.md`, indeks `docs/README.md`, entri
  `CHANGELOG.md` (format team-work).
- Hapus referensi `BackToTop` di dokumentasi fitur yang menyebutnya bila ada.

## 11. Yang Diserahkan ke Builder

Detail kelas Tailwind akhir, animasi kemunculan back-to-top, dan posisi popover
TOC persis (kiri/kanan) — tidak mengubah kontrak.
