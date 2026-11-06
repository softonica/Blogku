# Design: Audio Post Player (SPA-global) + Audio Upload

Tanggal: 2026-11-02
Status: Draft (menunggu approval)
Project: ncmaz-clone (frontend Vue 3 + TS + Pinia + Vue Router, SPA)

## 1. Intent & Mengapa

Referensi visual: https://ncmaz-faust-delta.vercel.app/new-tools-and-advocacy-support-black-pregnant-and-postpartum-mothers-to-save-lives/
(post format Audio, tampilan single post dengan album art bulat berputar + tombol play,
dan player fixed yang muncul saat audio diputar).

Saat ini di project:
- `PostPage.vue` tidak merender apa pun untuk `postType === 'audio'` (audioUrl diabaikan).
- Tombol play di `PodcastSection.vue` / `PostCard.vue` hanya `RouterLink` ke halaman post — bukan playback.
- `EditorPage.vue` hanya menyediakan input URL manual untuk audio; `uploadFile()` di kedua
  DataSource (mock & pocketbase) menolak file non-gambar.
- `audioUrl` sudah ada di tipe `Post`/`PostInput` — tidak perlu perubahan schema.

Tujuan: post audio tampil dengan desain seperti referensi (header album art bulat +
tombol play), diputar melalui **player global fixed** ala Ncmaz yang tetap berjalan saat
user berpindah halaman (SPA), dan author dapat **upload file audio** (bukan hanya URL).

## 2. Goals / Non-goals / Anti-goals

Goals:
- G.1 Post `audio` di `PostPage.vue` mendapat header khusus: album art bulat (cover)
  yang berputar saat diputar + tombol play di tengah, badges kategori, judul, meta author/date.
- G.2 Klik tombol play (di halaman post) memuat `audioUrl` ke engine audio global dan memutar.
- G.3 Player global fixed muncul saat ada track aktif: album art, judul/post, progress bar
  (seekable), play/pause, tombol close. Perpindahan rute tidak menginterupsi playback.
