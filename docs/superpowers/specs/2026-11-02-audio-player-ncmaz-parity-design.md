# Design: Audio Player 1:1 Ncmaz Parity (Header + Global Dock)

Tanggal: 2026-11-02
Status: Approved — dieksekusi 2026-11-03
Project: ncmaz-clone (Vue 3 + TypeScript + Pinia + Vue Router + Tailwind v4, SPA)
Target halaman: post dengan `postType === 'audio'` (contoh deployment: `/post/snap-cracle`)

## 1. Intent & Mengapa

Referensi visual/fungsi: `https://ncmaz-faust-delta.vercel.app/360-degree-video/`
(pada dasarnya adalah post audio/podcast, bukan video).

Saat ini project sudah punya:
- Header audio dengan cover bulat berputar + tombol play.
- Player global berupa **mini-card 352×94 px di kiri bawah**.

Yang diminta: membuat **header audio + player global 1:1 seperti Ncmaz**, bukan mini-card.
Referensi memiliki dua lapis player:
1. **Header post**: kartu besar dengan vinyl/album art berputar, tombol play di tengah,
   kategori, judul, divider, meta author, dan aksi post di dalam kartu.
2. **Global dock**: bar full-width di bawah, progress hairline, kontrol skip 10/15 detik,
   speed, volume, waktu, close, like/save, dan mode expand di mobile.

Perubahan ini menyentuh UI, state player, dan perilaku tombol BackToTop (agar tidak
menutupi dock). Tidak ada perubahan pada post non-audio.

## 2. Goals / Non-goals / Anti-goals

### Goals
- **G1 — Header 1:1**: kartu audio mengikuti layout Ncmaz — background band, kartu
  `rounded-[40px]`, vinyl 20 detik, overlay gelap, tombol play 80 px, kategori, judul
  24→44 px semibold, divider, meta author/date/read time, dan aksi post di dalam kartu.
  Excerpt tidak ditampilkan di header audio.
- **G2 — Global dock 1:1**: bar full-width (`fixed bottom-0`), tinggi 80 px desktop,
  64 px mobile, dan 128 px saat expand. Progress hairline 2 px di atas bar. Kontrol:
  skip -10s, play/pause, skip +15s, speed 1.0/1.5/2.0, volume + mute, waktu, close.
  Like/save mengikuti referensi (desktop `xl`, mobile expanded = save).
- **G3 — Fungsi 1:1**: seek, volume default 80%, mute, playback rate, skip, buffered
  progress, close (stop + hilangkan), track tetap berjalan lintas rute SPA, dan state
  tombol header sinkron dengan dock.
- **G4 — BackToTop aman**: tombol back-to-top tidak boleh menutupi dock, baik saat
  collapsed maupun expanded, di desktop maupun mobile. Toast juga tidak menutupi
  kontrol utama dock.
- **G5 — Responsif, dark mode, aksesibel**: light/dark, `aria-*`, fokus terlihat,
  `prefers-reduced-motion`, target sentuh minimal 40 px.
- **G6 — Verifikasi & dokumentasi**: unit test engine/store, e2e layout + BackToTop,
  typecheck, lint, update feature doc + CHANGELOG.

### Non-goals
- Playlist/queue, shuffle, repeat, auto-next, atau pemilihan track berikutnya.
- Persistensi posisi putar/volume/speed lintas sesi atau lintas device.
- Autoplay saat navigasi.
- Media Session API, transkrip, equalizer audio nyata, atau visualizer audio.
- Mengubah layout post non-audio.
- Mengganti engine audio atau menambah dependency runtime baru.
- Menyalin cacat a11y referensi (lihat §8).

### Anti-goals
- BackToTop/Toast menutupi tombol play, volume, waktu, atau close.
- Dua `<audio>` berbunyi bersamaan.
- Dock hilang/restart saat pindah halaman SPA.
- Munculnya dock menggeser layout halaman (layout shift) — referensi memakai overlay.
- Header audio menampilkan excerpt/aksi ganda atau merusak header post non-audio.
- Warna/typography hanya cocok di salah satu tema.

## 3. Constraints

- Stack: Vue 3 `<script setup lang="ts">`, Pinia, Vue Router, Tailwind v4, lucide-vue-next,
  `@vueuse/core` (sudah ada). Tidak menambah package baru.
