# 16 - Client-Side Image Processing (WebP + Multi-Variant)

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Implemented |
| **Fase Arsitektur** | Fase 2 (PocketBase) — prosesing tetap di browser |
| **Izin Minimum (RBAC)** | Penulis / Admin (upload); Publik (lihat gambar) |
| **Komponen Utama** | [`frontend/src/lib/imageProcessor.ts`](../../frontend/src/lib/imageProcessor.ts), [`frontend/src/workers/imageProcessor.worker.ts`](../../frontend/src/workers/imageProcessor.worker.ts), [`frontend/src/composables/useImageUpload.ts`](../../frontend/src/composables/useImageUpload.ts), [`frontend/src/lib/image.ts`](../../frontend/src/lib/image.ts), [`frontend/src/components/ui/PostImage.vue`](../../frontend/src/components/ui/PostImage.vue), [`frontend/src/pages/admin/AdminEditorSettingsPage.vue`](../../frontend/src/pages/admin/AdminEditorSettingsPage.vue), [`frontend/src/api/types.ts`](../../frontend/src/api/types.ts) |
| **Tanggal Ditambahkan** | 2026-10-27 |

---

## 1. Ringkasan & Motivasi

Setiap gambar yang di-upload user diasumsikan tampil di banyak konteks dengan
ukuran berbeda (kartu post, hero, avatar, gambar inline editor). Saat ini file
asli di-upload apa adanya; gambar besar (mis. 12MP) dikirim utuh dan browser
mendownloadnya penuh meski hanya ditampilkan 320px.

Tujuan fitur:

1. **Encode otomatis ke WebP** saat upload (tanpa backend).
2. **Resize ke 3 varian**: `thumb` (320px), `medium` (1024px), `full`
   (min(ukuran asli, maxDimension), default 2048px).
3. **Pengaturan admin**: batas dimensi (`imageMaxDimension`) dan kualitas
   (`imageQuality`) dapat diubah dari Admin Editor Settings.
4. **Keamanan**: MIME palsu / file berbahaya dinetralkan oleh pipeline decode
   + re-encode (lihat Bagian 5).

## 2. Alur Pengguna (User Flow)

1. Pengguna memilih file gambar di salah satu titik upload (5 halaman, 7 call
   site — lihat Bagian 3).
2. Sistem memvalidasi: tipe MIME allowlist + ukuran ≤ `maxImageUploadSize`
   (setting, default 5MB) + **decode nyata** via `createImageBitmap`
   (gagal = tolak; MIME palsu otomatis ketolak).
3. Sistem melakukan sniff dimensi header (anti pixel-bomb) sebelum decode.
4. Gambar diproses di **Web Worker**: resize (lanczos3) + encode WebP
   (q = `imageQuality`) menjadi 3 varian; tanpa upscale.
5. Setiap varian di-upload sebagai record terpisah ke koleksi `media`
   (PocketBase) via `DataSource.uploadFile` yang sudah ada.
6. URL `full` yang tersimpan menyertakan metadata varian di fragment
   (`#imgv1&t=...&m=...&w=...`). Fragment tidak pernah dikirim ke server,
   sehingga display layer bisa membangun `srcset` tanpa skema tambahan
   (Bagian 4).
7. GIF animasi: **passthrough** — tidak diproses, langsung di-upload apa
   adanya (satu record).

## 3. Arsitektur & Komponen

```
UI (pick file)
 └─ useImageUpload (composable)                       [src/composables/useImageUpload.ts]
     ├─ baca EditorSettings (imageMaxDimension, imageQuality, maxImageUploadSize)
     ├─ validate(file) → MIME + size + createImageBitmap (decode nyata)
     ├─ sniff header → anti pixel-bomb (>10000px / >24MP = tolak)
     ├─ spawn worker (singleton, Vite module worker)
     │    └─ imageProcessor.worker.ts
     │         ├─ OffscreenCanvas + @jsquash/resize (lanczos3)
     │         └─ @jsquash/webp encode (q = imageQuality)
     ├─ ImageBitmap → worker (transferable), hasil → ArrayBuffer[3]
     ├─ bungkus jadi File (.webp): thumb.webp, medium.webp, full.webp
     └─ uploadFile() per varian (paralel, dedupe bila dimensi sama)
          └─ fragment URL (#imgv1...) → buildSrcSet/PostImage
```