- G.4 Di `EditorPage.vue`, saat `postType === 'audio'`, user bisa upload file audio
  (accept audio/*, max 20 MB) → `audioUrl` terisi otomatis; input URL manual tetap ada sebagai alternatif.
- G.5 File audio yang terupload dihitung sebagai referensi oleh mechanic orphan-cleanup
  (tidak dibersihkan saat belum dipakai). Update di mock & pocketbase.
- G.6 Unit test untuk engine/store, uploadFile (terima audio), orphan refer audio.
- G.7 Dokumentasi fitur (`docs/features/…`) + entri `CHANGELOG.md` (aturan repo).

Non-goals (di luar scope):
- Playlist / antrean multi-track, shuffle, repeat mode.
- Persistensi posisi putar lintas sesi (hanya dalam satu sesi SPA).
- Auto-play saat navigasi.
- Lorem/transkrip audio, equalizer.
- Kontrol volume/seek dalam player mini (mengikuti referensi: cukup play/pause + progress + close).
- Migrasi media mock (data URL) ke IndexedDB — diputuskan tidak dilakukan (lihat 5.7).

Anti-goals (kegagalan):
- Playback berhenti saat pindah halaman.
- Dua suara berbunyi bersamaan (dua Audio instance aktif).
- Upload audio gagal di salah satu DataSource (mock/pocketbase).
- Audio diupload tapi dihapus sebagai orphan oleh sistem.

## 3. Constraint

- Repo ini memuat backend Go/PocketBase di `backend/` (`main.go`, `media.go`, test Go) —
  **perubahan backend termasuk scope (keputusan user, Q1)**:
  - `main.go:471-477`: FileField `media` saat ini `MimeTypes` image-only + `MaxSize` 5MB
    → perlu ditambah MIME audio + MaxSize 20MB.
  - `media.go:288 postMediaRefIDs`: orphan scanner tidak menghitung `audioUrl` → perlu ditambah.
  - Validasi client-side tetap ada (UX error cepat), tapi keputusan akhir ada di server.
- Mode runtime: `VITE_USE_POCKETBASE` menentukan PocketBase vs mock; mock adalah default dev.
  Mock menyimpan media sebagai data URL di localStorage JSON — audio besar tidak muat → lihat 5.7.
- `uploadFile` saat ini: MIME image-only + max 5 MB di kedua source. Mock menyimpan sebagai data URL
  via `writeJson` (storage JSON); perlu batas ukuran masuk akal (20 MB) agar JSON tidak meledak.
- Aturan repo: DoD = typecheck (`vue-tsc --noEmit`), lint (`eslint .`), test (`vitest run`),
  dokumen di `docs/features/`, update `docs/README.md`, entri `CHANGELOG.md`.
- Dark mode & `aria-*` wajib pada komponen baru (aturan repo).
- `getDataSource()` adalah satu-satunya jalur data dari UI.

## 4. Approaches (yang dipertimbangkan)

- **A (DIPILIH): Engine audio singleton + Pinia store + komponen global.**
  `lib/audio-engine.ts` = modul TS murni yang memiliki satu instance `HTMLAudioElement`
  (dibuat sekali di luar komponen, hidup seumur app). `stores/player.ts` = state & actions
  (`play(post)`, `pause`, `seek`, `close`, `toggle`), subscribe ke event engine
  (timeupdate/ended/play/pause) untuk sinkronisasi. `AudioPlayer.vue` di-mount di `App.vue`
  (setara ToastHost/SearchDialog). Keuntungan: logika murni mudah diuji (vitest), komponen tipis,
  tidak bergantung lifecycle komponen, benar-benar SPA.
- B: `<audio>` dimiliki komponen root (`AudioPlayer.vue`) yang di-mount permanen; store hanya metadata.
  Lebih sederhana, tetapi kontrol playback terikat lifecycle komponen dan sulit diuji terpisah.
- C: Playback di dalam `PostPage.vue` saja (tanpa engine global) → gagal memenuhi G.3. Ditolak.

## 5. Keputusan Desain (yang sudah disepakati)

### 5.1 Audio engine (`frontend/src/lib/audio-engine.ts`)
- Singleton: `createAudioEngine()` atau module-level instance; satu `HTMLAudioElement` (preload="auto").
- API: `load(track)`, `play()`, `pause()`, `seek(time)`, `stop()`, `getState()`, `subscribe(listener)`.
- Event wiring: `timeupdate`, `durationchange`, `play`, `pause`, `ended`, `error` → push state ke subscribers.
- `ended`: set playing=false (posisi selesai); store tetap menampilkan track.
- Error: event `error` → store `error` message (tampil pada player).

### 5.2 Player store (`frontend/src/stores/player.ts`)
- State: `{ track: { postId, title, audioUrl, coverUrl, authorName } | null, playing: boolean,
  currentTime: number, duration: number, volume: number, error: string | null }`.
- Actions: `play(post: Post)` (set track baru + load + play, atau resume bila track sama),
  `toggle()`, `pause()`, `seek(t)`, `close()` (stop + clear track).
- Sinkronisasi: store me-subscribe engine; komponen membaca dari store.

### 5.3 Komponen global (`frontend/src/components/player/AudioPlayer.vue`)
- Di-mount di `App.vue` (global, bukan hanya non-admin — konsisten dengan ToastHost).
- Fixed bottom (kiri, mengikuti referensi Ncmaz): kartu kecil berisi album art bulat
  (CSS `animate-spin` saat playing, lambat — class custom `animate-spin-slow` bila perlu),
  judul + author, progress bar (input range / div click untuk seek), tombol play/pause,
  tombol close. Sembunyikan saat `track == null`.
- Aksesibilitas: aria-label pada tiap tombol; mode gelap (`dark:`).
- Tidak menampilkan volume control (non-goal).

### 5.4 PostPage redesign (`frontend/src/pages/PostPage.vue`)
- Bila `post.postType === 'audio' && post.audioUrl`: buat header khusus menggantikan header standar
  (blok `v-if` baru): kartu rounded besar (mirip `rounded-[40px]` referensi) dengan:
  - kiri: album art bulat (`rounded-full`, object-cover) + tombol play besar di tengah
    (dipakai ulang pola `nc-ButtonPlayMusicPlayer`); atribut `aria-label="Play audio"`.
    Klik → `player.play(post)`.
  - kanan: `CategoryBadgeList`, judul h1, excerpt, meta author/date/reading time.
- Konten artikel, tags, komentar, related posts tetap seperti sekarang di bawahnya.
- State play/pause tombol header mengikuti store (jika track aktif = post ini → tampil icon pause).
- Post non-audio: tidak berubah.

### 5.5 PodcastSection & PostCard (scope kecil, disertakan)
- Tombol play di `PodcastSection.vue` (2 varian) dan `PostCard.vue` (icon Play utk video?
  tidak — hanya varian audio) dipanggil `player.play(post)` dan menuju halaman post.
  Khusus audio: klik play = langsung memutar; label/link judul tetap navigasi.
- Untuk video: TIDAK diubah (tetap link) — di luar scope.

### 5.6 Upload audio di Editor (`frontend/src/pages/EditorPage.vue`)
- Branch `postType === 'audio'` di modal Post Options:
  - ganti/dampingi input URL dengan kontrol upload: label + hidden `<input type="file" accept="audio/*">`
    (pola sama seperti upload cover), tombol "Upload audio" / "Change audio" / "Remove".
  - handler `onAudioUpload`: validasi klien (MIME audio + ≤ 20 MB), panggil `getDataSource().uploadFile(file)`,
    set `audioUrl` = result.url; state `uploadingAudio` untuk tombol "Uploading…".
  - preview: jika `audioUrl` ada, tampilkan `<audio controls>` kecil + nama file + tombol hapus.
  - input URL manual tetap disediakan sebagai alternatif (placeholder tetap).
- Validasi: reuse konstanta daftar MIME audio; max 20 MB.
- **Mode mock** (default dev): audio yang diupload **hanya preview & sesi** — setelah post
  di-publish, data audio mock dihapus (lihat 5.7).

### 5.7 DataSource, backend & orphan-cleanup

**Backend (dalam scope):**
- `backend/main.go` — FileField `media`: tambah `MimeTypes` audio (`audio/mpeg`, `audio/mp4`,
  `audio/wav`, `audio/ogg`, `audio/webm`) + naikkan `MaxSize` ke 20MB (gambar tetap 5MB).
- `backend/media.go postMediaRefIDs` — tambah `audioUrl` ke refs post.
- Test Go di `backend/media_test.go` / `main_test.go` untuk keduanya.

**Mock (`frontend/src/api/mock.source.ts`):**
- `uploadFile` audio: **tidak ditulis ke localStorage** (hindari kuota data URL besar) —
  disimpan in-memory (sesi) dalam map terpisah; tetap mengembalikan data URL untuk preview.
- **Cleanup saat publish:** `createPost`/`updatePost` (status `published`) menghapus entri
  audio in-memory tersebut. Efek: media mock audio hanya bersifat preview & sesi;
  bila post dihapus/gagal, entri ikut hilang saat sesi berakhir. (Keputusan user, Q2.)
- MIME/size validation sama seperti pocketbase (audio ≤ 20MB).
- `referencedMediaRefs()` tambahkan `post.audioUrl` (untuk scan orphan gambar-mendukung tetap konsisten).

**PocketBase client (`frontend/src/api/pocketbase.source.ts`):**
- `uploadFile`: perbolehkan MIME audio + 20MB (server sekarang menerimanya).

**Sanitasi `data:` URL (keputusan builder):**
- `validation.ts` memaksa `audioUrl`/`cover`/`videoUrl` melewati `sanitizeUrl`, yang menolak
  `data:` → hasil upload mock akan hilang saat publish (bug laten juga ada pada cover).
- Keputusan: tambah opsi `allowData` pada `sanitizeUrl` untuk field media, dengan guard
  ukuran string (mis. ≤ 20MB encoded) — nilai berasal dari uploader internal sendiri.
- Test terkait di `validation` test.

### 5.8 Testing & verifikasi
- `audio-engine` unit test (mock `HTMLAudioElement` — vitest happy-dom/jsdom; verifikasi load/play/pause/seek/ended).
- `stores/player.ts` unit test.
- `PostPage` render test bila pola ada (minimal smoke via vitest component render).
- Jalankan: `vue-tsc --noEmit`, `eslint .`, `vitest run`.
- Manual: buka post audio → play → pindah ke halaman lain → audio lanjut; kembali ke post → state sinkron.

## 6. Yang diserahkan ke builder

- Detail styling eksak (spacing/radius/shadow) mengikuti pola Tailwind yang sudah ada di repo
  (class `nc-*` tidak wajib; gunakan pola `nc-` bila membantu konsistensi).
- Nama file fitur docs: `docs/features/14-audio-player-and-upload.md` (nomor urut berikutnya).
- Implementasi event `ended` (apakah auto-rewind atau berhenti) — default: berhenti di akhir.
- Transisi/animasi kemunculan player (opsional; default: fade/slide singkat).

## 7. Dekomposisi kerja (untuk rencana)

1. `lib/audio-engine.ts` + unit test.
2. `stores/player.ts` + unit test.
3. `components/player/AudioPlayer.vue` + mount di `App.vue`.
4. `PostPage.vue` header audio + wiring store.
5. `PodcastSection.vue` / `PostCard.vue` play button wiring.
6. `uploadFile` audio di mock & pocketbase (+ konstanta MIME/size bersama).
7. `EditorPage.vue` upload audio UI + cleanup mock saat publish.
8. Backend Go: FileField media (MIME audio + 20MB) & `postMediaRefIDs` + `audioUrl`; test Go.
9. Sanitize `data:` (allowData) untuk field media + test.
10. Test integration + typecheck + lint.
11. Docs (`docs/features/…`, `docs/README.md`) + `CHANGELOG.md`.
