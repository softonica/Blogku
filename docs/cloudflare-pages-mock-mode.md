# Cloudflare Pages — Mode Mock Data

Dokumen ini mencatat konfigurasi produksi **Cloudflare Pages** untuk proyek `blogku`
agar situs demo memakai **mock data frontend**, bukan backend produksi
`https://blog.artku.my.id`.

---

## 1. Ringkasan

| Item | Nilai |
| :--- | :--- |
| Cloudflare Pages project | `blogku` |
| Production branch | `main` |
| Subdomain | `https://blogku-7rq.pages.dev` |
| Build command | `npm ci && npm run build` |
| Output directory | `frontend/dist` |
| Root directory | `/` |
| `VITE_USE_POCKETBASE` | *(tidak di-set)* → default mock |
| `VITE_PB_URL` | *(tidak di-set)* |
| Sumber data | `MockSource` (`frontend/src/api/mock.source.ts`) |

Environment variable produksi dan preview sama-sama kosong. Dengan begitu build
Pages berjalan tanpa endpoint backend apa pun.

---

## 2. Cara Kerja Pemilihan Data Source

`frontend/src/main.ts`:

```ts
const usePocketBase = import.meta.env.VITE_USE_POCKETBASE === 'true'
setDataSource(usePocketBase ? new PocketBaseSource() : new MockSource())
```

- `VITE_USE_POCKETBASE=true` → `PocketBaseSource` (butuh `VITE_PB_URL`).
- Selain nilai itu (termasuk tidak di-set) → `MockSource`.

`VITE_PB_URL` juga tidak boleh di-set agar URL backend produksi tidak ikut
ter-inline ke bundle. Build yang benar tidak mengandung string
`blog.artku.my.id`.

---

## 3. Kredensial Demo (Mock)

| Akun | Password | Role |
| :--- | :--- | :--- |
| `demo` | `password` | penulis |
| `admin` | `password` | admin |
| `subscriber` | `password` | subscriber |

Halaman login menampilkan hint `demo / password` dan tombol quick-login untuk
ketiga akun di atas saat mode mock aktif.

---

## 4. Mengubah Konfigurasi

### 4.1 Tetap memakai mock (kondisi saat ini)

Tidak ada env var yang perlu di-set. Build akan otomatis memakai `MockSource`.

### 4.2 Kembali ke backend PocketBase

Set environment variable berikut pada Cloudflare Pages project `blogku`
(Production), lalu redeploy:

```text
VITE_USE_POCKETBASE=true
VITE_PB_URL=https://blog.artku.my.id
```

Untuk mengubah lewat API, gunakan `PATCH /accounts/{account_id}/pages/projects/blogku`
dengan body `deployment_configs.production.env_vars`.

---

## 5. Verifikasi

Jalankan setelah deployment sukses:

1. **Environment** — `GET /pages/projects/blogku` menunjukkan
   `deployment_configs.production.env_vars` kosong (`null`).
2. **Bundle** — ambil `/assets/index-*.js` dari `https://blogku-7rq.pages.dev/`,
   lalu pastikan tidak ada string `blog.artku.my.id`.
3. **Runtime** — buka halaman utama: konten mock tampil, dan tidak ada request ke
   `/api/`.
4. **Login demo** — prefill `demo / password`, submit, lalu diarahkan ke
   `/dashboard` tanpa request API.

Hasil verifikasi terakhir (2026-11-07, deployment `37a999aa`):

- Build & deploy Pages: `success`.
- `blog.artku.my.id` pada bundle produksi: **tidak ditemukan**.
- Request `/api/` saat membuka home dan login: **0**.
- Login `demo / password` → `/dashboard`: **berhasil**.