File baru:

- `frontend/src/lib/imageMeta.ts` — fungsi murni: `sniffImage` (PNG IHDR /
  JPEG SOF / GIF logical screen / WebP VP8X / AVIF ispe), `inspectImageFile`
  (batas ukuran + dimensi), `computeVariantPlan`, `clampImageMaxDimension`,
  `clampImageQuality`, `isAnimatedImage`.
- `frontend/src/lib/imageEncoder.ts` — `encodeVariants(bitmap, plan, quality)`:
  OffscreenCanvas + `@jsquash/resize` (lanczos3) + `@jsquash/webp`; fallback
  `canvas.toBlob('image/webp')` bila WASM gagal; dedupe encode per dimensi.
- `frontend/src/lib/imageProcessor.ts` — `inspectImage`, `processImageFile`;
  worker singleton, antrean serial, terminate saat `pagehide`.
- `frontend/src/workers/imageProcessor.worker.ts` — Vite module worker.
- `frontend/src/composables/useImageUpload.ts` — `uploadProcessedImage(file)`
  → `{ full, thumb, medium, passthrough? }`; GIF animasi → `uploadFile` biasa.
- `frontend/src/lib/imageVariants.ts` — codec fragment varian
  (`encodeImageVariants`, `parseImageVariants`, `stripImageVariants`).

Integrasi (ganti `uploadFile(file)` → `uploadProcessedImage(file)`):

| Lokasi | Baris | Konteks |
| :--- | :---: | :--- |
| `components/editor/EditorToolbar.vue` | 140 | gambar inline editor |
| `pages/ProfilePage.vue` | 92 | avatar |
| `pages/ProfilePage.vue` | 112 | cover banner |
| `pages/EditorPage.vue` | 118 | featured image post |
| `pages/admin/AdminTaxonomiesPage.vue` | 159 | gambar kategori |
| `pages/admin/AdminSettingsPage.vue` | 95 | logo |
| `pages/admin/AdminSettingsPage.vue` | 113 | favicon / logo dark |

Catatan pemakaian varian:

- Avatar & logo: gunakan `medium` (URL tanpa fragment).
- Favicon: `thumb`.
- Kartu/hero/tumbnail: `thumb` / `medium` via `buildSrcSet` (PostImage).
- Gambar inline editor, featured image, cover, kategori: `full` (URL
  ber-fragment; tiga varian tetap dihasilkan).

## 4. Kontrak Data & TypeScript Schema

### Settings baru (`EditorSettings`)

```typescript
export interface EditorSettings {
  // ... field existing ...
  maxContentLength: number
  maxImageUploadSize: number
  // BARU:
  imageMaxDimension: number   // px, default 2048, clamp [256, 4096]
  imageQuality: number         // 0.1–1, default 0.8, step 0.05
}
```

`DEFAULT_EDITOR_SETTINGS` (lib/editor-defaults.ts) → `imageMaxDimension: 2048`,
`imageQuality: 0.8`. Implementasi `updateEditorSettings` di `mock.source.ts`
dan `pocketbase.source.ts` menambah clamp sanitasi: `imageMaxDimension` clamp
[256, 4096]; `imageQuality` clamp [0.1, 1] (bulatkan 2 desimal).

`PbEditorSettingsRecord` + `mapEditorSettings` (pocketbase.source.ts)
memetakan `imageMaxDimension` / `imageQuality` dengan default yang sama.

### Hasil proses

```typescript
export type ImageVariantKey = 'thumb' | 'medium' | 'full'

export interface VariantPlanItem {
  key: ImageVariantKey
  width: number
  height: number
}

export interface ProcessedImageFiles {
  thumb: File   // <name>.thumb.webp
  medium: File  // <name>.medium.webp
  full: File    // <name>.webp
  plan: VariantPlanItem[] // width/height aktual per varian
}

export interface ProcessImageOptions {
  maxDimension: number
  quality: number
}
```

