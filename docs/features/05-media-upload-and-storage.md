# 05 - Media Upload, Image Whitelisting & Storage System

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable (Frontend & Mock) → Spesifikasi Backend Selesai |
| **Fase Arsitektur** | Fase 1 (Client Upload & Whitelist) → Fase 2 PocketBase (Local / S3) |
| **Izin Minimum (RBAC)** | Penulis / Admin (Upload & Cover), Subscriber+ (Avatar), Admin (Domain Whitelist & Site Settings) |
| **Komponen Utama** | [`src/pages/admin/AdminSettingsPage.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/admin/AdminSettingsPage.vue), [`src/pages/ProfilePage.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/ProfilePage.vue), [`src/pages/EditorPage.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/pages/EditorPage.vue), [`src/lib/image-domains.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/image-domains.ts) |
| **Tanggal Ditambahkan** | 2026-10-22 |

---

## 1. Ringkasan & Tujuan Fitur
Menyediakan sistem penanganan media dan gambar yang aman dan fleksibel:
1. **Upload File Gambar Langsung**: Pengguna dapat mengunggah foto profil, gambar unggulan cerita (*feature image cover*), dan menyisipkan gambar artikel di Tiptap editor secara langsung dari perangkat mereka.
2. **Pembatasan URL Gambar Eksternal (Domain Whitelist)**: Mencegah hotlinking berbahaya, kebocoran privasi pembaca, atau eksploitasi URL pelacak dengan membatasi URL gambar hanya pada domain yang diizinkan oleh Admin.
3. **Konfigurasi Branding Situs**: Admin dapat mengunggah dan mengatur Logo situs dan Favicon lengkap dengan panduan ukuran yang direkomendasikan.
4. **Spesifikasi Backend Storage**: Menyediakan arsitektur penyimpanan ganda di PocketBase (Local Disk vs S3-Compatible Storage).

---

## 2. Alur Pengguna (User Flow)
1. **Upload Foto Profil**:
   - Di `/profile`, pengguna memilih avatar preset atau menekan tombol **Upload Photo** untuk memilih file dari komputer.
   - Atau memasukkan URL gambar eksternal yang divalidasi terhadap daftar domain yang diizinkan.
2. **Upload Cover Cerita**:
   - Di `/editor`, penulis dapat menekan tombol **Upload Cover** untuk mengunggah gambar unggulan langsung ke draft/cerita.
3. **Penyisipan Gambar Artikel**:
   - Di toolbar Tiptap editor, penulis dapat mengklik icon **Upload** untuk memasukkan gambar lokal, atau icon **Image URL** untuk memasukkan link gambar dari domain yang diizinkan.
4. **Manajemen Domain Eksternal oleh Admin**:
   - Di `/admin/settings`, admin dapat melihat daftar domain gambar yang diperbolehkan (`allowedImageDomains`), menghapus domain tertentu, atau menambahkan domain baru (misal `cdn.mysite.com`).
5. **Pengaturan Logo & Favicon**:
   - Di `/admin/settings`, admin dapat mengunggah logo header dan favicon tab browser lengkap dengan petunjuk resolusi yang direkomendasikan.

---

## 3. Rekomendasi Ukuran Aset Branding

| Aset | Rekomendasi Resolusi | Rasio | Format | Batas Ukuran File |
| :--- | :--- | :---: | :--- | :---: |
| **Site Logo** | **240 × 60 px** | 4:1 | PNG (transparan) atau SVG | &lt; 1 MB |
| **Favicon** | **64 × 64 px** atau **32 × 32 px** | 1:1 | PNG atau ICO | &lt; 200 KB |
| **Post Feature Image** | **1200 × 675 px** | 16:9 | WebP / JPEG / PNG | &lt; 2 MB |
| **User Avatar** | **256 × 256 px** | 1:1 | WebP / JPEG / PNG | &lt; 1 MB |

---

## 4. Keamanan & Pembatasan Domain (Image Whitelisting)
- **Fungsi Verifikasi**: [`isAllowedImageDomain(url, allowedDomains)`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/image-domains.ts) memeriksa apakah host dari URL cocok dengan domain yang terdaftar di `siteSettings.allowedImageDomains` atau subdomain-nya.
- **Upload Lokal & Data URL**: Gambar yang diunggah langsung (menghasilkan path lokal `/...` atau `data:image/...`) selalu diizinkan.
- **Protokol Berbahaya**: Fungsi [`sanitizeUrl()`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/sanitize.ts) menolak protokol `javascript:`, `vbscript:`, atau `data:text/html`.

---

## 5. Spesifikasi Target Sistem Storage Backend (PocketBase Fase 2)

Di backend PocketBase, admin dapat menentukan target sistem penyimpanan:

### Mode 1: Local Filesystem Storage (Bawaan)
- Lokasi: Direktori lokal `./pb_data/storage`.
- Keunggulan: Zero-configuration, performa disk I/O cepat, mandiri tanpa dependensi pihak ketiga.
- Cocok untuk: Server VPS tunggal atau *self-hosting* mandiri.

### Mode 2: S3-Compatible Object Storage
- Kompatibilitas: **AWS S3**, **Cloudflare R2**, **MinIO**, **Wasabi**, **DigitalOcean Spaces**.
- Konfigurasi via PocketBase Settings:
  - `Bucket`: Nama bucket penyimpanan.
  - `Region`: Wilayah datacenter (misal `auto` untuk R2 atau `us-east-1`).
  - `Endpoint`: URL endpoint S3 (misal `https://<account-id>.r2.cloudflarestorage.com`).
  - `Access Key` & `Secret Key`: Kredensial autentikasi terenkripsi.
- Keunggulan: Skalabilitas tinggi, tidak membebani kapasitas disk VPS, mendukung distribusi CDN global.

---

## 6. Pengujian & Verifikasi
- **Unit Test Domain**: [`src/lib/image-domains.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/image-domains.test.ts)
- **Unit Test Upload & Sanitasi**: [`src/api/mock.source.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/api/mock.source.test.ts) dan [`src/lib/sanitize.test.ts`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/sanitize.test.ts)
- Jalankan:
  ```bash
  cd frontend
  npm run test -- src/lib/image-domains.test.ts
  ```
