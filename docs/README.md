# Blogku Documentation Index

Selamat datang di dokumentasi resmi **Blogku**, platform majalah dan editorial digital modern berlisensi **[MIT](./../LICENSE)**.

---

## 🚀 Mulai Di Sini

Baru bergabung di proyek ini (manusia maupun model AI)? Baca
**[HANDOVER-CONTEXT.md](./HANDOVER-CONTEXT.md)** lebih dulu. Dokumen itu berisi
konteks menyeluruh: arsitektur runtime, lokasi server & domain, perintah
build/deploy, konfigurasi, data model, jebakan operasional, status pekerjaan
(termasuk utang yang belum di-commit), dan backlog.

---

## 📜 Kebijakan Dokumentasi Fitur
Setiap fitur dalam proyek ini wajib memiliki dokumentasi teknis yang lengkap sesuai panduan di **[Feature Documentation Guidelines](./FEATURE-DOCUMENTATION-GUIDELINES.md)**.

---

## 📚 Daftar Fitur & Spesifikasi

| No | Modul / Fitur | Status | Dokumen Spesifikasi |
| :---: | :--- | :---: | :--- |
| **01** | **Authentication & RBAC** | ✅ Stable | [01-auth-and-rbac.md](./features/01-auth-and-rbac.md) |
| **02** | **Post Formats & Taxonomies** | ✅ Stable | [02-post-formats-and-taxonomies.md](./features/02-post-formats-and-taxonomies.md) |
| **03** | **Tiptap v2 Rich Text Editor** | ✅ Stable | [03-rich-text-editor.md](./features/03-rich-text-editor.md) |
| **04** | **Comments & Reactions** | ✅ Stable | [04-comments-and-reactions.md](./features/04-comments-and-reactions.md) |
| **05** | **Media Upload & Storage System** | ✅ Stable | [05-media-upload-and-storage.md](./features/05-media-upload-and-storage.md) |
| **06** | **Ncmaz Faust Redesign & Submission** | ✅ Stable | [06-ncmaz-faust-redesign-and-submission.md](./features/06-ncmaz-faust-redesign-and-submission.md) |
| **07** | **Default Dark Theme & PageSpeed Audit** | ✅ Stable | [07-default-dark-theme-and-pagespeed-audit.md](./features/07-default-dark-theme-and-pagespeed-audit.md) |
| **08** | **Blogku Branding & Taxonomies CRUD** | ✅ Stable | [08-blogku-branding-and-taxonomies-crud.md](./features/08-blogku-branding-and-taxonomies-crud.md) |
| **09** | **PocketBase Backend Integration** | Frontend adapter | [09-pocketbase-backend-integration.md](./features/09-pocketbase-backend-integration.md) |
| **10** | **Change Password** | Implementasi | [10-change-password.md](./features/10-change-password.md) |
| **11** | **Blogku Single-Binary Setup** | ✅ Stable | [11-blogku-single-binary-setup.md](./features/11-blogku-single-binary-setup.md) |
| **12** | **Editor: Tag, Auto-Excerpt, Kategori & Post Styles** | ✅ Stable | [12-editor-taxonomy-excerpt-and-post-styles.md](./features/12-editor-taxonomy-excerpt-and-post-styles.md) |
| **13** | **Admin Console Shell & Overview Dashboard** | ✅ Stable | [13-admin-console-shell-and-dashboard.md](./features/13-admin-console-shell-and-dashboard.md) |
| **14** | **Post View Counter** | ✅ Stable | [14-post-view-counter.md](./features/14-post-view-counter.md) |
| **15** | **Author & Profile Page Design** | Draft | [15-author-profile-page-design.md](./features/15-author-profile-page-design.md) |
| **16** | **Client-Side Image Processing (WebP multi-variant)** | ✅ Implemented | [16-client-side-image-processing.md](./features/16-client-side-image-processing.md) |
| **17** | **Media Library (grouped Year > Month)** | ✅ Implemented | [17-media-library-year-month.md](./features/17-media-library-year-month.md) |

---

## 🗄️ Spesifikasi Backend

| Dokumen | Status | Keterangan |
| :--- | :---: | :--- |
| [backend-integration-spec.md](./backend-integration-spec.md) | Spesifikasi + Adapter frontend | Pemetaan `DataSource` ke PocketBase, skema koleksi, RBAC, auth, upload, error contract, rate limit berlapis; `PocketBaseSource` diimplementasikan (backend di-deploy di luar repo ini) |
| [backend-deployment-spec.md](./backend-deployment-spec.md) | Panduan deploy & integrasi | Instalasi PocketBase, migrasi, storage, reverse proxy/TLS, keamanan, backup, monitoring, CI/CD, checklist verifikasi |
| [blogku-single-binary-setup-spec.md](./blogku-single-binary-setup-spec.md) | Spesifikasi single-binary | Desain satu binary Linux (embed frontend + backend PocketBase, auto-provision admin, same-origin) |
| [blogku-single-binary-setup-plan.md](./blogku-single-binary-setup-plan.md) | Implementasi plan | Rincian task 1-7 (TDD) yang membangun fitur single-binary |
| [how-to-deploy-blogku.md](./how-to-deploy-blogku.md) | Panduan deploy | Langkah-langkah men-deploy single-binary ke VPS (contoh nyata server 64) |
| [HANDOVER-CONTEXT.md](./HANDOVER-CONTEXT.md) | ✅ Aktual (2026-10-26) | Konteks menyeluruh untuk handover: arsitektur, server, build/deploy, konfigurasi, status, utang repo, backlog |
| [editor-tag-excerpt-category-spec.md](./editor-tag-excerpt-category-spec.md) | ✅ Diimplementasi | Spec tag editor, auto-excerpt, kategori admin, dan 4 post layout style |

