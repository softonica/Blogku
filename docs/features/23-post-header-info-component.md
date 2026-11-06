# Komponen Post Header Info (Reusable antar Tipe Post)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 2 (PocketBase) — frontend-only, tanpa perubahan backend |
| **Izin Minimum (RBAC)** | Publik (tampilan) / Penulis & Admin (menu Edit di tombol `...`) |
| **Komponen Utama** | [PostHeaderInfo.vue](frontend/src/components/post/PostHeaderInfo.vue) · [AppAvatar.vue](frontend/src/components/ui/AppAvatar.vue) · [LikeButton.vue](frontend/src/components/post/LikeButton.vue) · [SaveButton.vue](frontend/src/components/post/SaveButton.vue) · [AudioPostHeader.vue](frontend/src/components/post/AudioPostHeader.vue) · [PostPage.vue](frontend/src/pages/PostPage.vue) |
| **Tanggal Ditambahkan** | 2026-11-03 |

---

## 1. Ringkasan & Tujuan Fitur

Sebelum fitur ini, setiap tipe/layout post menampilkan info author dan baris aksi dengan gaya berbeda: `AudioPostHeader.vue` punya versi ringkas, sedangkan `PostPage.vue` punya header standar, overlay hero, sidebar magazine, dan action row pill terpisah. Ini menyebabkan duplikasi markup dan inkonsistensi visual antar post type (bertentangan dengan aturan dedup pada `docs/features/19-mobile-compact-layout.md`).

Fitur ini menghadirkan **satu komponen reusable `PostHeaderInfo.vue`** sebagai satu-satunya sumber tampilan info author + aksi post: avatar, nama author (link), tanggal · reading time, dan baris tombol bulat (like + jumlah, komentar + jumlah, views + jumlah, pemisah, bookmark, share). Komponen dipakai di semua tipe post (audio, standard, video, hero) dengan dua varian `tone` (default / on-image untuk overlay cover hero).

Non-goals: tidak ada menu `...`, tidak mengubah store/DataSource/backend, tidak mendesain ulang kartu sidebar magazine (hanya menghapus duplikasi).

---

## 2. Alur Pengguna (User Flow)

1. Pengguna membuka halaman post apa pun (`postType = audio/standard/video`, style 1–4).
2. Di bawah excerpt (atau di dalam overlay untuk hero style 4) tampil `PostHeaderInfo`: avatar + nama author (link ke `/author/:username`), tanggal · reading time, lalu baris aksi bulat.
3. Klik **Like** → toggle like (wajib login; jika belum login redirect ke halaman login lalu kembali). Klik **Bookmark** → simpan/lepas bookmark. Klik **Comments** → emit `comments` dan `PostPage` scroll ke `#comments`. Klik **Share** → emit `share` dan membuka modal share.
4. Penulis/admin: tombol Edit tidak lagi berada di baris aksi maupun breadcrumb; akses edit ada di menu `...` (paling kanan baris aksi) → "Edit post". Breadcrumb hanya menampilkan Home / kategori / judul, satu baris yang bisa digeser ke samping di mobile tanpa scrollbar terlihat.

---

## 3. Arsitektur & Komponen Terkait

```
PostHeaderInfo.vue (komponen reusable)
   ├── AppAvatar.vue (avatar 44px, dibungkus RouterLink → /author/:username)
   ├── LikeButton.vue (variant="compact", size="md", tone)
   ├── SaveButton.vue (variant="icon", size="md", tone)
   ├── lib/format.ts (formatDate, formatNumber)
   └── lucide-vue-next (Eye, MessageCircle, Share2)

Dipakai oleh:
   ├── AudioPostHeader.vue → <PostHeaderInfo> (emit comments/share diteruskan)
   └── PostPage.vue → <PostHeaderInfo> (standard/video style 1–3, di bawah excerpt)
                     → <PostHeaderInfo tone="on-image"> (hero style 4, di dalam overlay)
```

Tidak ada perubahan pada `stores/reaction.ts`, `stores/bookmark.ts`, `DataSource`, atau backend.

### Matriks Integrasi (dari spec §6)

| Lokasi | Perubahan |
| :--- | :--- |
| `AudioPostHeader.vue` | Blok author + meta + action row diganti `<PostHeaderInfo>`; emit `comments`/`share` diteruskan ke `PostPage`. |
| `PostPage.vue` — standard, video & gallery (style 1–3) | Baris author/tanggal dan action row pill diganti satu `<PostHeaderInfo>` di bawah excerpt. |
| `PostPage.vue` — hero (style 4) | Meta author di dalam overlay diganti `<PostHeaderInfo tone="on-image">`; action row pill di bawah hero dihapus agar tidak duplikat. |
| `PostPage.vue` — magazine (style 3) | Sidebar "Written by" tidak lagi merender author + Like/Save/Share (duplikat); hanya menyisakan kartu "Post details". |
| Breadcrumb `PostPage.vue` | Hanya Home / kategori / judul; satu baris `flex-nowrap overflow-x-auto` dengan scrollbar disembunyikan (`.nc-no-scrollbar`) di mobile, wrap normal di `sm:`. |

**Reusability semua tipe post:** komponen tidak bergantung pada `postType`/`postStyle` — hanya menerima `post` dan `tone`. Jalur render:

- `audio` → `AudioPostHeader.vue` (header vinyl) → `PostHeaderInfo` (tone default).
- `standard`, `video`, `gallery` (style 1–3) → `<header>` standar `PostPage.vue` → `PostHeaderInfo` (tone default).
- `style4` (hero) → overlay cover → `PostHeaderInfo` (`tone="on-image"`).
- Post audio tanpa `audioUrl` atau style tak dikenal → jatuh ke header standar, tetap memakai `PostHeaderInfo`.

Ada unit test yang merender komponen untuk keempat nilai `PostType` (`standard`, `video`, `audio`, `gallery`) dan memastikan author + tombol komentar/share tetap muncul.

---

## 4. Kontrak Data & TypeScript Schema

### Kontrak `PostHeaderInfo.vue`

```typescript
// frontend/src/components/post/PostHeaderInfo.vue
const props = withDefaults(
  defineProps<{
    post: Post
    tone?: 'default' | 'on-image' // default: 'default'
  }>(),
  { tone: 'default' },
)

const emit = defineEmits<{
  comments: []
  share: []
}>()
```

Struktur render mengikuti markup/class Ncmaz (`nc-SingleHeader`): root `flex flex-wrap justify-between gap-5 sm:items-end` — author di kiri, aksi di kanan; di layar sempit aksi wrap ke bawah dan rata kiri. Author: avatar `h-10 w-10 sm:h-11 sm:w-11` (`ring-1 ring-white`), nama `block font-semibold` (inherits `text-base`), meta `mt-[6px] text-xs` dengan pemisah `mx-2 font-semibold`. Baris aksi: grup statistik `gap-2 sm:gap-2.5`; circle `h-9 w-9`, ikon 18px (views & menu 20px), jumlah `ms-2 min-w-4.5 text-xs`; divider `h-5 sm:h-6`; grup kanan `grow justify-end gap-2 sm:gap-2.5`; bookmark/share/menu `h-9 w-9`.

Menu `...` hanya dirender bila `canManagePost` (admin atau penulis pemilik post). Klik membuka popup `role="menu"` berisi satu item `role="menuitem"` "Edit post" → `/editor/:id` (ikon pensil). Popup tertutup saat klik di luar atau tombol `Escape` (fokus kembali ke trigger); di `tone="on-image"` popup terbuka ke atas agar tidak terpotong `overflow-hidden` cover hero.

### Prop baru pada atom (opsional, default tidak berubah)

```typescript
// LikeButton.vue — tambahan
size?: 'sm' | 'md'        // default 'sm'
tone?: 'default' | 'on-image' // default 'default'

// SaveButton.vue — tambahan
size?: 'sm' | 'md'        // default 'sm'
tone?: 'default' | 'on-image' // default 'default'
```

Tidak ada perubahan schema Zod/API/backend.

---

## 5. Keamanan & Otorisasi

- **RBAC**: Komponen bersifat publik (tampilan). Aksi like/bookmark memakai store yang sudah ada dengan redirect login bila belum autentikasi. Menu `...` dan item "Edit post" hanya dirender bila `canManagePost` (role `admin` atau penulis pemilik post); breadcrumb tidak memuat aksi edit.
- **Sanitasi / Anti-XSS**: Komponen tidak merender HTML kaya; semua teks dirender sebagai teks Vue (escaped). Nama author, judul (untuk `aria-label` bookmark) dan tanggal dilewatkan sebagai binding data, bukan `v-html`. Tidak ada `eval()`/`new Function()`.
- **Aksesibilitas / Dark mode**: Nilai `aria-label` pada tombol komentar/share/views, `<time datetime>`, focus ring (`focus-visible:ring-2`), dan varian `dark:` pada semua kelas; `tone="on-image"` memakai teks putih di atas cover hero.

---

## 6. Pengujian & Verifikasi

**Unit test** (`frontend/src/components/post/PostHeaderInfo.test.ts`):
- Merender link `/author/john` dengan nama author, tanggal terformat (`formatDate`), dan reading time ("4 min read").
- Menampilkan jumlah views/komentar terformat (`formatNumber`), stub `LikeButton`/`SaveButton` hadir.
- Emit `comments` (klik tombol `aria-label^="Comments"`) dan `share` (klik `aria-label="Share post"`).
- Kelas `tone="on-image"` diterapkan (`text-white`).
- Komponen dirender untuk keempat `PostType` (`standard`, `video`, `audio`, `gallery`) dan tetap menampilkan author + komentar/share.
- Blok author dan aksi memakai layout Ncmaz (`justify-between`, bukan center).
- Menu `...` tidak muncul untuk pengunjung; untuk penulis/admin, klik membuka `role="menu"` dengan item "Edit post" menuju `/editor/:id`; `Escape` menutup menu.

**Perintah otomatis** (dari `frontend/`):
```bash
npm run typecheck && npm run lint && npm run test
```
Semua lulus (typecheck vue-tsc --noEmit bersih, eslint bersih, vitest hijau).

**Verifikasi manual** (dev server):
- Buka post audio, standard (style 1–4), dan video.
- Cek mode terang & gelap; lebar 375px dan 1440px (baris aksi wrap rapi di mobile).
- Like tanpa login → redirect login lalu kembali; bookmark toggle; share membuka modal; klik komentar scroll ke `#comments`.
