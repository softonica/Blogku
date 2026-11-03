# Audio Post Player (SPA-global) & Audio Upload

| Metadata | Keterangan |
| :--- | :--- |
| **Status** | Stable (redesign Ncmaz 2026-11-03) |
| **Fase Arsitektur** | Fase 2 (PocketBase) |
| **Izin Minimum (RBAC)** | Publik (playback) / Penulis (upload audio) |
| **Komponen Utama** | [audio-engine.ts](frontend/src/lib/audio-engine.ts) · [player.ts](frontend/src/stores/player.ts) · [AudioPlayer.vue](frontend/src/components/player/AudioPlayer.vue) · [AudioPostHeader.vue](frontend/src/components/post/AudioPostHeader.vue) · [PlayerProgressBar.vue](frontend/src/components/player/PlayerProgressBar.vue) · [PlayerTrackInfo.vue](frontend/src/components/player/PlayerTrackInfo.vue) · [PlayerControls.vue](frontend/src/components/player/PlayerControls.vue) · [PlayerVolume.vue](frontend/src/components/player/PlayerVolume.vue) · [PostPage.vue](frontend/src/pages/PostPage.vue) · [EditorPage.vue](frontend/src/pages/EditorPage.vue) |
| **Tanggal Ditambahkan** | 2026-11-02 |
| **Redesign Terakhir** | 2026-11-03 — Ncmaz header + global dock 1:1 |

---

## 1. Ringkasan & Tujuan Fitur

Sebelum fitur ini, post dengan `postType === 'audio'` tidak memiliki pengalaman playback: `PostPage.vue` mengabaikan `audioUrl`, tombol play di `PodcastSection.vue` / `PostCard.vue` hanya berupa `RouterLink` ke halaman post (bukan pemutaran), dan `EditorPage.vue` hanya menerima URL manual — `uploadFile()` di kedua DataSource menolak file non-gambar.

Fitur ini menghadirkan:

- **Header post audio** di `PostPage.vue` ala Ncmaz: album art bulat yang berputar saat diputar + tombol play/pause di tengah, badges kategori, judul, dan meta author/date.
- **Player global fixed** yang tetap berjalan saat pengguna berpindah halaman (SPA): dock full-width dengan album art bulat, judul/kategori, progress seekable + buffered, skip 10/15 detik, speed, volume/mute, play/pause, waktu, close, dan mode expanded di mobile.
- **Upload file audio** di editor (`audio/*`, max 20 MB) untuk mengisi `audioUrl`, dengan input URL manual sebagai alternatif.
- **Integrasi orphan-cleanup**: file audio yang diupload dihitung sebagai referensi sehingga tidak dibersihkan sebelum dipakai.

Non-goals: playlist/antrean multi-track, shuffle/repeat, persistensi posisi putar lintas sesi, auto-play saat navigasi, transkrip/equalizer. Catatan: kontrol volume yang dulu non-goal **sudah termasuk** sejak redesign 2026-11-03 (dock Ncmaz).

---

## 2. Alur Pengguna (User Flow)

**Playback (publik):**
1. Pengguna membuka halaman post audio (`postType === 'audio'` dengan `audioUrl`).
2. Header khusus tampil dengan album art bulat + tombol play. Klik "Play audio" → `player.play(post)` memuat `audioUrl` ke engine global dan memutar. Tombol berubah jadi pause; album art berputar selama playing.
3. Player global fixed muncul di kiri bawah. Pengguna berpindah ke halaman lain — playback **tidak terinterupsi** (SPA).
4. Di player global: klik play/pause (toggle), geser progress bar untuk seek, klik X untuk close (stop + sembunyikan).
5. Saat audio `ended`, playback berhenti (posisi selesai) dan tombol kembali ke play.

