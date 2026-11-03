# Audio Post Player (SPA-global) + Audio Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fitur post audio: header ala referensi Ncmaz di halaman post, player global fixed yang tetap berjalan lintas rute (SPA), dan upload file audio di editor (dengan dukungan backend Go).

**Architecture:** Engine audio singleton (`HTMLAudioElement` tunggal di luar komponen) + Pinia store `player` + komponen `AudioPlayer.vue` global di `App.vue`. PostPage memanggil store; editor memakai `uploadFile` yang diperluas ke audio; backend Go menerima audio dan menghitung `audioUrl` sebagai referensi media.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Pinia, Vue Router, lucide-vue-next, Tailwind (dark mode), vitest + jsdom + @vue/test-utils, Zod, PocketBase (backend Go, `pocketbase` SDK).

**Spec:** `docs/superpowers/specs/2026-11-02-audio-player-feature-design.md`

## Global Constraints

- Frontend: `vue-tsc --noEmit` bersih; `eslint .` tanpa error; `vitest run` hijau.
- Backend: `go test ./...` hijau (dari `backend/`).
- MIME audio yang diizinkan (client & server, sama persis): `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/ogg`, `audio/webm`.
- Batas ukuran: gambar 5 MB (tidak berubah); audio 20 MB.
- `getDataSource()` adalah satu-satunya jalur data dari komponen.
- Komponen baru wajib `dark:` + atribut `aria-*`.
- Mock: audio upload hanya preview/sesi, in-memory, TIDAK ditulis ke localStorage; dibersihkan saat publish.
- Dokumen wajib pada tugas terakhir: `docs/features/14-audio-player-and-upload.md` + update `docs/README.md` + entri `CHANGELOG.md` (format team-work).

## Review Focus

- Media yang hanya dirujuk `audioUrl` (dan bukan konten lain) tidak boleh dihapus orphan-cleanup. → Tugas 6 (mock, via `referencedMediaRefs`) & Tugas 8 (backend, via `postMediaRefIDs`).
- Upload audio di mode mock TIDAK boleh ditulis ke localStorage (data URL > kuota) dan harus hilang setelah publish. → Tugas 6 (spy `writeJson`; `listMedia` sebelum vs sesudah publish).
- `sanitizeUrl` tidak boleh menghapus `data:` URL pada field media (hasil upload mock harus survive publish). → Tugas 9.
- Instance audio harus tunggal seumur app (dilarang dua suara). → Tugas 1 (dua pemanggilan `getAudioEngine()` mengembalikan elemen sama).
- `media` collection PocketBase yang sudah ada tidak otomatis ter-migrate oleh `main.go` (hanya dipakai saat collection belum ada) → catatan handover di Tugas 8.

---

### Task 1: Audio engine singleton

**Files:**
- Create: `frontend/src/lib/audio-engine.ts`
- Test: `frontend/src/lib/audio-engine.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface AudioTrack { postId: string; title: string; audioUrl: string; coverUrl: string; authorName: string }`
  - `interface AudioEngineState { track: AudioTrack | null; playing: boolean; currentTime: number; duration: number; volume: number; error: string | null }`
  - `type AudioEngineListener = (state: AudioEngineState) => void`
  - `getAudioEngine(): { load(track: AudioTrack): void; play(): Promise<void>; pause(): void; seek(time: number): void; stop(): void; getState(): AudioEngineState; subscribe(listener: AudioEngineListener): () => void }`

- [ ] **Step 1: Write failing test `frontend/src/lib/audio-engine.test.ts`**

Gunakan `vi.stubGlobal('Audio', MockAudio)` (class mock dengan `src`, `play()`, `pause()`, `currentTime`, `duration`, `volume`, event handlers `ontimeupdate` dst., `load()`). Assertions kunci:
- `getAudioEngine()` dua kali → `toBe` elemen `<audio>`/instance Audio yang sama (singleton).
- `load(track)` set `src = track.audioUrl` dan state.track = track.
- `play()` memanggil `audio.play()`; `pause()` memanggil `audio.pause()`.
- Simulasi `timeupdate` (set `currentTime=13.5` lalu panggil handler) → state.currentTime === 13.5; `durationchange` (duration=180) → state.duration === 180.
- Simulasi event `ended` → state.playing === false.
- Simulasi event `error` → state.error truthy.
- `seek(30)` set `audio.currentTime = 30`.
- `stop()` → state.track === null && playing false.

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- frontend/src/lib/audio-engine.test.ts` (dari `frontend/`)
Expected: FAIL — modul tidak ada.

- [ ] **Step 3: Implement `frontend/src/lib/audio-engine.ts`**

Module-level `let audioEl: HTMLAudioElement | null = null`; `getAudioEngine()` membuat elemen sekali (`new Audio()`, `preload="auto"`) dan me-wire event `timeupdate`, `durationchange`, `play`, `pause`, `ended`, `error`. `subscribe` mengembalikan unsubscriber. `load` menyetel track & `src` (jangan auto-play); `play` memanggil `audio.play()` (catch rejection → state.error).

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- frontend/src/lib/audio-engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/audio-engine.ts frontend/src/lib/audio-engine.test.ts
git commit -m "feat(audio): singleton audio engine"
```