- `getDataSource()` tetap satu-satunya jalur data; tidak ada perubahan backend/PocketBase.
- Engine audio singleton (`frontend/src/lib/audio-engine.ts`) dipertahankan.
- Dark mode wajib (`dark:`), fokus keyboard terlihat, dan `aria-label` pada kontrol.
- Header/dock hanya untuk `isAudioPost` (`postType === 'audio' && audioUrl`).
- Referensi pengukuran: viewport 1440×1000 dan 390×844.
- Repo memakai `page-shell` (padding 16/24/32 px) dan `max-w-7xl`; kartu header
  dibatasi `max-w-[78rem]` (1248 px) agar mendekati lebar referensi.
- Aturan repo: DoD = `vue-tsc --noEmit`, `eslint .`, `vitest run`, Playwright e2e,
  update `docs/features/…`, `docs/README.md` bila perlu, dan entri `CHANGELOG.md`.

## 4. Approaches

### A. In-place upgrade
Ubah `AudioPlayer.vue` langsung menjadi dock dan edit blok audio di `PostPage.vue`.
- Trade-off: file paling sedikit, cepat; tetapi `PostPage.vue` ~630 baris dan
  `AudioPlayer.vue` akan menampung progress, controls, volume, mobile expand, dan
  observer tinggi dock sekaligus. Sulit diuji/dirawat.

### B. Componentized (DIPILIH)
Pisahkan header dan dock menjadi komponen kecil dengan tanggung jawab jelas.
- `PostPage.vue` hanya merakit `AudioPostHeader` + konten.
- `AudioPlayer.vue` menjadi orchestrator dock; subkomponen menangani progress,
  track info, controls, volume, skip, equalizer.
- Engine/store diperluas untuk volume, mute, rate, skip, buffered.
- Trade-off: lebih banyak file dan satu putaran refactor; tetapi batasnya jelas,
  mudah diuji, dan header post non-audio tidak tersentuh.

### C. CSS-only reskin
Hanya mengubah tampilan mini-card menjadi bar.
- Ditolak: tidak memenuhi fungsi 1:1 (volume, speed, skip, mobile expand, like/save,
  buffered progress, BackToTop offset).

## 5. Arsitektur & File

```
App.vue
  └─ AudioPlayer.vue                         (orchestrator global dock, tetap di App)
       ├─ PlayerProgressBar.vue              (progress + buffered + seek)
       ├─ PlayerTrackInfo.vue                (cover spin + title + category + link)
       ├─ PlayerControls.vue                 (skip -10 / play-pause / skip +15 / speed)
       ├─ PlayerVolume.vue                   (mute + slider, desktop)
       ├─ SkipButton.vue                     (ikon skip + angka 10/15)
       └─ PlayingEqualizer.vue               (ikon equalizer CSS untuk header)

PostPage.vue
  ├─ AudioPostHeader.vue                     (kartu header audio + aksi post)
  └─ konten/tags/komentar/related (tidak berubah)

BackToTop.vue                                (offset mengikuti tinggi dock)
ToastHost.vue                                (offset opsional agar tidak menutupi dock)
```

File baru:
- `frontend/src/components/post/AudioPostHeader.vue`
- `frontend/src/components/player/PlayerProgressBar.vue`
- `frontend/src/components/player/PlayerTrackInfo.vue`
- `frontend/src/components/player/PlayerControls.vue`
- `frontend/src/components/player/PlayerVolume.vue`
- `frontend/src/components/player/SkipButton.vue`
- `frontend/src/components/player/PlayingEqualizer.vue`
- `frontend/e2e/audio-player.spec.ts`
- `docs/superpowers/specs/2026-11-02-audio-player-ncmaz-parity-design.md` (dokumen ini)

File yang diubah:
- `frontend/src/App.vue` — tidak perlu ganti import; `AudioPlayer` tetap global.
- `frontend/src/components/player/AudioPlayer.vue` — ditulis ulang menjadi dock.
- `frontend/src/components/layout/BackToTop.vue` — offset CSS variable.
- `frontend/src/components/layout/ToastHost.vue` — offset CSS variable (opsional, lihat §7.4).
- `frontend/src/pages/PostPage.vue` — pakai `AudioPostHeader`; sembunyikan baris aksi
  terpisah untuk audio; breadcrumb tetap.