**Membuat post audio (penulis):**
1. Penulis membuka `EditorPage.vue` → Post Options → memilih `postType = audio`.
2. Muncul kontrol upload audio: tombol "Upload audio" (input `<input type="file" accept="audio/*">`), validasi klien (MIME audio + ≤ 20 MB), panggil `getDataSource().uploadFile(file)`, lalu `audioUrl` terisi otomatis. Preview `<audio controls>` kecil + nama file + tombol hapus.
3. Input URL manual tetap tersedia sebagai alternatif.
4. Publish → `audioUrl` tersimpan; di PocketBase file audio adalah record `media` (referensi oleh post).

---

## 3. Arsitektur & Komponen Terkait

Arsitektur mengikuti pendekatan **A (engine singleton + Pinia store + komponen global)** dari spec:

```
audio-engine.ts (modul TS murni, singleton HTMLAudioElement)
   → stores/player.ts (state & actions, subscribe ke engine)
        → components/player/AudioPlayer.vue (global, di-mount di App.vue)
        → pages/PostPage.vue (header audio)
        → components/sections/PodcastSection.vue, components/PostCard.vue (tombol play)
        → pages/EditorPage.vue (upload audio)
             → api/mock.source.ts & api/pocketbase.source.ts (uploadFile + orphan refs)
                  → backend (media.go: postMediaRefIDs; main.go: ensureMediaCollection)
```

- **`frontend/src/lib/audio-engine.ts`** — modul murni; satu instance `HTMLAudioElement` (preload="auto") dibuat sekali dan hidup seumur app. API: `load(track)`, `play()`, `pause()`, `seek(time)`, `stop()`, `getState()`, `subscribe(listener)`. Event `timeupdate/durationchange/play/pause/ended/error` → push state ke subscribers. `ended` → playing=false (berhenti di akhir); `error` → pesan error di state.
- **`frontend/src/stores/player.ts`** — store Pinia `player`. State: `track`, `playing`, `currentTime`, `duration`, `volume`, `error`. Actions: `play(post)` (load track baru bila beda post, lalu play; resume bila sama), `toggle()`, `pause()`, `seek(t)`, `close()` (stop + clear), `isCurrentPost(postId)`. Store me-subscribe engine; komponen hanya membaca store.
- **`frontend/src/components/player/AudioPlayer.vue`** — di-mount di `App.vue` (global, setara ToastHost). Sejak redesign 2026-11-03 berupa dock full-width `fixed bottom-0 z-30` (bukan mini-card kiri-bawah), hidden saat `track == null`. Berisi `PlayerTrackInfo`, `PlayerProgressBar`, `PlayerControls`, `PlayerVolume`; mobile expand 64→128 px. Aksesibilitas: `role="region" aria-label="Audio player"`, `aria-label` per tombol, `role="alert"`/toast untuk error, dark mode. Detail lengkap di §7.
- **`frontend/src/pages/PostPage.vue`** — blok `v-if="isAudioPost"` header khusus untuk `postType === 'audio' && audioUrl`: album art `rounded-full` + tombol play besar tengah (`aria-label="Play audio"`), state tombol mengikuti store (`isCurrentPost` + `playing`), `@click="isPlayingThis ? player.toggle() : player.play(post)"`. Animasi `audio-spin` (8s linear infinite). Konten artikel/tags/komentar/related tetap di bawahnya. Post non-audio tidak berubah.
- **`frontend/src/pages/EditorPage.vue`** — branch `postType === 'audio'` di Post Options: kontrol upload audio (accept `audio/*`, validasi MIME audio + 20MB, `onAudioUpload` → `getDataSource().uploadFile(file)` → set `audioUrl`), state `uploadingAudio` ("Uploading…"), preview `<audio controls>` + tombol hapus, input URL manual tetap tersedia.
- **`frontend/src/api/mock.source.ts`** — `uploadFile` kini menerima audio (MIME list + ≤20MB); audio disimpan **in-memory** (`sessionAudio` Map), tidak ditulis ke localStorage (hindari kuota data URL besar); `createPost`/`updatePost` saat publish membersihkan `sessionAudio`. `referencedMediaRefs()` menyertakan `post.audioUrl` agar scan orphan gambar tetap konsisten.
- **`frontend/src/api/pocketbase.source.ts`** — `uploadFile` menerima audio (menggunakan konstanta `AUDIO_MIME_TYPES`/`AUDIO_MAX_BYTES`); `audioUrl` ditulis via `sanitizeUrl` ke body post.
- **`frontend/src/lib/media-limits.ts`** — konstanta bersama: `AUDIO_MIME_TYPES = [audio/mpeg, audio/mp4, audio/wav, audio/ogg, audio/webm]`, `AUDIO_MAX_BYTES = 20 * 1024 * 1024` (kedua source memakai list yang sama).
- **`frontend/src/lib/validation.ts` / `sanitize.ts`** — `sanitizeUrl(val, { allowData: true })` untuk field media (`audioUrl`, `videoUrl`, `cover`) agar data-URL hasil upload mock tersimpan; tetap dengan guard ukuran string dan penolakan skema berbahaya (`javascript:`, `vbscript:`, `data:text/html`).
- **`backend/main.go`** — `ensureMediaCollection`: FileField `media` kini `MimeTypes` = gambar + audio, `MaxSize = 20 * 1024 * 1024` (20MB). **Catatan**: hanya berlaku saat koleksi `media` belum ada (lihat Handover di CHANGELOG).
- **`backend/media.go`** — `postMediaRefIDs` kini menyertakan `audioUrl` (`collectMediaRefsFromText(r.GetString("audioUrl"), out)`) sehingga audio tidak dihapus sebagai orphan.

