# Audit & Penyelarasan Layout Responsif Multi-Device

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 & 2 (Mock & PocketBase) |
| **Izin Minimum (RBAC)** | Publik / Subscriber / Penulis / Admin |
| **Komponen Utama** | [main.css](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/styles/main.css), [AppHeader.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/layout/AppHeader.vue), [AppFooter.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/layout/AppFooter.vue), [HeroSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/HeroSection.vue), [PodcastSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/PodcastSection.vue), [CategoriesSection.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/sections/CategoriesSection.vue), [PostCard.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/post/PostCard.vue) |
| **Tanggal Ditambahkan** | 2026-11-04 |

---

## 1. Ringkasan & Tujuan Fitur
Penyelarasan menyeluruh sistem tata letak (responsive layout) aplikasi Ncmaz/Blogku agar tampil presisi, proporsional, dan bebas dari horizontal overflow/scroll jitter di seluruh rentang ukuran perangkat:
- **Mobile Small (< 380px)**: iPhone SE, Galaxy A series, ponsel compact (320px–375px).
- **Mobile Standard (380px – 639px)**: iPhone 12/13/14/15/16, Android flagship.
- **Tablet (640px – 1023px)**: iPad Mini, iPad Air/Pro (Portrait & Landscape), Galaxy Tab.
- **Desktop (1024px – 1439px)**: MacBook, Laptop standard, monitor 1080p.
- **Ultra-wide & 4K (≥ 1440px / 2560px)**: Monitor ultrawide 21:9 dan 4K display.

Masalah yang diselesaikan:
1. `.page-shell` sebelumnya tidak memiliki pembatas `max-width`, menyebabkan konten meregang tak terbatas dari ujung ke ujung pada monitor ultra-wide (>1440px).
2. Header (`AppHeader.vue`) dan Footer (`AppFooter.vue`) memiliki gutter horizontal (`padding-inline`) yang berbeda dengan `.page-shell`, sehingga tepi kiri-kanan tidak sejajar.
3. Carousel kategori (`CategoriesSection.vue`) memiliki margin negatif `-mx-4` dengan padding tidak seimbang (`px-3`), memicu resiko horizontal overflow di ponsel kecil.
4. Hero banner (`HeroSection.vue`) dengan aspect ratio `16/11` memotong judul dan tombol baca pada viewport layar kecil (<380px) karena tinggi vertikal terlalu minim (<220px).
5. Grid 3 kartu floating pada tablet (`sm:grid-cols-2`) meninggalkan kartu ke-3 sendirian di baris kedua.
6. Section podcast (`PodcastSection.vue`) menampilkan 4 pill memanjang penuh secara vertikal pada tablet alih-alih grid proporsional.
7. Kartu Ncmaz Card5 rentan terdorong tombol like bila nama penulis panjang di layar mobile compact.

---

## 2. Alur Pengguna (User Flow)
1. **Pengguna Ponsel Compact (320px – 375px)**:
   - Membuka halaman utama atau postingan: tidak ada horizontal scrolling (`overflow-x: clip`).
   - Hero banner menyajikan tombol baca dan avatar penulis tanpa terpotong (minimum height 320px).
   - Menu drawer mobile (`MobileNav.vue`) merender daftar kategori dalam grid 1 kolom bersih sehingga teks tidak terpotong.
   - Vinyl player pada header audio mengecil proporsional (`h-14 w-14`) dengan ikon tombol play responsif.
2. **Pengguna Tablet (640px – 1023px)**:
   - Grid 3 kartu floating pada hero section merender kartu ke-3 dengan span penuh (`sm:col-span-2`) di baris kedua secara simetris sebelum berubah menjadi 3 kolom di desktop.
   - Section podcast merender 2 kartu besar di atas dan 4 compact pill dalam format 2x2 grid seimbang di bawahnya.
3. **Pengguna Layar Lebar & Ultra-wide (≥ 1440px / 4K)**:
   - Header, main content `.page-shell`, dan footer terpusat rapi dengan `max-width: var(--max-width-8xl, 90rem)` (1440px) dan padding 2rem (`px-8`), menghindarkan konten melebar liar ke sudut monitor.

---

## 3. Arsitektur & Komponen Terkait
- `frontend/src/styles/main.css`: Menambahkan `overflow-x: clip` pada root `html` dan `body`, serta `max-width: var(--max-width-8xl, 90rem); width: 100%;` pada `.page-shell`.
- `frontend/src/components/layout/AppHeader.vue`: Penyelarasan container `mx-auto max-w-8xl px-4 sm:px-6 lg:px-8`.
- `frontend/src/components/layout/AppFooter.vue`: Penyelarasan container `mx-auto max-w-8xl px-4 py-14 sm:px-6 lg:py-20 lg:px-8`.
- `frontend/src/components/sections/HeroSection.vue`: Mengatasi benturan CSS aspect-ratio mobile dengan `w-full max-w-full aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/7]` tanpa auto-width expansion liar; menghapus negatif margin `md:-mt-20` menjadi margin natural `mt-4 sm:mt-6 lg:mt-8` sehingga 3 kartu sub-featured tidak lagi bertumpuk/menabrak tombol CTA (*collision: 0px* di semua viewport).
- `frontend/src/components/sections/VideoSection.vue`: Mengganti `truncate` menjadi `line-clamp-2 leading-snug` pada judul video di daftar putar (playlist queue) agar judul panjang seperti *"Cara Deploy Blogku di VPS: Panduan Lengkap untuk Pemula"* tidak terpotong elipsis di tengah kata.
- `frontend/src/components/sections/CategoriesSection.vue`: `-mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0` untuk full-bleed carousel mobile/tablet dan in-grid desktop.
- `frontend/src/components/sections/PodcastSection.vue`: `sm:grid-cols-2 lg:flex lg:flex-col` pada container compact pill cards.
- `frontend/src/components/post/PostCard.vue`: `min-w-0 flex-1 truncate` pada author info di layout Card5.
- `frontend/src/components/post/AudioPostHeader.vue`: Tombol vinyl responsif `h-14 w-14 sm:h-20 sm:w-20`.
- `frontend/src/layouts/AdminLayout.vue`: `lg:ps-72` logical property padding.
- `frontend/src/pages/AuthorPage.vue` & `ProfilePage.vue`: `flex-wrap` pada tombol aksi sosial dan navigasi profil.

---

## 4. Kontrak Data & TypeScript Schema
Perubahan bersifat visual & arsitektur CSS/Tailwind, tidak mengubah kontrak data TypeScript atau schema PocketBase backend.

---

## 5. Keamanan & Otorisasi
- **RBAC**: Akses layout publik terbuka untuk semua peran; area `/admin` tetap terkunci khusus role `admin`.
- **Sanitasi HTML**: Tidak ada bypass DOMPurify atau penggunaan innerHTML mentah baru.
- **XSS Prevention**: Semua elemen dinamis terikat melalui Vue 3 template binding aman (`{{ }}`).

---

## 6. Pengujian & Verifikasi
1. **Pemeriksaan Tipe TypeScript**:
   ```bash
   npm run typecheck
   # Lulus: vue-tsc --noEmit (0 error)
   ```
2. **Pemeriksaan Linter**:
   ```bash
   npm run lint
   # Lulus: eslint . (0 error)
   ```
3. **Pengujian Unit Vitest**:
   ```bash
   npm run test
   # Lulus: 25 test file, 233 passed (100% green)
   ```
4. **Verifikasi Build Produksi Vite**:
   ```bash
   npm run build
   # Berhasil compile dist bundle tanpa warning
   ```