- `frontend/src/lib/audio-engine.ts` — volume, mute, rate, skip, buffered.
- `frontend/src/lib/format.ts` — `formatDuration` (dipakai dock; pindah dari local function).
- `frontend/src/stores/player.ts` — state/action baru + mapping track.
- `frontend/src/components/post/LikeButton.vue` — varian `compact`.
- `frontend/src/components/post/SaveButton.vue` — tidak berubah (pakai `variant="icon"`).
- `frontend/src/api/types.ts` — tidak berubah; `AudioTrack` diperluas di engine.
- `docs/features/22-audio-player-and-upload.md`, `docs/README.md`, `CHANGELOG.md`.

## 6. Kontrak Data & State

### 6.1 `AudioTrack` (`lib/audio-engine.ts`)
```ts
export interface AudioTrack {
  postId: string
  slug: string          // untuk link dock → halaman post
  title: string
  audioUrl: string
  coverUrl: string
  authorName: string
  categoryName: string  // kategori pertama; fallback authorName
  likeCount: number     // snapshot untuk LikeButton compact di dock
}
```

### 6.2 `AudioEngineState`
```ts
export interface AudioEngineState {
  track: AudioTrack | null
  playing: boolean
  currentTime: number
  duration: number
  buffered: number        // detik; dari event 'progress'
  volume: number          // 0..1, default 0.8
  muted: boolean
  playbackRate: number    // 1 | 1.5 | 2
  error: string | null
}
```

### 6.3 `AudioEngine` API tambahan
```ts
setVolume(volume: number): void       // clamp 0..1; jika >0, muted=false
setMuted(muted: boolean): void
setPlaybackRate(rate: number): void
skip(seconds: number): void           // seek(currentTime + seconds), clamp 0..duration
```
Perilaku:
- `load(track)`: reset `currentTime`, `duration`, `buffered`, `error`; pertahankan
  `volume`, `muted`, `playbackRate` antar track.
- `stop()`: reset track/time/duration/buffered/error; pertahankan preferensi volume/rate.
- `ensureAudio()`: set `el.volume = 0.8` saat pertama kali; `preload='auto'`.
- Event `progress`: `state.buffered = el.buffered.length ? el.buffered.end(el.buffered.length - 1) : 0`.
- `setVolume(v)`: clamp 0..1; jika `v > 0`, simpan `lastVolume = v` dan `muted = false`;
  jika `v === 0`, `muted = true` (lastVolume tetap).
- `setMuted(true)`: simpan volume saat ini bila > 0, lalu `el.muted = true`.
- `setMuted(false)` / `toggleMute`: jika volume 0, pulihkan `lastVolume` (default 0.8),
  lalu `el.muted = false`.
- `skip` tidak mengubah state `playing`.

### 6.4 Store `player`
Refs baru: `buffered`, `volume`, `muted`, `playbackRate`.
Actions baru:
```ts
setVolume(volume: number): void
toggleMute(): void
cycleRate(): void        // 1 → 1.5 → 2 → 1
skip(seconds: number): void
```
`play(post)` memetakan:
```ts
{
  postId: post.id,
  slug: post.slug,
  title: post.title,
  audioUrl: post.audioUrl,
  coverUrl: post.cover,
  authorName: post.author.name,
  categoryName: post.categories[0]?.name ?? post.author.name,
  likeCount: post.likeCount,
}
```

### 6.5 `LikeButton` varian compact
- Ubah tipe prop menjadi `Pick<Post, 'id' | 'likeCount'>` (semua caller `Post` tetap valid).
- Tambah `variant?: 'pill' | 'icon' | 'compact'`.
- `compact`: `h-9 gap-1.5 px-1.5 text-xs font-semibold`, tanpa border/background;
  heart 18 px + count; hover rose; `aria-pressed` dan label seperti sekarang.
- Dock memakai `:post="{ id: track.postId, likeCount: track.likeCount }"` + `variant="compact"`.

## 7. Detail Visual & Perilaku

### 7.1 Header audio (`AudioPostHeader.vue`)