---

## 4. Kontrak Data & TypeScript Schema

**`AudioTrack`** (`lib/audio-engine.ts`):
```typescript
export interface AudioTrack {
  postId: string
  title: string
  audioUrl: string
  coverUrl: string
  authorName: string
}
```

**`AudioEngineState`** (`lib/audio-engine.ts`):
```typescript
export interface AudioEngineState {
  track: AudioTrack | null
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  error: string | null
}
```

**Store `player`** (`stores/player.ts`) — refs: `track`, `playing`, `currentTime`, `duration`, `error`; actions: `play(post: Post)`, `toggle()`, `pause()`, `seek(time: number)`, `close()`, `isCurrentPost(postId: string): boolean`. `Post` type sudah memiliki `audioUrl?: string` (`api/types.ts`, tidak ada perubahan schema).

**Media upload constants** (`lib/media-limits.ts`):
```typescript
export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm']
export const AUDIO_MAX_BYTES = 20 * 1024 * 1024 // 20 MB
```

**Validasi URL (allowData)** (`lib/sanitize.ts`): `sanitizeUrl(value, { allowData?: boolean })` — `data:` URL hanya diizinkan saat `allowData === true`, dibatasi ukuran string, dan tetap menolak skema yang dapat menjadi markup/script (`javascript:`, `vbscript:`, `data:text/html`, dst.) bahkan saat `allowData` aktif.

**Backend media file field** (`backend/main.go` `ensureMediaCollection`): `MimeTypes = [image/jpeg, image/png, image/webp, image/gif, image/avif, audio/mpeg, audio/mp4, audio/wav, audio/ogg, audio/webm]`, `MaxSize = 20 * 1024 * 1024`.

---

## 5. Keamanan & Otorisasi

- **RBAC**:
  - **Playback** (post audio + player global): **Publik** — tidak ada guard khusus; semua visitor dapat memutar audio.
  - **Upload audio** di editor: hanya **Penulis** (dan admin) karena `EditorPage.vue` diakses lewat route penulis. `uploadFile` memakai `getDataSource()` (satu-satunya jalur data dari UI).
  - Backend PocketBase tetap menjadi keputusan akhir: record `media` tunduk pada `ListRule`/`CreateRule`/`UpdateRule` media yang ada.
