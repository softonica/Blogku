# Feature Documentation Guidelines & Template

Semua kontributor dan AI agent yang menambahkan atau memperbarui fitur di proyek **Ncmaz** wajib mengikuti panduan dan template di bawah ini. Dokumen disimpan di `docs/features/<nomor-urut>-<nama-fitur>.md`.

---

## Template Dokumen Fitur

Salin template markdown berikut saat mendokumentasikan fitur baru:

```markdown
# [Nama Fitur]

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable / In Progress / Experimental |
| **Fase Arsitektur** | Fase 1 (Mock) / Fase 2 (PocketBase) |
| **Izin Minimum (RBAC)** | Publik / Subscriber / Penulis / Admin |
| **Komponen Utama** | [NamaKomponen.vue](file:///path/to/component) |
| **Tanggal Ditambahkan** | YYYY-MM-DD |

---

## 1. Ringkasan & Tujuan Fitur
Jelaskan tujuan bisnis atau teknis dari fitur ini. Masalah apa yang diselesaikan untuk pembaca, penulis, atau admin?

---

## 2. Alur Pengguna (User Flow)
Jelaskan langkah demi langkah bagaimana pengguna berinteraksi dengan fitur ini:
1. Pengguna membuka halaman `/contoh`.
2. Pengguna memilih opsi A...
3. Sistem memvalidasi dan menyimpan ke store/DataSource...

---

## 3. Arsitektur & Komponen Terkait
Diagram atau daftar komponen yang terlibat:
- `src/components/...`
- `src/stores/...`
- `src/api/...`

---

## 4. Kontrak Data & TypeScript Schema
Sertakan cuplikan interface domain dan schema validasi Zod:
```typescript
export interface ContohInput {
  title: string
  // ...
}
```

---

## 5. Keamanan & Otorisasi
- **RBAC**: Siapa yang berhak melakukan aksi ini (cek `can()` atau route guard).
- **Sanitasi / Anti-XSS**: Bagaimana input dan output dibersihkan (mis. DOMPurify).

---

## 6. Pengujian & Verifikasi
- Perintah uji otomatis: `npm run test -- src/path/ke/test.ts`
- Verifikasi manual: Langkah-langkah untuk mencoba fitur di browser.
```
