# Redesain Antarmuka Ncmaz Faust & Halaman Submission

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (Mock & State Architecture) / Fase 2 Ready |
| **Izin Minimum (RBAC)** | Publik (Melihat Homepage) / Penulis (Mengakses `/submission`) |
| **Komponen Utama** | [HeroSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/HeroSection.vue), [PodcastSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/PodcastSection.vue), [VideoSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/VideoSection.vue), [CategoriesSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/CategoriesSection.vue), [EditorPage.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/EditorPage.vue) |
| **Tanggal Ditambahkan** | 2026-10-22 |

---

## 1. Ringkasan & Tujuan Fitur

Menyelaraskan seluruh tata letak (layout), tipografi, ambient glow, kartu magazine, dan alur penulisan artikel agar identik dengan referensi resmi **[Ncmaz Faust](https://ncmaz-faust-delta.vercel.app/)**:
1. **Tipografi & Desain Visual**: Penggunaan font **Poppins** (weights 300, 400, 500, 600, 700) dan efek atmospheric background blur orbs (`nc-BgGlassmorphism`) khas Ncmaz.
2. **Hero Section (`nc-SectionHero3`)**: Spanduk hero lengkung bergradasi gelap (`rounded-[40px]`) dilengkapi 3 kartu melayang yang tumpang tindih (`nc-Card5` dengan `md:-mt-20` dan `shadow-2xl`).
3. **Kategori Slider (`nc-SectionSliderNewCategories`)**: Kartu `nc-CardCategory4` dengan rasio `7:5`, zoom hover, dan counter artikel.
4. **Magazine Podcast (`nc-SectionMagazine8`)**: Bagian audio live dengan 2 kartu poster besar (`nc-Card16Podcast`) dan 4 kartu pil horizontal (`nc-Card17Podcast`) dilengkapi tombol play.
5. **Video Interaktif (`nc-SectionSliderPosts`)**: Pemutar video aktif utama (YouTube/MP4) dipasangkan dengan antrean playlist video yang responsif.
6. **Halaman Submission (`/submission`)**: Editor penulisan artikel dokumen-sentris tanpa distraksi dengan header status, title editor tanpa border (`placeholder="New post title here…"`), bar tag interaktif, dan modal *Post options* lengkap.
7. **Otentikasi Demo Cepat**: Dukungan login instan menggunakan akun `demo` dengan kata sandi `demo` (dan `password`).

---

## 2. Alur Pengguna (User Flow)

### A. Eksplorasi Beranda (Homepage)
1. Pengguna membuka `/` dan disajikan spanduk hero visual (`nc-SectionHero3`) dengan 3 kartu melayang `nc-Card5`.
2. Pengguna dapat menggulir slider topik tren (`Top trending topics`) dengan kontrol navigasi prev/next.
3. Pengguna mendengarkan podcast langsung di bagian *Listen to the podcast live 🎶* atau memutar video pada *Trending Videos*.
4. Pengguna menyaring artikel terbaru (*Latest articles 🎈*) berdasarkan tab kategori interaktif tanpa memuat ulang seluruh halaman.

### B. Penulisan & Submission (`/submission`)
1. Pengguna masuk menggunakan kredensial demo (`demo / demo`) atau akun penulis terdaftar.
2. Penulis dialihkan ke `/submission` dengan antarmuka dokumen minimalis.
3. Penulis mengetik judul langsung pada judul besar tanpa border.
4. Penulis dapat mengetik tag `# tag-name` secara inline (tekan spasi atau enter untuk menambahkan, dibatasi maksimal 5 tag).
5. Penulis menekan tombol **Options** (ikon hexagonal) untuk mengatur:
   - Format postingan: *Standard*, *Video*, *Audio*, *Gallery*.
   - Layout postingan: *Style 1* s.d. *Style 4*.
   - Pemilihan kategori multi-select.
   - Ringkasan kutipan (*Excerpt*).
   - Penjadwalan tanggal terbit (*Schedule time*).
   - Pengaturan sidebar dan komentar.
6. Penulis dapat beralih ke tab **Preview** untuk memverifikasi tampilan sebelum menekan **Publish**.

---

## 3. Arsitektur & Komponen Terkait

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue            # Header dengan search pill, "+ Write", divider
│   │   ├── BgGlassmorphism.vue      # Background ambient glow blobs (#ef233c & #04868b)
│   ├── sections/
│   │   ├── HeroSection.vue          # SectionHero3 + Card5 floating grid
│   │   ├── CategoriesSection.vue    # SectionSliderNewCategories + CardCategory4
│   │   ├── PodcastSection.vue       # SectionMagazine8 + Card16Podcast + Card17Podcast
│   │   ├── VideoSection.vue         # SectionSliderPosts + interactive video queue
│   │   ├── NewsletterSection.vue    # Join our newsletter 🎉 banner
│   ├── post/
│   │   ├── PostCard.vue             # layout="vertical" | "horizontal" | "overlay" | "card5"
├── pages/
│   ├── HomePage.vue                 # Menggabungkan seluruh alur section Ncmaz Faust
│   ├── EditorPage.vue               # Halaman submission dokumen-sentris & modal options
│   ├── LoginPage.vue                # Mendukung quick demo account demo/demo
├── router/
│   └── index.ts                     # Mendaftarkan rute /submission dan /submission/:id
```

---

## 4. Kontrak Data & TypeScript Schema

```typescript
// Post Options & Taxonomies
export type PostFormat = 'standard' | 'video' | 'audio' | 'gallery'
export type PostStyle = 'style1' | 'style2' | 'style3' | 'style4'

export interface PostInput {
  title: string
  excerpt: string
  content: string
  postType: PostFormat
  categoryIds: string[]
  tagIds: string[]
  cover?: string
  videoUrl?: string
  audioUrl?: string
  postStyle?: PostStyle
  scheduleTime?: string
  showRightSidebar?: boolean
  allowComments?: boolean
}
```

---

## 5. Keamanan & Otorisasi

1. **Role-Based Access Control (RBAC)**:
   - Rute `/submission` dilindungi oleh route guard `requiresAuth: true` dan permission `write_post`.
   - Hanya pengguna dengan peran `penulis` atau `admin` yang diizinkan menerbitkan artikel.
2. **Pembersihan Konten (XSS Prevention)**:
   - Judul, ringkasan, dan tag disanitasi menggunakan `sanitizePlainText` (menghapus seluruh tag HTML liar).
   - Seluruh konten HTML editor disaring ketat melalui `DOMPurify` via `sanitizeHtml` sebelum dipratinjau atau disimpan.
   - URL media (video/audio/cover) divalidasi protokolnya serta diperiksa terhadap daftar putih (*whitelist*) domain gambar eksternal yang diizinkan.

---

## 6. Pengujian & Verifikasi

1. **Typechecking**: `npm run typecheck` (`vue-tsc --noEmit`) lulus 100% tanpa error.
2. **Unit Test**: `npm run test` (`vitest run`) lulus 59/59 tes.
3. **Demo Auth Test**: Verifikasi otomatis di `mock.source.test.ts` untuk autentikasi kredensial `demo / demo`.