- **Sanitasi / Anti-XSS**:
  - `audioUrl`, `videoUrl`, dan `cover` dipaksa melewati `sanitizeUrl` (`validation.ts` / `pocketbase.source.ts` / `mock.source.ts`). `data:` hanya diizinkan lewat opsi `allowData: true` dengan guard ukuran; skema berbahaya (`javascript:`, `vbscript:`, `data:text/html`) ditolak bahkan saat `allowData` aktif (lihat `sanitize.test.ts`).
  - Tidak ada `eval()`, `new Function()`, atau rendering HTML mentah dari input pengguna. Judul/author dirender sebagai teks Vue (auto-escaped).
  - Ukuran upload dibatasi keras: audio ≤ 20 MB (klien + server), MIME allowlist di kedua lapisan.
  - Album art (`coverUrl`) dipakai sebagai `src` `<img>` — URL disanitasi sebelum disimpan.

---

## 6. Pengujian & Verifikasi

**Otomatis (vitest + go test):**
- `npm run typecheck` → `vue-tsc --noEmit` lulus tanpa error.
- `npm run lint` → `eslint .` bersih.
- `npm test` → **19 file / 183 test passed**.
- `cd backend && go test ./...` → `ok ncmaz.backend`.

Test spesifik terkait:
- `frontend/src/stores/player.test.ts` — mock `AudioEngine`; verifikasi load/play/toggle/pause/seek/close/isCurrentPost & sinkronisasi.
- `frontend/src/lib/audio-engine.test.ts` — (bila ada) unit engine dengan mock `HTMLAudioElement`.
- `frontend/src/api/mock.source.test.ts` — upload audio ke session memory tanpa persistensi localStorage; cleanup `sessionAudio` saat publish; audio yang dirujuk tidak dilaporkan orphan; tolak tipe non-audio/non-gambar & audio >20MB.
- `frontend/src/api/pocketbase.source.test.ts` — terima upload audio + FormData; tolak non-audio & oversize.
- `frontend/src/lib/sanitize.test.ts` — simpan data URL saat `allowData` true; blok `javascript:`/`vbscript:`; tolak data URL oversize & `data:text/html`.
- `backend/media_test.go` — refs `audioUrl` di `postMediaRefIDs`; `ensureMediaCollection` memuat MIME audio (dan gambar) + `MaxSize` 20MB.
- `backend/main_test.go` — (bila ada) integrasi.

**Manual (browser):**
1. Buka post audio (mock `mock-data/posts.ts` punya seed audio) → header album art + tombol play tampil.
2. Klik play → audio berbunyi, album art berputar, player global muncul.
3. Pindah ke halaman lain → audio **lanjut** (tidak berhenti).
4. Kembali ke post → state tombol sinkron (pause icon).
5. Player global: play/pause, drag progress → seek, close → berhenti + sembunyikan.
6. Editor: buat post audio → Upload audio (file <20MB) → `audioUrl` terisi + preview; upload file non-audio / >20MB → ditolak; URL manual tetap opsi.
7. Mode mock: publish post audio → audio mock dibersihkan (session); di PocketBase: verifikasi `audioUrl` tersimpan dan file `media` tidak dihapus oleh orphan-cleanup.

**Verifikasi produksi (PocketBase):** untuk instalasi lama, pastikan koleksi `media` di-update manual di admin (tambah MIME audio + MaxSize 20MB) — lihat Handover notes di `CHANGELOG.md` (Task 10).

---

## 7. Redesign 2026-11-03 — Header + Global Dock Ncmaz (1:1)

Bagian ini menggantikan deskripsi mini-card kiri-bawah pada versi awal. Referensi visual: post audio Ncmaz (album art berputar + dock full-width).

### 7.1 Header audio (`AudioPostHeader.vue`)
- Hanya dirender untuk `postType === 'audio' && audioUrl`; post non-audio tidak berubah.
- Band `bg-primary-50 dark:bg-neutral-800` setinggi 240 px, card `max-w-[78rem]`, `rounded-2xl md:rounded-[40px]`,
  `shadow-2xl`, padding `px-4 py-7 sm:px-5 lg:p-11`.
- Vinyl: `aspect-square rounded-full`, `nc-animation-spin` 20 detik, overlay `neutral-900/75`,
  tombol play 80×80 di tengah; ikon play 44 px saat paused, equalizer CSS saat playing.