Struktur:
```
<section class="relative isolate">
  <div class="absolute -inset-x-4 sm:-inset-x-6 lg:-inset-x-8 top-0 -z-10 h-60
              bg-primary-50 dark:bg-neutral-800" />
  <div class="relative mx-auto max-w-[78rem] pt-8 lg:pt-16">
    <div class="flex flex-col gap-8 rounded-2xl bg-white px-4 py-7 shadow-2xl
                md:flex-row md:items-center md:rounded-[40px] sm:px-5 lg:gap-10 lg:p-11
                dark:bg-neutral-900">
      <!-- art -->
      <div class="w-1/2 shrink-0 sm:w-1/3 md:w-1/4 lg:w-1/5">
        <div class="relative aspect-square overflow-hidden rounded-full shadow-2xl">
          <img class="nc-animation-spin h-full w-full object-cover" :class="{ playing }" />
          <div class="absolute inset-0 rounded-full bg-neutral-900/75 bg-blend-multiply" />
          <button class="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center
                         rounded-full border-2 border-neutral-300 bg-black/50 text-white
                         transition hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white"
                  :aria-label="playing ? 'Pause audio' : 'Play audio'">
            <PlayingEqualizer v-if="playing" class="h-7 w-7" />
            <Play v-else class="h-11 w-11 fill-current" />
          </button>
        </div>
      </div>

      <!-- info -->
      <div class="flex min-w-0 flex-1 flex-col">
        <CategoryBadgeList :categories="post.categories" :limit="2" />
        <h1 class="mt-4 max-w-4xl text-2xl font-semibold leading-[1.15]
                   text-neutral-900 sm:text-3xl lg:text-4xl xl:text-[2.75rem]
                   dark:text-neutral-100">{{ post.title }}</h1>
        <div class="mt-4 border-b border-neutral-200 dark:border-neutral-700" />
        <div class="mt-4 flex flex-wrap justify-between gap-5 sm:items-end">
          <PostMeta ... /> <!-- avatar 44, name, date · read time; inline di komponen -->
          <PostActionsCompact ... /> <!-- like/comment/views | save/share/edit; inline di komponen -->
        </div>
      </div>
    </div>
  </div>
</section>
```

Detail:
- `nc-animation-spin`: 20s linear infinite, `animation-play-state: paused` default;
  `.playing` = running. Saat pause, sudut rotasi terakhir dipertahankan.
- `PlayingEqualizer`: 3–4 bar putih; animasi hanya saat playing; mati saat
  `prefers-reduced-motion`.
- Tombol play: 80×80, border 2 px `neutral-300`, background `black/50`; ikon play 44 px.
- Overlay selalu ada (baik paused/playing) agar cover terlihat redup seperti referensi.
- Tanpa excerpt di header audio.
- Aksi post (kanan bawah):
  - Like compact (heart + count).
  - Comment (MessageCircle + count) → `scrollToComments`.
  - Views (Eye + count), non-interaktif.
  - Divider vertikal.
  - Save (ikon bookmark 36–40 px).
  - Share (ikon share) → modal share yang sudah ada.
  - Edit (ikon PenLine) hanya jika `canManagePost(...)`; menggantikan menu “more”
    referensi (keputusan: hide if not authorized).
- Baris aksi lama di `PostPage.vue` (Like/Save/Comment/Share + Edit) diberi
  `v-if="!isAudioPost"` agar tidak duplikat. Untuk post non-audio tidak berubah.
- Kartu **“Written by”** bawah (`PostPage.vue` `v-if="!isMagazineStyle"`) juga
  disembunyikan untuk audio (`&& !isAudioPost`) karena header sudah memuat author
  dan aksi; ini mencegah Like/Save muncul dua kali di halaman.
- Breadcrumb tetap dipertahankan (konvensi project) — diletakkan di atas section
  header, sehingga tidak bertabrakan dengan band.
- Background band: 240 px; light `primary-50`, dark `neutral-800`; full-bleed via
  `-inset-x-*` (sesuai padding page-shell). Pastikan tidak menimbulkan scroll horizontal.

### 7.2 Global dock (`AudioPlayer.vue` + subkomponen)