### Task 2: Player store (Pinia)

**Files:**
- Create: `frontend/src/stores/player.ts`
- Test: `frontend/src/stores/player.test.ts`

**Interfaces:**
- Consumes: Task 1 `getAudioEngine()`, `AudioTrack`, `AudioEngineState`; type `Post` dari `@/api/types`.
- Produces:
  - `usePlayerStore()` dengan state `{ track: AudioTrack | null; playing: boolean; currentTime: number; duration: number; error: string | null }`
  - actions: `play(post: Post): void`, `toggle(): void`, `pause(): void`, `seek(time: number): void`, `close(): void`, `isCurrentPost(postId: string): boolean`

- [ ] **Step 1: Write failing test `frontend/src/stores/player.test.ts`**

Setup: `setActivePinia(createPinia())`; mock `../lib/audio-engine` (vi.mock) dengan `getAudioEngine` mengembalikan stub yang mencatat panggilan & memicu listener. Assertions kunci:
- `play(post)` dengan track beda → engine.load dipanggil dgn `{ postId, title, audioUrl, coverUrl, authorName }` dari post, engine.play dipanggil, state.track terisi.
- `play(post)` dua kali dgn post sama → engine.load hanya dipanggil sekali (resume), engine.play dipanggil lagi.
- `toggle()` → engine.pause saat playing; engine.play saat tidak.
- `seek(30)` → engine.seek(30).
- Simulasi listener engine (currentTime) → state sinkron.
- `close()` → engine.stop() && state.track === null.
- `isCurrentPost('p1')` true saat track.postId==='p1'.

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- frontend/src/stores/player.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `frontend/src/stores/player.ts`**

`defineStore('player', ...)`. `play(post)`: jika `track?.postId !== post.id` → engine.load(track baru) lalu engine.play(); jika sama → engine.play(). Store me-subscribe engine sekali (di init) dan menyalin state. `close()` di-`stop()`.

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- frontend/src/stores/player.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/player.ts frontend/src/stores/player.test.ts
git commit -m "feat(audio): player store"
```

### Task 3: Komponen player global + mount di App

**Files:**
- Create: `frontend/src/components/player/AudioPlayer.vue`
- Modify: `frontend/src/App.vue` (import + `<AudioPlayer />` di template, dekat `<ToastHost />`)

**Interfaces:**
- Consumes: Task 2 `usePlayerStore()`.
- Produces: komponen `AudioPlayer` (tanpa props; baca store).

- [ ] **Step 1: Implement `frontend/src/components/player/AudioPlayer.vue`**

Fixed bottom kiri (mia. `fixed bottom-4 left-4 z-40`), hanya dirender saat `track` ada:
- Album art bulat (img `rounded-full object-cover h-14 w-14`, class `animate-spin` kustom lambat — tambah `animate-spin-slow` via CSS bila perlu) hanya saat `playing`.
- Judul (truncate) + author, di samping art.
- Tombol play/pause (lucide `Play`/`Pause`, `aria-label` dinamis).
- Progress bar: `<input type="range" min="0" :max="duration || 0" :value="currentTime" @input="seek(Number($event.target.value))">` + label waktu `mm:ss`.
- Tombol close (lucide `X`, `aria-label="Close player"`).
- Error state: tampilkan `error` (teks kecil) bila ada.
- Semua warna memakai varian `dark:`.

- [ ] **Step 2: Mount di `frontend/src/App.vue`**

Import `AudioPlayer from '@/components/player/AudioPlayer.vue'`; tambah `<AudioPlayer />` setelah `<ToastHost />`.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck` (dari `frontend/`)
Expected: tidak ada error TS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/player/AudioPlayer.vue frontend/src/App.vue
git commit -m "feat(audio): global fixed player component"
```

### Task 4: PostPage — header audio ala referensi

**Files:**
- Modify: `frontend/src/pages/PostPage.vue`

**Interfaces:**
- Consumes: Task 2 `usePlayerStore()`, `Play`/`Pause` dari lucide-vue-next, `CategoryBadgeList`, `AppAvatar`, `formatDate`, `isCurrentPost`.
- Produces: —

- [ ] **Step 1: Tambah store & computed di `<script setup>` PostPage**

`const player = usePlayerStore()`; computed `isAudioPost = post.postType === 'audio' && !!post.audioUrl`; computed `isPlayingThis = player.isCurrentPost(post.id) && player.playing`.

- [ ] **Step 2: Render header audio saat `isAudioPost`**

Di dalam `<template v-else>` (setelah breadcrumb, sebelum header standar): blok `<header v-if="isAudioPost">`:
- Kartu besar: `rounded-2xl bg-white shadow-2xl sm:rounded-[40px] ... dark:bg-neutral-900 items-center justify-center flex flex-col md:flex-row gap-8 ...`.
- Kiri: div `w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 shrink-0`: art bulat (`rounded-full overflow-hidden aspect-square relative`) berisi `<img :src="post.cover">`, plus overlay tombol play besar di tengah (`h-20 w-20 rounded-full border-2 border-neutral-300 bg-black/50 text-white flex items-center justify-center`); icon `Play`/`Pause` sesuai `isPlayingThis`; `@click="isPlayingThis ? player.toggle() : player.play(post)"`; `aria-label="Play audio"`/`"Pause audio"`.
- Kanan: `CategoryBadgeList`, `<h1>` judul, excerpt, meta author (`AppAvatar` + nama + tanggal + reading time).
- Header standar (`v-if="!isHeroStyle"`) diberi kondisi tambahan `v-if="!isAudioPost && !isHeroStyle"` agar tidak ganda.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PostPage.vue
git commit -m "feat(audio): audio post header on single post page"
```

