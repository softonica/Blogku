# 19 - Mobile Compact Layout (Spacing & Dedup)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Implemented |
| **Fase Arsitektur** | Fase 1 (Mock) + Fase 2 (PocketBase) — murni frontend, tidak menyentuh API/backend |
| **Izin Minimum (RBAC)** | Publik (berlaku di seluruh halaman untuk semua role) |
| **Komponen Utama** | [`frontend/src/pages/PostPage.vue`](../../frontend/src/pages/PostPage.vue), [`frontend/src/components/comments/CommentList.vue`](../../frontend/src/components/comments/CommentList.vue), [`frontend/src/pages/ProfilePage.vue`](../../frontend/src/pages/ProfilePage.vue), [`frontend/src/pages/DashboardPage.vue`](../../frontend/src/pages/DashboardPage.vue), 57 file `frontend/src/**/*.vue` (sweep mekanis) |
| **Tanggal Ditambahkan** | 2026-11-01 |

---

## 1. Ringkasan & Motivasi

Permintaan pengguna: **layout mobile lebih compact & hemat space**, plus aturan
**"1 info tidak boleh tampil 2x"** di layar kecil (mis. counter komentar di
action row *dan* di sidebar, atau badge role di dua tempat sekaligus).

Masalah yang diselesaikan:

1. **Spacing & radius berlebihan di mobile** — padding/margin/gap/radius yang
   dirancang untuk desktop membuat konten di layar <640px terasa longgar dan
   memakan ruang vertikal/horizontal yang langka.
2. **Info duplikat di mobile** — blok yang sama (mis. kartu "Written by" dan
   sidebar magazine PostPage) ditampilkan dua kali karena breakpoint tidak
   menyembunyikan salah satunya di layar kecil.

Solusi: (a) sweep mekanis kelas Tailwind di 57 file `.vue` dengan aturan
transformasi eksplisit (base=mobile, `sm:`=desktop), dan (b) penyembunyian
blok duplikat di mobile serta penambahan counter komentar di action row
PostPage.

---

## 2. Alur Pengguna (User Flow)

Tidak ada alur baru — perubahan bersifat presentasi. Perilaku yang berubah:

1. Pengguna membuka post di mobile (<640px): padding/margin/gap antar elemen
   lebih rapat, kartu/hero memakai radius lebih kecil, namun semua informasi
   tetap tampil (tidak ada yang dihilangkan).
2. Di action row post (semua ukuran layar), kini muncul **counter komentar**
   (ikon MessageCircle + angka, mis. `18`) sebelum tombol Share; klik → scroll
   halus ke `#comments`. Counter yang sama tetap tampil di semua ukuran layar
   lewat action row (sebelum tombol Share) — tidak lagi di kotak sidebar.
3. Di mobile, blok duplikat disembunyikan: sidebar magazine PostPage
   (`hidden lg:block`), kartu "Written by" di bawah konten (`hidden sm:flex`),
   badge role di header ProfilePage (`hidden sm:inline-flex`), count duplikat
   di tab/widget DashboardPage.
4. Di desktop (`sm:`+), tampilan kembali identik dengan sebelum perubahan.

---

## 3. Arsitektur & Komponen

Perubahan 100% frontend (CSS/Template `.vue`). Tidak ada perubahan store,
DataSource, API, atau backend.

```
frontend/src/**/*.vue (57 file)
  ├─ Sweep mekanis kelas Tailwind (Task 1) — aturan transformasi di bawah
  ├─ PostPage.vue (Task 2)
  │    ├─ action row: + counter komentar (MessageCircle + formatNumber(post.commentCount))
  │    ├─ scrollToComments() → document.getElementById('comments').scrollIntoView()
  │    ├─ sidebar magazine: hidden lg:block (sembunyikan di mobile)
  │    └─ kartu "Written by" non-magazine: hidden sm:flex (sembunyikan di mobile)
  ├─ CommentList.vue (Task 2) — <section id="comments" aria-labelledby="comments-heading">
  ├─ ProfilePage.vue (Task 3) — badge role header: hidden sm:inline-flex
  └─ DashboardPage.vue (Task 3) — count duplikat tab/widget: hidden di mobile
```

### 3.1 Aturan transformasi spacing & radius

**Prinsip dasar**: `base = mobile (<640px)`, `sm: = desktop (≥640px)`.
Breakpoint `sm` memakai default Tailwind = **640px**. Nilai desktop asli
dipertahankan via prefiks `sm:`; nilai mobile diturunkan.

| Kelas asli | Mobile (<640px) | Desktop (`sm:`+) |
| :--- | :--- | :--- |
| `rounded-3xl` | `rounded-xl` | `sm:rounded-3xl` |
| `rounded-2xl` | `rounded-lg` | `sm:rounded-2xl` |
| `rounded-xl` | `rounded-lg` | `sm:rounded-xl` |
| `rounded-[2rem]` | `rounded-xl` | `sm:rounded-[2rem]` |
| `rounded-[1.5rem]` | `rounded-lg` | `sm:rounded-[1.5rem]` |
| spacing `N` (N = 4–5, p/m/px/py/mt/mb/gap/space…) | `N−1` | `sm:N` |
| spacing `N` (N = 6–10, p/m/px/py/mt/mb/gap/space…) | `N−2` | `sm:N` |