- Info: kategori, judul `2xl → [2.75rem]` semibold, divider, avatar/nama/date/read time,
  lalu aksi compact: like + komentar + views | save + share + edit (edit hanya jika berhak).
- **Excerpt tidak ditampilkan** di header audio.
- Baris aksi lama di luar header dan kartu “Written by” disembunyikan untuk audio agar
  Like/Save tidak muncul dua kali.

### 7.2 Global dock (`AudioPlayer.vue` + subkomponen)
- Muncul setelah track diputar; fixed `bottom-0`, `z-30`, full-width, `bg-white dark:bg-neutral-800`,
  shadow Google-like; tetap hidup lintas rute SPA.
- Progress absolute di `bottom-full`: 2 px, played `primary-500`, buffered `primary-500/30`,
  thumb 12 px, input range transparan (aria-label “Seek audio”).
- Tinggi: 64 px (<640), 80 px (≥640), +64 px saat expanded (<1024). Progress overlay
  tidak dihitung dalam tinggi.
- Kiri: cover 40/48 px berputar, judul + kategori (link ke post), like compact + save (≥1280).
- Tengah (≥1024): skip -10 detik, play/pause 56/64 px, skip +15 detik, speed
  `1.0x → 1.5x → 2.0x → 1.0x`.
- Kanan: mute + volume 96 px (default 80%), waktu `0:00 / 2:16` (≥1024), close.
- Mobile collapsed: cover/title/kategori, play/pause, close, chevron expand.
- Mobile expanded (128 px di 390): save, skip -10, play/pause 56 px, skip +15, speed.
  Tombol play/pause baris atas disembunyikan saat expanded agar tidak duplikat.

### 7.3 State & kontrak baru
```ts
export interface AudioTrack {
  postId: string
  slug: string
  title: string
  audioUrl: string
  coverUrl: string
  authorName: string
  categoryName: string
  likeCount: number
}
```
`AudioEngineState` menambah `buffered`, `muted`, `playbackRate`. Engine menambah
`setVolume`, `setMuted`, `setPlaybackRate`, `skip`; store menambah ref/action yang sama
(`toggleMute`, `cycleRate`, `skip`). Volume default 0.8; `setVolume(0)` memutingkan;
unmute memulihkan `lastVolume`. `LikeButton` mendapat varian `compact` dan menerima
`Pick<Post, 'id' | 'likeCount'>`.

### 7.4 BackToTop & Toast
- Dock mengukur tinggi aktual via `ResizeObserver` dan menulis
  `--player-dock-height` ke `<html>`; reset 0 saat track null/unmount.
- `BackToTop` memakai `bottom: calc(var(--player-dock-height, 0px) + 1.5rem)`.
- `ToastHost` memakai offset yang sama (`+ 1rem`) agar tidak menutupi kontrol dock.
- Hasil e2e: gap BackToTop ke dock = 24 px pada desktop, mobile collapsed, dan mobile expanded.

### 7.5 Verifikasi redesign
- `npm run typecheck` — bersih.
- `npm run lint` — bersih.
- `npm test` — 19 file / 199 test passed.
- `npx playwright test e2e/audio-player.spec.ts` — 3 passed (header/dock, BackToTop desktop/mobile, post non-audio).
- Build produksi + deploy ke server 64; smoke test `https://blog.artku.my.id/post/snap-cracle`:
  dock 80 px desktop, 64/128 px mobile, BackToTop gap 24 px, speed/mute/close bekerja,
  `scrollWidth <= clientWidth`, tidak ada console error, `/api/health` 200.

### 7.6 Deviasi sadar dari referensi
- Equalizer CSS, bukan GIF `icon-playing.gif` (tema-aware + reduced motion).
- Badge kategori tetap palet project (primary), bukan peta warna per kategori Ncmaz.
- Menu “more” referensi tidak ditiru; edit hanya ikon untuk yang berhak.
- Mobile expanded tidak menduplikasi tombol play/pause.
- Toast ikut di-offset; referensi tidak punya toast.
