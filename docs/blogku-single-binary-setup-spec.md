# Spec — Blogku Single-Binary Setup (mode OpenList)

- **Tanggal:** 2026-10-25
- **Status:** Approved (design disetujui user)
- **Target repo:** `ncmaz-clone` (Blogku monorepo)
- **Pengelana:** alur setup dipermudah agar user awam bisa menjalankan seluruh
  Blogku dengan **satu binary Go Linux**, meniru kemudahan setup OpenList.

---

## 1. Ringkasan & Tujuan

Saat ini Blogku dijalankan dengan memisahkan dua proses:

1. **Backend** — binary custom PocketBase (`backend/ncmaz-backend.exe` /
   `ncmaz-backend`), serve API di `127.0.0.1:8090`, data di `pb_data/`,
   butuh env `PB_SUPERUSER_EMAIL`/`PB_SUPERUSER_PASSWORD` untuk admin.
2. **Frontend** — Vue 3 SPA yang di-build terpisah (`frontend/dist`),
   membutuhkan `VITE_USE_POCKETBASE=true` + `VITE_PB_URL` saat build untuk
   menunjuk backend.

Ini memaksa user menguasai: build frontend, set env, build backend Go, dan
menyambungkan keduanya. Tidak mudah untuk awam.

**Tujuan spec ini:** mengubah model menjadi **satu binary Go Linux** yang:

- Meng-embed `frontend/dist` sehingga SPA dan API dilayani **satu port**.
- **Auto-provision** pada first-run: membuat `pb_data/` (SQLite + storage),
  superuser admin, seed koleksi, `site_settings`, `editor_settings`, halaman
  statis, dan user demo.
- **Mencetak kredensial admin** ke konsol pada first-run (persis OpenList:
  `admin password di-generate first run`) — tanpa env var wajib.

### Kriteria sukses (dari keputusan brainstorming)

- User cukup mengunduh satu binary Linux, `chmod +x`, lalu
  `./blogku serve`.
- Tanpa env var wajib. URL + kredensial admin dicetak di konsol saat
  first-run.
- Blog langsung bisa dipakai: login admin, menulis post, upload media.
- Data tersimpan persist di `pb_data/` lokal; S3 = opsional di luar scope.

---

## 2. Scope

### Termasuk (in-scope)

- Embedding frontend dist ke binary backend.
- Serve SPA + API di satu port.
- Auto-provision data dir + kredensial + seed (first-run).
- Flag CLI `--http` (default `127.0.0.1:8090`) dan `--dir` (default `pb_data`).
- Resolusi base URL frontend → same-origin (relative `/api`).
- Log first-run (URL + kredensial, sekali saja).

### Tidak termasuk (out-of-scope)

- Panduan domain / HTTPS / reverse-proxy / certbot.
- S3/object storage wajib (hanya local default).
- Multi-instance, oauth, SSO.
- Docker / Windows build (target: Linux saja).
- Fitur produk baru di luar setup.

---

## 3. Arsitektur & Alur

```
# Alur user (satu perintah)
./blogku serve --http 127.0.0.1:8090 --dir pb_data

# First-run:
#   1. Baca/muat konfig (PocketBase default).
#   2. Jika data dir baru -> buat schema + seed + superuser + cetak kredensial.
#   3. Serve SPA (embedded) di root + API PocketBase di /api/*.
```

- **Embedding:** gunakan `go:embed` pada folder `frontend/dist` di binary
  backend. Backend menyajikan file statis SPA untuk semua route non-`/api`
  (fallback ke `index.html` untuk SPA routing).
- **Satu origin:** frontend meminta API ke **origin yang sama** (path relatif
  `/api`). Tidak lagi bergantung pada `VITE_PB_URL`.
- **Auto-provision:** logika di `main.go`:
  - Cek apakah superuser sudah ada. Jika belum → buat `admin@blogku.com` dan
    password acak; simpan; cetak ke stdout (hanya once).
  - Seed koleksi + `site_settings` + `editor_settings` + halaman statis +
    user demo (`admin/admin12345` dll.) jika data dir masih kosong.

---

## 4. Perubahan Teknis per Komponen

### 4.1 Backend (`backend/`)

- `go:embed` untuk `../frontend/dist` (folder build SPA).
- `main.go`:
  - Tambah flag `--http` (string, default `127.0.0.1:8090`) dan `--dir`
    (string, default `pb_data`).
  - Tambah handler statis yang serve SPA embedded untuk non-`/api`.
  - Auto-provision superuser + seed pada first-run.
  - Log first-run: URL server + kredensial admin (sekali).
- Pastikan binary tetap bisa di-build dengan `go build -o blogku .`
  (tanpa CGO; gunakan `CGO_ENABLED=0` untuk Linux).

### 4.2 Frontend (`frontend/`)

- `src/lib/pb.ts`: resolusi base URL fallback ke same-origin (jika
  `VITE_PB_URL` tidak di-set, pakai `/` atau `''`).
- `src/api/pocketbase.source.ts` & `src/api/source.ts`: pastikan semua request
  memakai base yang sama (relative).
- Pastikan `vite build` menghasilkan `dist/` yang siap di-embed (output path
  konsisten, base URL relatif `./` atau `/`).
- Tambahkan skrip build yang menghasilkan `dist/` **sebelum** `go build`
  (agar embedded selalu baru).

### 4.3 Build & distribusi

- Skrip/`Makefile` (opsional):
  - `build:web` → `vite build`.
  - `build:server` → `go build -o blogku .` (dengan dist terbaru).
- Hasil: satu binary `blogku` (Linux amd64) siap distribusikan.

---

## 5. Error Handling & Verifikasi

### Error handling

- Jika `--dir` tidak writable → error jelas sebelum serve.
- Jika `frontend/dist` tidak ada saat build → `go build` gagal dengan pesan
  embed (harus build web dulu).
- Jika superuser gagal dibuat → log error dan stop (jangan lanjut tanpa admin).

### Verifikasi (pasca-implementasi)

- `./blogku serve --dir /tmp/bk-test` pada dir baru:
  - stdout mencetak URL + kredensial admin.
  - `pb_data/` terbentuk (`.db` + `storage/`).
- `GET http://127.0.0.1:8090/` → 200 (HTML SPA).
- `POST /api/collections/users/auth-with-password` dengan kredensial admin →
  sukses.
- `GET /api/collections/posts` dengan auth admin → daftar posts (seed).
- Login user demo `demo/demo12345` → sukses.
- Ulangi `serve` pada dir yang sama → **tidak** mencetak ulang kredensial.

---

## 6. Dokumen Terkait

- `docs/backend-integration-spec.md` — kontrak API + koleksi + RBAC.
- `docs/backend-deployment-spec.md` — mode deploy saat ini (NEO App).
- `backend/README.md` — cara build & run backend saat ini.
- `frontend/src/lib/pb.ts` — resolusi PB URL saat ini.

---

## 7. Catatan Keputusan (Brainstorming)

| Pertanyaan | Keputusan |
|---|---|
| Makna "mudah setup" | Paket siap-hosting |
| Target utama deploy | Satu binary menggabung frontend+backend |
| Pengalaman first-run | Auto-provision penuh + cetak kredensial |
| Penyimpanan media | Lokal default (`pb_data/storage`), S3 opsional |
| Target platform binary | Linux saja |
| Panduan domain/HTTPS | Tanpa panduan domain (di luar scope) |