Root:
```
<div v-if="player.track" class="fixed inset-x-0 bottom-0 z-30 flex"
     role="region" aria-label="Audio player" ref="dockEl">
  <div class="relative z-0 flex w-full flex-col bg-white px-2 sm:px-3
              shadow-[0_6px_10px_rgba(0,0,0,.14),0_1px_18px_rgba(0,0,0,.12),0_3px_5px_-1px_rgba(0,0,0,.2)]
              dark:bg-neutral-800">
    <!-- mobile chevron -->
    <button class="absolute -top-3 right-0 z-20 flex h-6 w-[26px] items-center justify-center
                   rounded-full bg-white shadow ... lg:hidden"
            :aria-label="expanded ? 'Collapse player' : 'Expand player'">
      <ChevronUp class="h-4 w-4 transition" :class="expanded ? 'rotate-180' : ''" />
    </button>

    <PlayerProgressBar :current-time="player.currentTime" :duration="player.duration"
                       :buffered="player.buffered" @seek="player.seek" />

    <div class="flex h-16 w-full justify-between sm:h-20">
      <PlayerTrackInfo :track="player.track" :playing="player.playing" />
      <div class="hidden grow items-center justify-center px-5 lg:flex">
        <PlayerControls layout="desktop" :playing="player.playing" :rate="player.playbackRate"
                        @toggle="player.toggle" @skip="player.skip" @cycle-rate="player.cycleRate" />
      </div>
      <div class="ms-2 flex shrink-0 items-center justify-end lg:grow lg:basis-52">
        <PlayerVolume class="hidden lg:flex" :volume="player.volume" :muted="player.muted"
                      @update:volume="player.setVolume" @toggle-mute="player.toggleMute" />
        <div class="me-3 ms-5 hidden ... text-xs tracking-widest lg:flex">
          <span class="min-w-[40px] text-end tabular-nums">{{ currentLabel }}</span>/
          <span class="min-w-[40px] tabular-nums">{{ durationLabel }}</span>
        </div>
        <button v-if="!expanded" class="... lg:hidden" :aria-label="player.playing ? 'Pause' : 'Play'"
                @click="player.toggle">...</button>
        <button class="..." aria-label="Close player" @click="player.close"><X /></button>
      </div>
    </div>

    <div v-if="expanded" class="flex h-16 justify-center border-t border-neutral-300
                                transition-all lg:hidden dark:border-neutral-700">
      <div class="flex max-w-xs grow items-center justify-evenly ...">
        <div class="flex w-12 justify-center">
          <SaveButton :post-id="track.postId" :post-title="track.title" variant="icon" />
        </div>
        <PlayerControls layout="mobile" ... />
      </div>
    </div>

    <p v-if="player.error" class="..." role="alert">{{ player.error }}</p>
  </div>
</div>
```

Spesifikasi ukuran (hasil pengukuran referensi):
- Progress bar **absolute** di `bottom-full` (overlay, bukan bagian dari flow),
  sehingga tinggi total dock = tinggi baris utama + baris expanded.
- Tinggi baris utama: 64 px (<640 px) dan 80 px (≥640 px). Baris expanded: 64 px.
  Maka total: 64 px collapsed / 128 px expanded di mobile 390; 80 px collapsed /
  144 px expanded di 640–1023. Di ≥1024 px tombol expand disembunyikan (selalu 80 px).
- `--player-dock-height` diukur dari root dock (tanpa progress overlay).
- Progress: 2 px, `bg-primary-500`; buffered `bg-primary-500/30`; thumb 12 px;
  input range transparan full-width; area klik di atas bar.
- Track info (`PlayerTrackInfo`): root `mr-2 flex grow items-center overflow-hidden
  lg:shrink-0 lg:basis-52`; link berisi cover 40 px mobile / 48 px desktop, bulat,
  shadow-sm, berputar 20s; title 14 px mobile / 16 px desktop, `font-medium`,
  `line-clamp-1`; kategori 12 px `text-neutral-500 dark:text-neutral-400`; seluruh
  area link ke `/post/:slug`. Di kanan link, `hidden xl:flex` berisi like compact +
  save ikon (mengikuti referensi; muncul ≥1280 px).
- Desktop center: spacer 48 px, skip -10 (48 px), play 56 px mobile/64 px desktop
  (`bg-neutral-100/70 dark:bg-neutral-700/40`, ikon 40 px), skip +15 (48 px),
  speed pill 36×24 px (`text-[11px] font-semibold ring-1 ring-inset ring-neutral-500`).
- Desktop right: volume icon + slider 96 px (track 2 px, thumb 10 px), waktu 12 px
  `tracking-widest`, close 40/48 px.
- Speed cycle: 1.0x → 1.5x → 2.0x → 1.0x (tanpa 0.75/1.25).
- Volume default 80%; mute mengingat volume terakhir.
- Mobile collapsed: cover + title/category + play/pause + close; chevron di atas kanan.
- Mobile expanded: tambah baris 64 px berisi Save, skip -10, play/pause 56 px,
  skip +15, speed. Tombol play/pause di baris atas **disembunyikan saat expanded**
  agar tidak duplikat dengan baris kedua (perbaikan sengaja dari referensi).
- `PlayerProgressBar` juga menampilkan buffered; saat durasi 0, thumb disembunyikan
  dan progress 0%.
