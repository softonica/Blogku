# Mobile Compact Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buat layout mobile (< `sm` / 640px) lebih compact — padding, margin, gap, dan border radius dikurangi; tanpa mengubah tampilan desktop (`sm:`+). Hapus info duplikat di mobile per aturan "1 info 1x". Counter komentar ditambahkan di action row post sebelum tombol Share (semua layar).

**Architecture:** Transformasi kelas Tailwind mekanis per-token (base = nilai mobile baru, `sm:` = nilai desktop asli) via script sekali pakai + review diff. Deduplikasi manual per halaman (PostPage dulu, lalu survey halaman lain). Verifikasi: typecheck/lint/test/build.

**Tech Stack:** Vue 3.5, Tailwind CSS v4, lucide-vue-next, Vitest, ESLint, vue-tsc.

**Spec:** `docs/superpowers/specs/2026-11-01-mobile-compact-layout-design.md`

## Global Constraints

- Base class = nilai mobile baru; `sm:` = nilai desktop **asli** (desktop tidak boleh berubah). Breakpoint: `sm` (640px).
- Hanya utility spacing ≥4 yang diturunkan: `p/px/py/pt/pb/pl/pr/ps/pe/m/mx/my/mt/mb/ml/mr/ms/me/gap/gap-x/gap-y/space-x/space-y` — nilai 8→6, 7→5, 6→4, 5→4, 4→3.
- Hanya radius: `rounded-3xl`→`rounded-xl`, `rounded-[2rem]`→`rounded-xl`, `rounded-2xl`→`rounded-lg`, `rounded-[1.5rem]`→`rounded-lg`, `rounded-xl`→`rounded-lg`. `rounded-full` dan spacing <4 TIDAK diubah.
- Token negatif (`-mt-4`, dll.) TIDAK diubah.
- Tanpa perubahan logika/data/api; hanya kelas & struktur template.
- Wajib: `docs/features/19-mobile-compact-layout.md` (sesuai guideline) + entri `CHANGELOG.md` (format team-work). Update `docs/README.md`.
- Jangan commit kecuali diminta. Jangan sentuh file di luar `frontend/src/**/*.vue` + docs (kecuali script temp di luar repo).

## Review Focus

1. **Regresi desktop**: setiap token yang ditransformasi harus membawa nilai asli di `sm:`; jika sudah ada `sm:<prop>` pada atribut yang sama (mis. `p-6 sm:p-10`), hasil harus `p-4 sm:p-10` — tanpa kelas `sm:` ganda/konflik. (Task 1)
2. **Token negatif** (`-mt-4`/`-mb-*`) dan varian `<4` harus tidak tersentuh. (Task 1)
3. **String dinamis / array kelas** (`:class="[...]"`) harus tersusun ulang tanpa merusak sintaks Vue. (Task 1)
4. **PostPage**: semua branch gaya (hero/magazine/wide/centered) tetap berfungsi; counter komentar memakai `post.commentCount`; sembunyikan blok duplikat hanya di bawah `sm`. (Task 2)
5. **Deduplikasi halaman lain**: jangan hapus info yang sebenarnya unik (mis. statistik profil vs daftar post); hanya hapus duplikat literal pada layar mobile. (Task 3)

---

### Task 1: Sweep mekanis (script transformasi Tailwind)

**Files:**
- Modify: semua file `frontend/src/**/*.vue` yang mengandung token target (58 file, ±677 token)
- Temp (di luar repo): `%TEMP%\opencode\mobile-compact.mjs`

**Interfaces:**
- Produces: file `.vue` dengan kelas base mobile baru + `sm:` desktop asli pada 58 file.

- [ ] **Step 1: Tulis script transformasi**

Script Node membaca tiap `.vue`, men-scan region string yang dikutip (`"..."` / `'...'`), dan untuk tiap token target menyisipkan transformasi:
- Jika region sudah mengandung `sm:<prop sama>` → ganti token hanya dengan nilai mobile (jangan tambah `sm:` ganda).
- Jika tidak → ganti token dengan `<mobile> sm:<asli>`.
- Token diawali `-` atau bernilai <4 atau `rounded-full` → biarkan.
- Mode dry-run: cetak per-file jumlah perubahan; simpan daftar token yang tidak dikenal untuk review manual.

- [ ] **Step 2: Jalankan dry-run & review daftar token**

Run: `node %TEMP%\opencode\mobile-compact.mjs --dry-run`
Expected: daftar 58 file + jumlah token; tidak ada token tak dikenal selain yang diizinkan.

