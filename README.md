# Blogku — Modern Editorial & Magazine Web Application

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-emerald.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-sky.svg)](https://tailwindcss.com/)

> **Blogku** adalah aplikasi majalah dan editorial digital modern yang dirancang ulang dengan tiga prinsip utama: **Aman, Cepat, dan Sederhana**.

Proyek ini dirilis sebagai perangkat lunak sumber terbuka di bawah lisensi **[MIT](./LICENSE)**.

---

## 🌟 Fitur Utama

- **Tipografi & Desain Majalah Modern**: Dark mode alami, kartu artikel multi-varian (vertical, horizontal, overlay), dan layout responsif.
- **Tiptap v2 Rich Text Editor**: Editor visual WYSIWYG headless bertenaga ProseMirror yang terintegrasi penuh dengan Tailwind CSS.
- **Multi Format Konten**: Dukungan artikel Standard, Video (embed YouTube/Vimeo & MP4), Audio/Podcast, dan Gallery.
- **Taksonomi Fleksibel & CRUD Admin**: Multi-kategori, tag instan (*on-the-fly*), dan manajemen penuh kategori & tag di panel admin.
- **Autentikasi & RBAC**: Pembagian hak akses peran (*admin*, *penulis*, *subscriber*) dengan route guards dan helper izin terpusat.
- **Keterlibatan Komunitas**: Komentar bersarang, reaksi suka (*likes*), bookmark favorit, dan panel moderasi komentar admin.
- **Aman by Default**: Sanitasi HTML ketat dengan DOMPurify, bebas XSS, tanpa fungsi `eval` berbahaya.
- **Optimasi PageSpeed & PWA-ready**: Skor Core Web Vitals tinggi, font lokal zero-blocking, and dark theme default.

---

## 📚 Kebijakan Dokumentasi Fitur (Open Source MIT)

Sebagai proyek Open Source berlisensi MIT, **setiap fitur dalam proyek ini wajib memiliki dokumentasi teknis**.
Silakan membaca indeks dokumentasi lengkap kami:

👉 **[Buka Indeks Dokumentasi Fitur (`docs/README.md`)](./docs/README.md)**

### Daftar Dokumentasi Fitur:
1. [01 - Authentication & RBAC](./docs/features/01-auth-and-rbac.md)
2. [02 - Post Formats & Taxonomies](./docs/features/02-post-formats-and-taxonomies.md)
3. [03 - Tiptap v2 Rich Text Editor](./docs/features/03-rich-text-editor.md)
4. [04 - Comments & Reactions](./docs/features/04-comments-and-reactions.md)
5. [05 - Media Upload & Storage System](./docs/features/05-media-upload-and-storage.md)
6. [06 - Ncmaz Faust Redesign & Submission](./docs/features/06-ncmaz-faust-redesign-and-submission.md)
7. [07 - Default Dark Theme & PageSpeed Audit](./docs/features/07-default-dark-theme-and-pagespeed-audit.md)
8. [08 - Blogku Branding & Taxonomies CRUD](./docs/features/08-blogku-branding-and-taxonomies-crud.md)

Pedoman penulisan dokumen fitur baru dapat dilihat di **[Feature Documentation Guidelines](./docs/FEATURE-DOCUMENTATION-GUIDELINES.md)**.

---

## 🚀 Memulai Pengembangan Lokal

```bash
# 1. Pindah ke direktori frontend
cd frontend

# 2. Instalasi dependensi
npm install

# 3. Jalankan server pengembangan lokal
npm run dev

# 4. Pengujian dan verifikasi
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## 🤝 Berkontribusi

Kami menyambut kontribusi dari komunitas! Silakan baca panduan lengkap di **[CONTRIBUTING.md](./CONTRIBUTING.md)** sebelum mengajukan Pull Request.

---

## 📄 Lisensi

Didistribusikan di bawah Lisensi **MIT**. Lihat [`LICENSE`](./LICENSE) untuk informasi lebih lanjut.