- Error engine: tampilkan baris error kecil/`toast` (tidak ada di referensi, tapi
  jangan swallow error); tidak mengubah tinggi normal saat tidak error.

### 7.3 Sinkronisasi header ↔ dock
- `isPlayingThis` = track.postId === post.id && player.playing.
- Klik header: jika post ini sedang playing → `player.toggle()`; jika bukan →
  `player.play(post)`.
- Cover header berputar hanya saat `isPlayingThis`; pause mempertahankan sudut.
- Like/save di header dan dock memakai store reaksi/bookmark yang sama, sehingga
  status dan count konsisten.
- Ganti track dari post lain: header lama otomatis menampilkan play lagi; dock
  menampilkan track baru; posisi/volume/rate mengikuti aturan engine.

### 7.4 BackToTop & Toast (perhatian khusus)
Masalah: `BackToTop` sekarang `fixed bottom-6 end-6 z-40`; dock berada di bawah
layar dengan tinggi 64–128 px dan z-30. Tanpa penanganan, BackToTop menutupi
kontrol kanan dock (volume/waktu/close).

Solusi yang dipilih:
- Dock mengukur tinggi aktualnya dengan `ResizeObserver` (root `dockEl`), lalu
  menulis CSS variable ke `<html>`:
  ```ts
  document.documentElement.style.setProperty('--player-dock-height', `${height}px`)
  ```
  Reset ke `0px` saat dock unmount/track null.
- `BackToTop` memakai inline style:
  ```html
  :style="{ bottom: 'calc(var(--player-dock-height, 0px) + 1.5rem)' }"
  ```
  Saat tidak ada player → `0 + 24px` = perilaku lama. Saat collapsed/expanded,
  tombol selalu 24 px di atas tinggi aktual dock (termasuk safe-area bila ditambahkan).
- `ToastHost` memakai offset yang sama (`calc(var(--player-dock-height, 0px) + 1rem)`)
  agar notifikasi tidak menutupi kontrol dock. Toast tetap z-60; jika muncul bersamaan
  dengan BackToTop, toast boleh menutupi BackToTop sementara (toast transien), tetapi
  tidak boleh menutupi kontrol dock.
- Uji e2e wajib: `backToTop.bottom <= dock.top - 8` pada desktop, mobile collapsed,
  dan mobile expanded.
- Jangan memakai asumsi tinggi tetap (`bottom-24`) karena expanded mobile 128 px;
  jangan menyembunyikan BackToTop secara permanen.
- `ResizeObserver` harus dibersihkan di `onBeforeUnmount`; reset CSS var juga saat
  `player.track` menjadi null.

### 7.5 Z-index & stacking
- Dock: `z-30`.
- BackToTop: `z-40` (di atas dock, tetapi tidak overlap karena offset).
- Share modal: `z-50`.
- Toast: `z-60`.
- Sticky header: `z-30`; dock berada di bawah viewport sehingga tidak bertabrakan.
- Jangan menaikkan dock ke z-50 karena akan menutupi modal share.

### 7.6 Animasi & reduced motion
- Spin vinyl: 20s linear infinite, `animation-play-state: paused|running`.
- Equalizer header: bar `scaleY` 0.4→1 dengan delay bertingkat; hanya saat playing.
- `@media (prefers-reduced-motion: reduce)`: spin/equalizer/transisi dock dimatikan
  atau dikurangi; tetap ada indikasi state (ikon pause/play).
- Transisi expand dock: height/opacity singkat; tidak wajib untuk 1:1, tetapi tidak
  boleh menggeser konten halaman.

## 8. Aksesibilitas (jangan menyalin cacat referensi)

Referensi memiliki:
- Wrapper header `aria-hidden="true"` dan kontrol berupa `div` (tidak fokusable).
- Tombol play/pause ganda di mobile expanded.
- Range progress transparan tanpa label/focus yang jelas.
- Beberapa tombol tanpa `aria-label`.
- Animasi tanpa `prefers-reduced-motion`.

