# AI Agents Guidelines & Rules (Ncmaz Open Source)

> **Proyek**: Ncmaz (Modern Magazine & Editorial Platform)
> **Lisensi**: MIT License
> **Prinsip Utama**: Aman, Cepat, Sederhana, Terdokumentasi Penuh.

---

## 🚨 ATURAN WAJIB: DOKUMENTASI SETIAP FITUR (MANDATORY)

Sebagai proyek Open Source berlisensi MIT, **setiap fitur baru, refactor besar, atau modul yang dibuat WAJIB didokumentasikan**. Tidak ada fitur yang dianggap "selesai" (Definition of Done) tanpa dokumen teknis pendamping.

### 1. Lokasi Dokumentasi Fitur
Setiap fitur harus memiliki file markdown di:
```
docs/features/<nomor-urut>-<nama-fitur>.md
```
Contoh:
- `docs/features/01-auth-and-rbac.md`
- `docs/features/02-post-formats-and-taxonomies.md`
- `docs/features/03-rich-text-editor.md`

### 2. Struktur Wajib Setiap Dokumen Fitur
Setiap dokumen fitur harus memuat bagian-bagian berikut sesuai template di `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`:
1. **Ringkasan & Motivasi**: Masalah apa yang diselesaikan.
2. **Arsitektur & Komponen**: Aliran data, diagram komponen, Pinia store yang terlibat.
3. **Kontrak Data & TypeScript Types**: Tipe input, output, dan validasi schema (Zod).
4. **Otorisasi & Keamanan**: Aturan hak akses peran (admin, penulis, subscriber) dan pencegahan XSS.
5. **Panduan Penggunaan (UI/UX)**: Cara pengguna berinteraksi dengan fitur tersebut.
6. **Pengujian & Verifikasi**: Cara menguji (unit test, integrasi, dan manual check).

### 3. Checklist Definition of Done (DoD)
Sebelum menandai tugas fitur selesai:
- [ ] Kode terimplementasi dan lulus typecheck (`vue-tsc --noEmit`).
- [ ] Linter bersih tanpa error (`eslint .`).
- [ ] Unit test dibuat dan lulus (`vitest run`).
- [ ] Dokumen fitur ditulis di `docs/features/`.
- [ ] Indeks dokumentasi di `docs/README.md` diperbarui.

---

## 🛡️ Prinsip Keamanan & Arsitektur
1. **Aman by Default**: Sanitasi semua render HTML kaya dengan DOMPurify (`sanitizeHtml`). Dilarang keras menggunakan `eval()`, `new Function()`, atau bypass sanitasi.
2. **Layering Bersih (DataSource)**: Semua interaksi data UI **harus** melalui antarmuka `DataSource` (`src/api/source.ts`), tidak boleh memanggil backend/mock data secara langsung dari komponen.
3. **Dark Mode & Aksesibilitas**: Setiap komponen UI harus mendukung mode gelap (`dark:`) dan atribut aksesibilitas (`aria-*`).