Catatan: `rounded-[1.5rem]` tidak disebut eksplisit di spec desain
(`docs/superpowers/specs/2026-11-01-mobile-compact-layout-design.md`); dicantumkan
sebagai **ekstensi** mengikuti pola yang sama (satu level di bawah `rounded-2xl`).

Contoh nyata:

```
rounded-[2rem]  →  rounded-xl sm:rounded-[2rem]
rounded-3xl     →  rounded-xl sm:rounded-3xl
rounded-2xl     →  rounded-lg sm:rounded-2xl
p-6            →  p-4 sm:p-6
p-5            →  p-4 sm:p-5
mt-8           →  mt-6 sm:mt-8
gap-5          →  gap-4 sm:gap-5
space-y-6      →  space-y-4 sm:space-y-6
```

### 3.2 Aturan kunci (rules)

- **Aturan same-string `sm:`**: jika string kelas *sudah sama* dengan nilai
  mobile target (mis. elemen sudah `rounded-lg`), `sm:` **tidak** ditambahkan
  (hindari `sm:rounded-lg` duplikat yang tidak menghasilkan perubahan).
- **Tidak disentuh**: `rounded-full` (tombol pill/avatar), spacing `< 4`
  (0–3, mis. `p-2`, `gap-2`, `py-1.5`), spacing di atas 10 (mis. `p-16`,
  `px-24`), dan token **negatif** (mis. `-mt-6`).
- Hanya token `padding`/`margin`/`gap`/`space`/`radius` yang diubah; util
  lain (ukuran teks, lebar, `flex`, `grid`, dst.) tidak tersentuh.
- `rounded-lg` tidak diturunkan lebih jauh (level dasar).

---

## 4. Kontrak Data & TypeScript Schema

**Tidak ada kontrak/tipe baru.** Tidak ada perubahan `DataSource`
(`src/api/source.ts`), `types.ts`, atau backend.

Counter komentar memakai field yang sudah ada:

```typescript
export interface Post {
  // ...
  commentCount: number   // sudah ada; kini juga dirender di action row PostPage
  viewCount: number
  // ...
}
```

- `PocketBaseSource` memetakan `record.commentCount` → `post.commentCount`
  (fallback 0 bila bukan number).
- `MockSource` menghitung `commentCount` dari `this.comments.filter(c => c.postId === post.id).length`.
- `PostPage.vue` juga menyinkronkan `post.commentCount` setelah `comments`
  dimuat/ditambahkan/dihapus (baris 124/134), sehingga counter selalu akurat
  tanpa reload.
- Format angka memakai util yang sudah ada: `formatNumber` dari
  `@/lib/format`.

---

## 5. Keamanan & Otorisasi

- **RBAC**: tidak ada perubahan aturan akses. Perubahan murni presentasi;
  berlaku untuk semua role (publik, subscriber, penulis, admin). Route `/admin`
  tetap `adminOnly: true` (lihat fitur 13).
- **Sanitasi / Anti-XSS**: tidak berlaku — tidak ada render HTML kaya baru,
  tidak ada input baru. Counter komentar hanya merender angka (diformat via
  `formatNumber`), bukan HTML.

---

## 6. Panduan Penggunaan (UI/UX)

### Behavior mobile (<640px)

- **Spacing compact**: jarak antar blok/elemen di halaman turun satu langkah
  (mis. `mt-8` → `mt-6`, `p-6` → `p-4`); radius kartu/hero lebih kecil
  (mis. `rounded-3xl` → `rounded-xl`). Semua konten tetap tampil.
- **PostPage**: tombol **Comments (N)** (ikon MessageCircle) muncul di action
  row sebelum tombol Share; klik → scroll halus ke daftar komentar
  (`#comments`). Sidebar magazine dan kartu "Written by" disembunyikan agar
  info tidak tampil dua kali.
- **ProfilePage**: badge role di header disembunyikan (role tetap tampil sekali
  lewat kartu "Your Role").
- **DashboardPage**: angka count duplikat di tab ("Published (N)" →
  "Published", "Drafts (N)" → "Drafts") dan widget "Local drafts"
  disembunyikan; angka tetap tampil sekali di kartu statistik atas.

### Behavior desktop (≥640px)

- Identik dengan sebelum perubahan: `sm:` mengembalikan nilai asli; blok yang
  disembunyikan di mobile kembali tampil.

---

## 7. Pengujian & Verifikasi

Perintah (dijalankan di `frontend/`):

```bash
npm run typecheck   # vue-tsc --noEmit → lulus
npm run lint        # eslint . → bersih tanpa error
npm run test        # vitest run → 150/150 passed
npm run build       # vite build → sukses
```

Verifikasi manual direkomendasikan (belum otomatis):

- **375px** (mobile): buka Home, PostPage (semua style), ProfilePage,
  DashboardPage, EditorPage — pastikan tidak ada overflow horizontal
  (`scrollWidth − clientWidth = 0`), blok duplikat tidak tampil, counter
  komentar tampil sebelum tombol Share dan meng-scroll ke `#comments`.
- **≥640px (sm:+)**: periksa halaman sama — tampilan harus identik dengan
  sebelum perubahan (nilai desktop asli, blok duplikat kembali tampil).
- Dark mode: cek kedua ukuran layar di tema terang & gelap.