Yang akan kita buat:
- Semua kontrol `<button type="button">` dengan `aria-label`/`aria-pressed`.
- Header play button fokusable, label “Play audio”/“Pause audio”.
- Progress: `aria-label="Seek audio"`, `aria-valuetext="0:42 dari 2:16"`.
- Volume: `aria-label="Volume"`, `aria-valuetext="80%"`; mute `aria-pressed`.
- Speed: label dinamis “Playback speed: 1.5x”.
- Skip: “Rewind 10 seconds”, “Forward 15 seconds”.
- Close: “Close player”.
- Fokus terlihat (`focus-visible:ring-*`) di semua kontrol.
- Target sentuh minimal 40×40 px (skip 48 px).
- `role="region"` + `aria-label="Audio player"` pada dock.
- Error `role="alert"`.
- `prefers-reduced-motion` dihormati.
- Jangan pakai `aria-hidden` pada elemen interaktif.

## 9. Testing & Verifikasi

### Unit (vitest)
`frontend/src/lib/audio-engine.test.ts`:
- Default volume 0.8; `setVolume` clamp 0..1; `setVolume(0)` set `muted=true`;
  volume >0 → `muted=false` (sesuai §6.3).
- `setMuted` benar-benar menyetel `el.muted`; unmute mengembalikan lastVolume.
- `setPlaybackRate` menyetel `el.playbackRate` dan state.
- `skip(+15)`/`skip(-10)` clamp 0..duration; tidak mengubah playing.
- Event `progress` mengisi `buffered`.
- `load` mereset time/duration/buffered tetapi mempertahankan volume/rate.
- `stop` mereset track/time/duration/buffered/error dan mempertahankan preferensi.

`frontend/src/stores/player.test.ts`:
- State awal volume/muted/rate/buffered.
- `play(post)` memetakan slug, categoryName, likeCount.
- `setVolume`, `toggleMute`, `cycleRate` (1→1.5→2→1), `skip` memanggil engine.
- Subscribe engine memperbarui semua ref.

`frontend/src/lib/format.test.ts`:
- `formatDuration(0)`, `<60`, `>=60`, `NaN`/negatif, durasi panjang.

### E2E (Playwright)
`frontend/e2e/audio-player.spec.ts`:
1. Buka post audio mock (`/post/the-producers-reshaping-ambient-music`), klik
   `Play audio`, pastikan dock `role=region` “Audio player” terlihat.
2. Klik speed → teks `1.5x`, klik lagi → `2.0x`, klik lagi → `1.0x`.
3. Klik mute → `aria-pressed=true`; klik volume slider (jika stabil).
4. Klik close → dock hilang; header kembali menampilkan play.
5. Scroll ke bawah, pastikan BackToTop terlihat; ukur `backToTop.bottom` dan
   `dock.top`; assert tidak overlap.
6. Mobile 390×844: buka, klik “Expand player”, pastikan tinggi dock 128 px
   (baris utama 64 + baris expanded 64; progress overlay tidak dihitung);
   ulangi cek BackToTop; klik “Collapse player”, cek tinggi 64 px. Di 768 px,
   expanded = 144 px (80 + 64) — opsional di e2e.
7. Tema light/dark: cek dock masih terlihat dan kontrol tidak hilang.
8. Screenshot manual untuk perbandingan visual (desktop/mobile, light/dark).

Catatan: playback audio nyata di headless bisa bergantung jaringan; test fokus pada
kehadiran dock, state kontrol, dan geometri BackToTop. Unit test menutup logika audio.

### Manual
- Bandingkan side-by-side dengan referensi Ncmaz di 1440 dan 390.
- Cek header: vinyl, overlay, judul, divider, meta, aksi, tanpa excerpt.
- Cek dock: progress, skip, speed, volume, mute, time, close, like/save.
- Cek BackToTop saat scroll, collapsed/expanded, desktop/mobile.
- Cek pindah rute (SPA): audio tetap berjalan, dock tidak remount/restart.
- Cek post non-audio tidak berubah.
- Cek dark/light, keyboard Tab/Enter/Space, dan reduced motion.

### Commands
```
cd frontend
npm run typecheck
npm run lint
npm test
npm run e2e
```

## 10. Dokumentasi & Handover

- Update `docs/features/22-audio-player-and-upload.md`:
  - Ganti bagian player global mini-card → dock Ncmaz.
  - Tambah header audio 1:1, kontrol volume/speed/skip/buffered, mobile expand.
  - Tambah BackToTop/Toast offset + pengujiannya.
  - Catat deviasi sadar dari referensi (§11).
- Update `docs/README.md` bila daftar/indeks fitur berubah.
- Tambah entri `CHANGELOG.md` format team-work:
  - Author/Role/Status, What changed, Why, How verified (output nyata), Handover.