### Task 5: Wire tombol play PodcastSection & PostCard

**Files:**
- Modify: `frontend/src/components/sections/PodcastSection.vue`
- Modify: `frontend/src/components/post/PostCard.vue`

**Interfaces:**
- Consumes: Task 2 `usePlayerStore()`.

- [ ] **Step 1: `PodcastSection.vue` — tombol play memutar audio**

Di dua varian (Center Play Button & pill), ganti aksi tombol play (`aria-label="Play podcast"`):
- Bungkus span play dengan `<button type="button" @click="player.play(post)" :aria-label="..." :disabled="!post.audioUrl">` (tetap di dalam `RouterLink` overlay — hati-hati nested interactive: ubah overlay jadi `div` saja atau letakkan `@click.stop` pada button dalam RouterLink; pilih: ganti `RouterLink` overlay menjadi `<div>` + `@click="navigate"` via `useRouter().push(`/post/${post.slug}`)` bila area non-button diklik).
- Icon `Pause` saat `player.isCurrentPost(post.id) && player.playing`, selain itu `Play`.

- [ ] **Step 2: `PostCard.vue` — varian audio**

Pada badge/icon audio (`Headphones`), tambah tombol play kecil (`Play`) untuk `postType === 'audio' && post.audioUrl` yang memanggil `player.play(post)` (`@click.stop`); icon video tetap tak berubah.

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: bersih.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/sections/PodcastSection.vue frontend/src/components/post/PostCard.vue
git commit -m "feat(audio): wire podcast card play buttons to global player"
```

### Task 6: uploadFile audio di mock & pocketbase + cleanup mock

**Files:**
- Create: `frontend/src/lib/media-limits.ts`
- Modify: `frontend/src/api/mock.source.ts`
- Modify: `frontend/src/api/pocketbase.source.ts`
- Test: `frontend/src/api/mock.source.test.ts`, `frontend/src/api/pocketbase.source.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `const AUDIO_MIME_TYPES: string[]` = di Global Constraints (dipakai Task 7).
  - `const AUDIO_MAX_BYTES = 20 * 1024 * 1024`
  - mock: properti privat `sessionAudio: Map<string, MediaItem>`; `uploadFile` menerima audio → simpan hanya di `sessionAudio` (TIDAK `writeJson`); `listMedia` menggabungkan `sessionAudio`; `createPost`/`updatePost` dengan status `'published'` → `sessionAudio.clear()`; `referencedMediaRefs()` tambah `add(post.audioUrl)`.

- [ ] **Step 1: Write failing tests**