### Mapping varian (fragment URL, tanpa skema backend)

Pasangan URL varian ditanam di **fragment** URL `full`, bukan di localStorage:

```typescript
// https://host/api/files/media/<id>/<name>.webp#imgv1&t=<thumb>&m=<medium>&w=2048
interface ImageVariants {
  thumb?: string
  medium?: string
  fullWidth?: number
}
```

- Fragment tidak dikirim ke server, jadi PocketBase tetap menyajikan file
  `full` dan URL tetap valid di semua konteks (post cover, avatar, editor).
- `parseImageVariants` hanya menerima skema `http(s)` atau path relatif, dan
  menolak nilai berisi spasi/koma (mencegah injeksi kandidat `srcset`).
- `encodeImageVariants` dipakai oleh `uploadProcessedImage`; URL `data:`
  (mode mock) tidak diberi fragment.
- Keuntungan vs localStorage: ikut tersimpan di database, tidak hilang saat
  storage dibersihkan, dan konsisten antar perangkat.

### Display layer

`imageUrl(src, width)` & `buildSrcSet(src, widths)` diadaptasi:

```typescript
// buildSrcSet: bila URL punya fragment varian ?
//   "<thumb> 320w, <medium> 1024w, <full> <fullWidth>w"
// URL duplikat (gambar kecil) di-dedupe. Tanpa varian ? fallback ke
// logika lama (Pexels/?w=) atau undefined.
```

`PostImage.vue` tetap memakai `buildSrcSet` (tidak berubah API props), jadi
srcset otomatis memakai varian yang tersedia; `sizes`/`aspect` tetap.