- Status `Done` hanya setelah typecheck/lint/test/e2e benar-benar lulus.

## 11. Keputusan yang Diambil (bukan dari user)

1. **Componentized** (opsi B) — dipilih user.
2. **Equalizer CSS**, bukan GIF `icon-playing.gif` — lebih ringan, tema-aware,
   reduced-motion; visual dibuat mirip.
3. **Kategori tetap memakai palet project** (primary), bukan peta warna per kategori
   Ncmaz; ukuran/bentuk badge disamakan. Alasan: konsistensi seluruh situs.
4. **Menu “more” referensi tidak ditiru**; tombol Edit ikon hanya untuk yang berhak,
   Share tetap tersedia. Alasan: tidak ada fitur report/menu lain di project.
5. **Mobile play/pause tidak diduplikasi** saat expanded; kontrol pindah ke baris
   kedua, baris atas hanya close. Alasan: menghindari dua tombol dengan fungsi sama.
6. **Volume default 0.8**, persistensi hanya dalam sesi (bukan localStorage).
7. **Skip -10/+15** mengikuti referensi (asimetris).
8. **Header max-w 78rem** (1248 px) mengikuti pengukuran referensi di 1440.
9. **Breadcrumb dipertahankan** (konvensi project), diletakkan di atas band.
10. **Toast ikut di-offset** dengan CSS var yang sama; toast transien boleh menutupi
    BackToTop, tetapi tidak boleh menutupi kontrol dock.
11. **Tidak ada layout shift** saat dock muncul; konten tetap overlay seperti referensi.
12. **Dock tetap global di App.vue**, termasuk saat berada di area admin (konsisten
    dengan player saat ini); tidak ada perubahan RBAC.

## 12. Yang Diserahkan ke Builder

- Path ikon skip: boleh memakai SVG kustom (lingkaran panah + angka) atau komposisi
  lucide `RotateCcw/RotateCw` + angka; yang penting bentuk, ukuran, dan posisi angka
  mendekati referensi.
- Detail transisi expand/collapse (durasi/easing) — bebas, asalkan tidak menggeser
  konten dan menghormati reduced motion.
- Apakah `ToastHost` ikut diubah sekarang atau ditunda; rekomendasi: ikut, karena
  satu CSS var yang sama.
- Apakah perlu menambahkan `aria-valuetext` pada slider volume (disarankan ya).
- Penyesuaian kecil spacing/typography bila hasil screenshot menunjukkan selisih
  yang jelas; tetap dalam ukuran yang tercantum.
- Jika `ResizeObserver` tidak tersedia di environment test, sediakan fallback
  (`--player-dock-height: 0px`) dan mock di test.

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| BackToTop masih menutupi dock | CSS var tinggi aktual + e2e geometri di 3 state |
| Dock menutupi konten/footer | Overlay sesuai referensi; close tersedia; tidak menambah layout shift |
| Audio dobel | Engine singleton dipertahankan; `play` hanya satu elemen |
| Header non-audio rusak | `AudioPostHeader` hanya dirender untuk `isAudioPost`; baris aksi lama `v-if="!isAudioPost"` |
| Dark mode kontras rendah | Uji light/dark; pakai token `dark:` yang ada |
| Mobile overflow header | Aksi compact + `flex-wrap`; uji 390 px |
| Playback headless tidak jalan | Test UI/geometri; logika audio di unit test |
| ResizeObserver leak | Disconnect + reset CSS var saat unmount |
| Band full-bleed menyebabkan scroll horizontal | `isolate` + offset padding; uji `scrollWidth === clientWidth` |

## 14. Definition of Done

- [ ] `AudioPostHeader.vue` + dock/subkomponen terimplementasi.
- [ ] Engine/store mendukung volume, mute, rate, skip, buffered, kategori.
- [ ] Header audio 1:1 (band, kartu, vinyl, overlay, judul, divider, meta, aksi, tanpa excerpt).
- [ ] Dock 1:1 (progress, skip, speed, volume, time, close, like/save, mobile expand).
- [ ] BackToTop tidak overlap di desktop/mobile collapsed/expanded; Toast tidak menutupi kontrol.
- [ ] Dark/light, keyboard, focus, aria, reduced motion.
- [ ] Unit test + e2e lulus; typecheck + lint bersih.
- [ ] Feature doc + CHANGELOG diperbarui.
- [ ] Screenshot perbandingan desktop/mobile, light/dark terlampir di handover.
