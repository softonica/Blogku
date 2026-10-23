# 03 - Tiptap v2 Rich Text Editor

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (HTML Output) → Siap JSON Blocks PocketBase Fase 2 |
| **Izin Minimum (RBAC)** | Penulis / Admin |
| **Komponen Utama** | [`src/components/editor/RichTextEditor.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/editor/RichTextEditor.vue), [`src/components/editor/EditorToolbar.vue`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/editor/EditorToolbar.vue) |
| **Tanggal Ditambahkan** | 2026-10-22 |

---

## 1. Ringkasan & Tujuan Fitur
Menyediakan editor tulisan visual (WYSIWYG) yang intuitif, aman, dan modern untuk penulis majalah Ncmaz tanpa perlu menulis tag HTML manual. Menggunakan **Tiptap v2 (Lisensi MIT Open-Source)** yang headless dan diselaraskan penuh dengan Tailwind CSS & Dark Mode.

---

## 2. Fitur Editor
1. **Formatting Teks**:
   - Heading level 2 (`H2`) dan Heading level 3 (`H3`).
   - Tebal (**Bold**), Miring (*Italic*), Coret (~~Strike~~), dan Kode Inline (`Code`).
2. **Blok Konten**:
   - Daftar berbutir (*Bullet List*) & Daftar bernomor (*Ordered List*).
   - Kutipan blok (*Blockquote*) dengan aksen warna khas Ncmaz.
   - Garis pemisah (*Horizontal Divider*).
3. **Media & Link**:
   - Penyisipan hyperlink dengan validasi URL aman.
   - Penyisipan gambar artikel langsung ke dalam isi dokumen.
4. **Riwayat & Kontrol**:
   - Undo & Redo instan.
   - Placeholder otomatis saat editor kosong.
   - Dual Mode: Tab **Write** untuk mengedit dan tab **Preview** untuk pratinjau rendering asli.

---

## 3. Arsitektur & Komponen Terkait
- **`src/components/editor/RichTextEditor.vue`**: Wrapper Vue 3 Composition API menggunakan `useEditor()` dari `@tiptap/vue-3`. Menyinkronkan perubahan secara reaktif melalui event `v-model` (`update:modelValue`).
- **`src/components/editor/EditorToolbar.vue`**: Toolbar modular mengambang (*sticky*) dengan active states, divider visual, dan Lucide icons.
- **`src/styles/main.css`**: Styling tipografi terintegrasi via class `.prose-ncmaz`.

---

## 4. Keamanan & Sanitasi (Anti-XSS)
- **Strict Schema Tiptap**: Tiptap membatasi DOM nodes hanya pada schema yang diizinkan (Heading, Paragraph, Blockquote, dsb.). Tag berbahaya seperti `<script>` otomatis ditolak.
- **Sanitasi DOMPurify**: Output HTML editor wajib melewati fungsi [`sanitizeHtml()`](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/sanitize.ts) sebelum disimpan dan sebelum dirender via `v-html`.
- **Code-Splitting**: Bundel editor dipisahkan oleh Vite (`chunking`) sehingga hanya diunduh saat pengguna membuka rute `/editor`.

---

## 5. Pengujian & Verifikasi
- **Typecheck & Linter**:
  ```bash
  cd frontend
  npm run typecheck
  npm run lint
  ```
- **Build Verification**:
  ```bash
  npm run build
  ```