Nama file varian sengaja diberi prefiks internal
(`ncmaz-thumb-<base>.webp`, `ncmaz-medium-<base>.webp`) agar Media Library
(fitur #17) dapat menyembunyikan file varian dan hanya menampilkan gambar
kanonik. PocketBase menormalisasi nama menjadi
`ncmaz_thumb_<base>_<random>.webp` / `ncmaz_medium_<base>_<random>.webp`.

## 5. Keamanan & Otorisasi

**Threat model:**

| Ancaman | Dampak | Mitigasi |
| :--- | :--- | :--- |
| MIME palsu (rename .html/.exe → image/png) | File berbahaya tersimpan & tersaji | `createImageBitmap` decode nyata = gate format; hanya WebP hasil re-encode yang disimpan |
| SVG (script-bearing) | XSS bila tersaji inline | Tetap TIDAK ada di allowlist (client & server PB) |
| Pixel-bomb / decompression bomb (file kecil, dimensi raksasa) | DoS memori (decode) | Sniff header menolak sisi >10000px atau >24MP sebelum decode; upload absolut dibatasi 25MB |
| Payload tersemat (EXIF/XMP/komentar) | Terbawa & tersaji | Re-encode membuang semua metadata; file hasil bersih |
| Upload langsung via API (bypass UI) | MIME palsu lolos client gate | Baseline server PB: FileField `MimeTypes` allowlist + `MaxSize` 5MB + rule koleksi (admin/penulis); `CreateRule` sudah ≥ penulis. Residual risk → catatan hardening |

**RBAC:** prosesing berjalan di sesi pengguna; upload tetap tunduk rule
koleksi `media` yang ada (admin/penulis). Tampilan gambar publik tidak berubah.

**Perubahan backend (aditif):** `ensureEditorSettingsCollection` di
`backend/main.go` menambah field `imageMaxDimension` + `imageQuality` pada
instalasi lama secara idempoten (tanpa hapus data) dan mengisinya pada seed.
Tanpa field ini setting admin tidak akan tersimpan.

**Prinsip transcode = sanitasi:** file asli pengguna **tidak pernah
disimpan**; hanya WebP re-encode yang masuk ke storage. Konsekuensi positif:
ketidakbergantungan pada kepercayaan terhadap bytes pengguna.

## 6. Panduan Penggunaan (UI/UX)

### Admin → Media Settings (`/admin/media-settings`)

Halaman khusus media (`AdminMediaSettingsPage.vue`) di grup **System** sidebar,
diakses role admin (`permission: manage_settings`, parent route `adminOnly`):

- **Batas ukuran upload (bytes)** — `input type="number"`, step 1024,
  0 = tanpa batas (tetap dibatasi 25 MB absolut); hint otomatis menampilkan
  nilai MB.
- **Maks dimensi gambar (px)** — `input type="number"`, min 256, max 4096,
  default 2048 (sisi terpanjang varian `full`).
- **Kualitas WebP** — `input type="range"` min 0.1 max 1 step 0.05 + label
  persen (default 80%).
- Panel informasi pipeline: format diterima, tiga varian (320/1024/max),
  GIF animasi passthrough, transcode = sanitasi, dan batas absolut keamanan
  (10000px / 24MP / 25MB).
- Setelah simpan, cache setting prosesing langsung di-reset sehingga upload
  berikutnya memakai nilai baru (tanpa menunggu TTL 30 detik).

Nilai disimpan pada record `editor_settings` (field `maxImageUploadSize`,
`imageMaxDimension`, `imageQuality`) agar tidak perlu koleksi baru.

### Admin → Editor Settings

Halaman editor kini hanya mengatur toolbar/placeholder/`maxContentLength` dan
menampilkan tautan ke Media Settings untuk pengaturan gambar.

### Pengguna penulis

Tanpa perubahan UX: pilih file → indikator loading (worker) → setelah
selesai, preview memakai varian `full`/`medium` sesuai konteks. GIF animasi
tetap bisa dipilih dan tampil normal.


## 7. Pengujian & Verifikasi

### Unit test (vitest) ? lulus

- `imageMeta.test.ts`: sniff PNG/JPEG/GIF(animated)/WebP ? dimensi benar;
  buffer non-gambar ? null; plan full dibatasi max dimension; no-upscale;
  clamp `imageMaxDimension`/`imageQuality`.
- `image.test.ts`: `buildSrcSet` memakai fragment varian (320w/1024w/2048w),
  dedupe URL, menolak `javascript:` dan injeksi kandidat berisi spasi/koma;
  `imageUrl` membuang fragment varian.
- Hasil: **14 file / 125 test lulus**.

### E2E (Playwright, browser nyata)

- PNG 3000?1500 ? varian `320?160`, `1024?512`, `2048?1024`, ketiganya
  `image/webp`.
- JPEG 2400?1600 (`maxDimension` 1200) ? `full` 1200?800; run kedua ?1.1s
  (run pertama ?2.5s termasuk fetch/init WASM).
- Gambar 200?100 ? 3 varian identik, 1 upload (dedupe), ?60ms.
- File `<html>` dengan MIME `image/png` ? ditolak.
- File 30MB saat `maxBytes: 0` ? ditolak (batas absolut 25MB).
- `buildSrcSet` menghasilkan kandidat `320w/1024w/2048w`.

### Perintah

```bash
cd frontend
npm run typecheck   # vue-tsc --noEmit
npm run lint        # eslint .
npm run test        # vitest run
npx playwright test  # e2e upload flow
```

## 8. Dependency & Risiko

- **Dependency baru**: `@jsquash/webp`, `@jsquash/resize` (WASM libwebp;
  aset WASM di-bundle Vite — bila fetch default gagal, gunakan import `?url`
  + inisialisasi manual).
- **Beban memori**: batas sisi 10000px / 24MP / 25MB. Worker dipertahankan
  antar upload (hemat ~1.4s re-init WASM) dan dihentikan saat `pagehide`.
- **Fallback encoder**: bila WASM gagal dimuat, `canvas.toBlob('image/webp')`
  dipakai (kualitas sedikit di bawah libwebp, tetap WebP).
- **Tiga record per upload** di koleksi `media` (bukan satu) — tradeoff dari
  multi-variant; gambar kecil di-dedupe menjadi satu record. Cleanup orphan
  hanya bila ada fitur hapus media.
- **AVIF input**: dimensi dibaca dari box `ispe`; bila tidak ditemukan,
  `createImageBitmap` tetap menjadi gate decode.