- [ ] **Step 3: Terapkan transformasi**

Run: `node %TEMP%\opencode\mobile-compact.mjs --apply`
Expected: 58 file berubah.

- [ ] **Step 4: Review diff**

Run: `git diff --stat` lalu `git diff` (sample: AdminTaxonomiesPage, PostPage, HomePage, PostCard, AdminLayout).
Expected: hanya perubahan kelas; tidak ada `sm:` ganda; tidak ada token negatif/spacing <4/rounded-full berubah; tidak ada perubahan di luar `class`/`:class`.

- [ ] **Step 5: Verifikasi**

Run (di `frontend`): `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`
Expected: semua lulus tanpa error.

---

### Task 2: PostPage — dedup & counter komentar

**Files:**
- Modify: `frontend/src/pages/PostPage.vue` (action row ~baris 277-302; sidebar magazine ~baris 354-398; box "Written by" ~baris 401-423)
- Modify: `frontend/src/components/comments/CommentList.vue` (tambah `id="comments"` pada `<section>`)

**Interfaces:**
- Consumes: `Post.commentCount` (sudah ada di `@/api/types`), ikon `MessageCircle` (lucide-vue-next).
- Produces: action row berisi Like | Save | **counter komentar** | Share (counter = elemen `<button>` pill, `h-10 rounded-full border px-4`, ikon MessageCircle + `post.commentCount`, `aria-label`, klik → scroll ke `#comments`).

- [ ] **Step 1: Tambah counter komentar sebelum tombol Share**

Di action row PostPage (setelah SaveButton), sisipkan button counter komentar sesuai Interfaces. Gaya mengikuti tombol Share sekitarnya.

- [ ] **Step 2: Sembunyikan blok duplikat di mobile**

- Sidebar magazine (aside "Written by" + "Post details" + aksi): tambah `hidden lg:block` pada `<aside>` → tidak tampil < lg.
- Box "Written by" bawah konten (non-magazine): `flex` → `hidden sm:flex`.
- Beri `id="comments"` pada `<section>` di CommentList.

- [ ] **Step 3: Verifikasi**

Run (di `frontend`): `npm run typecheck` → `npm run lint` → `npm run build`
Expected: lulus. Manual: cek post style 1–4 di 375px (tidak ada info ganda; counter tampil sebelum Share) dan ≥640px (identik dengan sebelumnya).

---

### Task 3: Survey dedup halaman lain

**Files:**
- Modify: halaman yang terbukti punya duplikat literal di mobile (hasil survey; diharapkan kecil: 0–6 file).

**Interfaces:**
- Consumes: hasil diff Task 1 + pembacaan template tiap halaman.

- [ ] **Step 1: Survey duplikasi**

Baca template semua halaman publik + admin (HomePage, SearchPage, AuthorPage, CategoryPage, TagPage, ProfilePage, BookmarksPage, DashboardPage, EditorPage, halaman admin). Catat hanya duplikat literal pada mobile (informasi yang sama tampil 2x; mis. blok statistik yang sama di header & bawah konten; aksi yang sama di 2 toolbar).
Expected: daftar singkat duplikat yang valid (maks. beberapa file).

- [ ] **Step 2: Terapkan perbaikan**

Untuk tiap duplikat terverifikasi: sembunyikan blok sekunder di mobile (`hidden sm:*`) atau hapus jika redundan penuh. Jangan mengubah yang tampil sekali. Dokumentasikan tiap keputusan di `CHANGELOG.md`.

- [ ] **Step 3: Verifikasi**

Run (di `frontend`): `npm run typecheck` → `npm run lint` → `npm run test`
Expected: lulus.

---

### Task 4: Dokumentasi & changelog

**Files:**
- Create: `docs/features/19-mobile-compact-layout.md` (template `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`)
- Modify: `docs/README.md` (indeks), `CHANGELOG.md` (entri baru, di-append)

- [ ] **Step 1: Tulis dokumen fitur**

Isi: ringkasan & motivasi; arsitektur (aturan transformasi + tabel nilai); aturan dedup; panduan verifikasi (perintah + hasil).

- [ ] **Step 2: Update indeks & changelog**

`docs/README.md`: tambah tautan. `CHANGELOG.md`: entri `[2026-11-01] — Mobile compact layout (spacing & dedup)`, format team-work (Author/Role/What/Why/Verified/Handover), status Done hanya jika Task 1–3 tuntas diverifikasi.

- [ ] **Step 3: Verifikasi akhir**

Run (di `frontend`): `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`
Expected: semua lulus.
