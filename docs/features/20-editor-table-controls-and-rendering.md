# Editor Table Controls & Rendering

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable |
| **Fase Arsitektur** | Fase 1 (Mock) / Fase 2 (PocketBase) |
| **Izin Minimum (RBAC)** | Penulis |
| **Komponen Utama** | [EditorToolbar.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/editor/EditorToolbar.vue), [RichTextEditor.vue](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/components/editor/RichTextEditor.vue), [sanitize.ts](file:///c:/Users/Administrator/Desktop/ncmaz-clone/frontend/src/lib/sanitize.ts) |
| **Tanggal Ditambahkan** | 2026-11-02 |

---

## 1. Ringkasan & Tujuan Fitur

Sebelumnya tombol tabel di editor selalu menyisipkan tabel **3 × 3** dan tidak ada cara menentukan jumlah baris/kolom. Selain itu, `sanitizeHtml()` membuang seluruh tag tabel (`table`, `tr`, `td`, dst.) sehingga tabel hilang/berantakan saat tab **Preview** dan saat artikel terbit di halaman post.

Fitur ini menyelesaikan dua masalah tersebut:

1. Penulis dapat memilih ukuran tabel (hingga 8 × 8) sebelum menyisipkan, lalu menambah/menghapus baris dan kolom setelah tabel dibuat.
2. Struktur tabel dan gaya aman (lebar kolom, perataan teks) dipertahankan oleh sanitizer, dan tampilan tabel konsisten di editor, preview, serta halaman artikel terbit (light & dark mode).

---

## 2. Alur Pengguna (User Flow)

1. Penulis membuka `/editor` lalu menekan ikon **Table** di toolbar.
2. Popover berisi grid 8 × 8 muncul sebagai dropdown di desktop, dan sebagai modal overlay yang **terpusat di viewport** (dengan backdrop) pada layar <640px. Mengarahkan kursor/`focus` ke sel menampilkan label `baris × kolom`.
3. Klik salah satu sel untuk menyisipkan tabel dengan ukuran tersebut (baris pertama menjadi header).
4. Saat kursor berada di dalam tabel, buka kembali menu yang sama untuk:
   - memilih **Style** tabel: **Classic**, **Striped**, atau **Minimal**,
   - menambah baris di atas/bawah,
   - menghapus baris,
   - mengaktifkan/menonaktifkan baris header,
   - menambah kolom kiri/kanan,
   - menghapus kolom,
   - menghapus seluruh tabel.
5. Tab **Preview** dan halaman `/post/:slug` menampilkan tabel dengan style yang dipilih, border, header berwarna, dan scroll horizontal pada layar sempit.

### 3 gaya tabel
| Style | Ciri visual |
| :--- | :--- |
| **Classic** (default) | Grid penuh, header netral, baris genap berwarna zebra. |
| **Striped** | Header berwarna primary, baris ganjil beraksen primary, border bernuansa primary. |
| **Minimal** | Hanya garis horizontal, tanpa garis vertikal, header transparan dengan huruf kapital dan garis bawah tebal. |

---

## 3. Arsitektur & Komponen Terkait

- `frontend/src/components/editor/EditorToolbar.vue`
  - State popover (`tableMenuOpen`, `hoveredRows`, `hoveredCols`) dan grid pemilih ukuran.
  - `insertTable(rows, cols)` memanggil perintah Tiptap `insertTable`.
  - `tableCommand()` membungkus `addRowBefore`, `addRowAfter`, `deleteRow`, `toggleHeaderRow`, `addColumnBefore`, `addColumnAfter`, `deleteColumn`, dan `deleteTable`.
  - `onClickOutside` menutup popover saat klik di luar toolbar.
- `frontend/src/components/editor/RichTextEditor.vue`
  - Ekstensi `StyledTable` (turunan `Table`) dengan atribut `tableStyle` (`classic`/`striped`/`minimal`) yang dirender menjadi class `table-style-*`.
  - Ekstensi `TableRow`, `TableHeader`, `TableCell` dengan `resizable: true`.
  - Style editor untuk `.tableWrapper` (scroll horizontal), `.selectedCell`, dan `.column-resize-handle`.
- `frontend/src/lib/sanitize.ts`
  - Allowlist tag tabel dan atribut `style`, `colspan`, `rowspan`, `colwidth`, `scope`, `align`.
  - `filterStyleAttribute()` hanya meloloskan `text-align`, `vertical-align`, `width`, `min-width`, dan `max-width` dengan nilai yang aman.
- `frontend/src/styles/main.css`
  - Aturan `.prose-ncmaz` untuk tabel: border, padding, header, zebra row, dan dark mode.
- `frontend/src/pages/PostPage.vue`
  - Artikel terbit memakai class `prose-ncmaz` agar gaya tabel sama dengan preview editor.
- `backend/main.go`
  - `newSanitizer()` = `bluemonday.UGCPolicy()` + allowlist style sempit untuk elemen tabel, sehingga lebar kolom dan perataan teks tidak hilang saat konten disimpan ke PocketBase.
- `backend/sanitize_test.go`
  - Test preservasi struktur tabel dan penolakan CSS berbahaya.

---

## 4. Kontrak Data & TypeScript Schema

Tabel disimpan sebagai HTML Tiptap di field `content` (string) dan tidak menambah tipe domain baru. Contoh HTML yang dihasilkan:

```html
<table class="border-collapse table-fixed w-full my-3 table-style-striped" style="min-width: 300px">
  <colgroup><col style="width: 120px"></colgroup>
  <tbody>
    <tr><th colspan="2" style="text-align: center">Header</th></tr>
    <tr><td rowspan="2">Isi</td><td>Nilai</td></tr>
  </tbody>
</table>
```

Allowlist style yang diizinkan:

```typescript
const ALLOWED_STYLE: Record<string, RegExp> = {
  'text-align': /^(left|right|center|justify|start|end)$/,
  'vertical-align': /^(top|middle|bottom|baseline)$/,
  width: /^\d+(\.\d+)?(px|%|em|rem|pt|vw|ch)$/,
  'min-width': /^\d+(\.\d+)?(px|%|em|rem|pt|vw|ch)$/,
  'max-width': /^\d+(\.\d+)?(px|%|em|rem|pt|vw|ch)$/,
}
```

---

## 5. Keamanan & Otorisasi

- **RBAC**: Hanya route editor yang bisa diakses penulis/admin; tidak ada perubahan aturan akses.
- **Sanitasi / Anti-XSS**: `sanitizeHtml()` tetap menjadi satu-satunya jalur render HTML. Semua tag/atribut di luar allowlist dibuang. `style` tidak lolos mentah: hanya properti di `ALLOWED_STYLE` dengan nilai regex-safe yang dipertahankan, sehingga `url()`, `expression()`, `position`, dan properti berbahaya lain tidak bisa masuk.
- **Backend**: `newSanitizer()` memakai `bluemonday.UGCPolicy()` dan hanya mengizinkan properti style tabel yang sama (`text-align`, `vertical-align`, `width`, `min-width`, `max-width`) dengan regex nilai yang ketat, sehingga konten yang disimpan tetap aman sekaligus mempertahankan layout tabel.
- **Class style tabel**: `class` sudah termasuk allowlist; hanya class `table-style-classic`/`table-style-striped`/`table-style-minimal` yang dipakai untuk tampilan, sehingga tidak ada CSS eksekutabel yang disimpan.
- `script`, `iframe`, event handler (`on*`), dan `javascript:` URL tetap diblokir baik di frontend maupun backend.

---

## 6. Pengujian & Verifikasi

- Unit test sanitizer frontend: `npm run test -- src/lib/sanitize.test.ts`
  - Memastikan struktur tabel, `colspan`, `rowspan`, `scope`, dan style aman dipertahankan.
  - Memastikan `color`, `background`, dan `url(javascript:...)` dibuang.
- Unit test sanitizer backend: `cd backend && go test ./...`
  - Memastikan tabel, `colspan`/`rowspan`, lebar kolom, dan perataan bertahan saat disimpan.
  - Memastikan CSS berbahaya (`position`, `background`, `javascript:`) dibuang.
- Verifikasi manual:
  1. Buka `/editor`, klik ikon Table, pilih misalnya 4 × 5.
  2. Tambah/hapus baris dan kolom dari menu tabel.
  3. Pilih tiap style (Classic, Striped, Minimal) dan pastikan tampilan tabel berubah.
  4. Buka tab **Preview** dan pastikan style yang dipilih ikut tampil.
  5. Simpan/terbitkan, buka `/post/:slug`, cek style tabel di light & dark mode serta layar mobile (scroll horizontal).
- Quality gate: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, dan `go test ./...` (backend).