Di `mock.source.test.ts`:
- `uploadFile` audio (mp3) → resolve `{ url, name }`, `listMedia` memuatnya, DAN `localStorage`/`writeJson` TIDAK dipanggil untuk audio (spy `writeJson`, atau cek MEDIA_KEY tidak berubah).
- setelah `createPost({...status:'published'})` → `listMedia` tidak lagi memuat audio itu.
- `referencedMediaRefs`/orphan: post dengan `audioUrl` data URL tidak masuk daftar orphan (jalankan `listOrphanMedia()` → item tidak muncul).
- `uploadFile` tipe tidak diizinkan (mis. `application/pdf`) → reject; audio > 20MB → reject.

Di `pocketbase.source.test.ts`:
- `uploadFile` audio → membentuk FormData & tidak menolak (MIME audio diizinkan); non-audio tetap ditolak; > 20MB ditolak.

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- frontend/src/api/mock.source.test.ts frontend/src/api/pocketbase.source.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `frontend/src/lib/media-limits.ts` + perubahan kedua source**

Sesuai Interfaces di atas. Mock `uploadFile`: bila tipe audio → validasi, `reader.readAsDataURL`, simpan di `sessionAudio`. `listMedia`: gabung `[...this.media, ...this.sessionAudio.values()]` dgn sort `createdAt` desc. `createPost`/`updatePost`: setelah sukses, jika `input.status === 'published' || sanitizedInput.status === 'published'` → `this.sessionAudio.clear()`. `referencedMediaRefs`: `add(post.audioUrl)`.

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- frontend/src/api/mock.source.test.ts frontend/src/api/pocketbase.source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/media-limits.ts frontend/src/api/mock.source.ts frontend/src/api/mock.source.test.ts frontend/src/api/pocketbase.source.ts frontend/src/api/pocketbase.source.test.ts
git commit -m "feat(audio): support audio uploads in data sources"
```

### Task 7: EditorPage — upload audio UI

**Files:**
- Modify: `frontend/src/pages/EditorPage.vue`

**Interfaces:**
- Consumes: Task 6 `AUDIO_MIME_TYPES`, `AUDIO_MAX_BYTES`; `getDataSource().uploadFile`; lucide `Upload`, `X`.
- Produces: —

- [ ] **Step 1: Tambah state & handler di `<script setup>`**

`const uploadingAudio = ref(false)`; `async function onAudioUpload(e: Event)`:
- ambil `file` dari `(e.target as HTMLInputElement).files?.[0]`; validasi `AUDIO_MIME_TYPES.includes(file.type)` & `file.size <= AUDIO_MAX_BYTES` (error → `ui.notify(msg, 'error')`); set `uploadingAudio = true`; `const { url } = await getDataSource().uploadFile(file)`; `audioUrl.value = url`; `finally` reset `uploadingAudio` & `e.target.value = ''`.

- [ ] **Step 2: Ganti branch audio di modal Post Options**

Saat `postType === 'audio'`:
- Jika `audioUrl`: tampil `<audio :src="audioUrl" controls class="w-full">` + tombol hapus (`X`, `@click="audioUrl = ''"`, `aria-label="Remove audio"`).
- Label upload: `<label>` dgn icon `Upload` + teks `uploadingAudio ? 'Uploading…' : audioUrl ? 'Change audio' : 'Upload audio'` + hidden `<input type="file" accept="audio/*" class="sr-only" :disabled="uploadingAudio" @change="onAudioUpload">`.
- Tetap sertakan input URL manual (`v-model="audioUrl"`, placeholder `https://example.com/audio.mp3`) sebagai alternatif.

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: bersih.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/EditorPage.vue
git commit -m "feat(audio): audio file upload in editor"
```

### Task 8: Backend Go — media audio + orphan ref audioUrl

**Files:**
- Modify: `backend/main.go` (FileField media, ± baris 471-477)
- Modify: `backend/media.go` (`postMediaRefIDs`, ± baris 288-303)
- Test: `backend/media_test.go`

**Interfaces:**
- Consumes: —
- Produces: FileField `media` menerima MIME audio, MaxSize 20MB; `postMediaRefIDs` menyertakan `audioUrl`.

- [ ] **Step 1: Write failing Go tests di `backend/media_test.go`**

- `TestPostMediaRefIDsIncludesAudioURL`: buat post record (pakai pola test existing — `core.Record` dgn set string cover/content/audioUrl yang berisi `/api/files/media/recA/...` pada audioUrl) → `postMediaRefIDs` memuat `recA`.
- `TestMediaCollectionAllowsAudio`: panggil `ensureMediaCollection(app, users)` (pakai `tests.BaseTestApp`/setup serupa test existing) → verifikasi field `file` terima MIME audio & MaxSize 20MB.

- [ ] **Step 2: Run tests, verify they fail**

Run: `go test ./...` (dari `backend/`)
Expected: FAIL.

- [ ] **Step 3: Implement perubahan**

`backend/main.go`: di `ensureMediaCollection`, tambah `"audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/webm"` ke `MimeTypes` dan `MaxSize: 20 * 1024 * 1024`.
`backend/media.go`: di `postMediaRefIDs`, tambah `collectMediaRefsFromText(r.GetString("audioUrl"), out)`.

- [ ] **Step 4: Run tests, verify they pass**

Run: `go test ./...`
Expected: PASS.

- [ ] **Step 5: Catatan handover (di commit message)**

`ensureMediaCollection` hanya berlaku saat collection `media` belum ada — deployment dengan collection lama harus update schema via admin PocketBase (tambah MIME & ukuran pada field `file`).

- [ ] **Step 6: Commit**

```bash
git add backend/main.go backend/media.go backend/media_test.go
git commit -m "feat(backend): accept audio media and track audioUrl refs"
```

### Task 9: Sanitize `data:` untuk field media

**Files:**
- Modify: `frontend/src/lib/sanitize.ts` (`sanitizeUrl`)
- Test: `frontend/src/lib/sanitize.test.ts` (atau file test yang ada)

**Interfaces:**
- Consumes: —
- Produces: `sanitizeUrl(value: string, opts?: { allowData?: boolean }): string` — saat `allowData` true, izinkan `data:` URL (mis. `data:audio/mpeg;base64,...`) dengan guard panjang ≤ 20MB encoded (± 27.972.000 char); tetap tolak `javascript:` dll.

- [ ] **Step 1: Write failing test**

- `sanitizeUrl('data:audio/mpeg;base64,AAAA...', { allowData: true })` → tetap sama.
- `sanitizeUrl('data:audio/mpeg;base64,AAAA...')` (tanpa opsi) → `''` (perilaku lama).
- `sanitizeUrl('javascript:alert(1)', { allowData: true })` → `''`.
- `sanitizeUrl('data:' ' 'x'.repeat(30_000_000), { allowData: true })` → `''` (guard ukuran).

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- frontend/src/lib/sanitize.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Update `sanitizeUrl` signature & logika (data URL diperbolehkan hanya bila `opts.allowData` dan tidak melebihi guard).

- [ ] **Step 4: Update `frontend/src/lib/validation.ts`**

`cover`, `videoUrl`, `audioUrl` schema → `sanitizeUrl(val, { allowData: true })`.

- [ ] **Step 5: Run tests, verify they pass**

Run: `npm test -- frontend/src/lib/sanitize.test.ts frontend/src/lib/validation.test.ts` (jika ada)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/sanitize.ts frontend/src/lib/sanitize.test.ts frontend/src/lib/validation.ts
git commit -m "fix(audio): allow data URLs for media fields"
```

### Task 10: Verifikasi penuh + dokumentasi

**Files:**
- Create: `docs/features/14-audio-player-and-upload.md` (mengikuti `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`)
- Modify: `docs/README.md` (indeks), `CHANGELOG.md` (entri baru)

- [ ] **Step 1: Jalankan seluruh gate**

Run (dari `frontend/`): `npm run typecheck && npm run lint && npm test`
Run (dari `backend/`): `go test ./...`
Expected: semua hijau.

- [ ] **Step 2: Tulis dokumen fitur**

`docs/features/14-audio-player-and-upload.md`: ringkasan & motivasi, arsitektur (engine→store→komponen→halaman), kontrak data (AudioTrack, store state, media-limits), otorisasi/keamanan (sanitize `data:` + guard; tidak ada `eval`), panduan penggunaan (post audio, upload di editor, player global), pengujian (unit + manual checklist).

- [ ] **Step 3: Update `docs/README.md` + `CHANGELOG.md`**

Indeks tambah dokumen baru. Entri CHANGELOG format team-work (Author/Role/What/Why/How it was verified/Handover notes) mencakup keputusan handover: migration schema media PocketBase untuk instalasi lama.

- [ ] **Step 4: Commit final**

```bash
git add docs/features/14-audio-player-and-upload.md docs/README.md CHANGELOG.md
git commit -m "docs: audio player feature documentation and changelog"
```
