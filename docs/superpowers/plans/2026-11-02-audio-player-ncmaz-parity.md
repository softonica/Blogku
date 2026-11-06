# Audio Player Ncmaz Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ganti mini-card audio dengan header ala Ncmaz + dock global full-width (termasuk volume, speed, skip, mobile expand), tanpa BackToTop menutupi dock, lalu build/deploy/smoke-test/commit.

**Architecture:** Engine singleton diperluas (volume/mute/rate/skip/buffered) → Pinia store → `AudioPlayer.vue` orchestrator + subkomponen dock. Header audio dipisah ke `AudioPostHeader.vue` dan dirender hanya untuk `isAudioPost`. BackToTop/Toast memakai CSS variable tinggi dock dari `ResizeObserver`.

**Tech Stack:** Vue 3 + TS, Pinia, Vue Router, Tailwind v4, lucide-vue-next, @vueuse/core, Vitest, Playwright, Go single-binary, systemd server 64.

**Spec:** `docs/superpowers/specs/2026-11-02-audio-player-ncmaz-parity-design.md`

## Global Constraints

- Tidak menambah dependency runtime baru.
- `getDataSource()` tetap satu-satunya jalur data; tidak ada perubahan backend/PocketBase.
- Hanya `postType === 'audio' && audioUrl` yang memakai header/dock baru.
- Dark mode (`dark:`) + `aria-*` + fokus terlihat + `prefers-reduced-motion`.
- Volume default `0.8`; speed cycle `1 → 1.5 → 2 → 1`; skip `-10 / +15` detik.
- Dock height: 64 px (<640), 80 px (≥640), +64 px saat expanded (<1024).
- Progress bar absolute di `bottom-full`; tidak menambah tinggi dock.
- BackToTop: `bottom = calc(var(--player-dock-height, 0px) + 1.5rem)`.
- Jangan memakai tinggi tetap untuk offset BackToTop.
- Build produksi: `VITE_USE_POCKETBASE=true VITE_PB_URL=`; Linux amd64 static binary.
- Deploy: `scp -P 2232` ke `root@64.235.45.122:/opt/blogku/blogku`, restart `blogku`, smoke test produksi.
- Commit hanya source/docs; jangan commit `backend/blogku`, `backend/dist`, `frontend/dist`.

## Review Focus

- **BackToTop vs dock** → e2e mengukur `backToTop.bottom <= dock.top - 8` pada 1440, 390 collapsed, 390 expanded.
- **Dock height measurement** → e2e memastikan 64/128 px di 390; progress overlay tidak menambah tinggi.
- **Header non-audio** → e2e navigasi ke post standard dan memastikan header lama tetap tampil, tanpa dock.
- **Two audio elements** → unit test `getAudioEngine()` singleton + dua `play()` tidak membuat elemen baru.
- **Track switch** → unit test `play(postA)` lalu `play(postB)` mengganti src dan mereset time, bukan menumpuk audio.
- **Reduced motion** → manual check `prefers-reduced-motion: reduce`; spin/equalizer berhenti.
- **Volume 0 / mute** → unit test `setVolume(0)` → muted true, unmute memulihkan 0.8.
- **Progress dengan duration 0** → unit test/e2e tidak NaN/overflow; thumb disembunyikan.

---

### Task 1: Engine — volume, mute, rate, skip, buffered

**Files:**
- Modify: `frontend/src/lib/audio-engine.ts`
- Test: `frontend/src/lib/audio-engine.test.ts`

**Interfaces:**
- Produces: `AudioEngineState` fields `buffered`, `muted`, `playbackRate`; methods `setVolume(v: number)`, `setMuted(m: boolean)`, `setPlaybackRate(r: number)`, `skip(seconds: number)`.
- Produces: `AudioTrack` fields `slug`, `categoryName`, `likeCount`.
- Consumes: existing singleton/event wiring.

- [x] **Step 1: Write failing tests** for default volume 0.8; `setVolume` clamp; `setVolume(0)` → muted; unmute restores last volume; `setMuted`; `setPlaybackRate`; `skip(+15)`/`skip(-10)` clamp; `progress` event fills buffered; `load` resets time/duration/buffered but preserves volume/rate; `stop` resets track/time/error but preserves volume/rate.
- [x] **Step 2: Run test to verify it fails** — `npm test -- src/lib/audio-engine.test.ts` from `frontend/`; expected fail (fields/methods missing).
- [x] **Step 3: Implement engine changes** — add state fields, `lastVolume`, event `onprogress`, setters, `skip`; set `el.volume = 0.8` in `ensureAudio`; extend `AudioTrack`.
- [x] **Step 4: Run test to verify pass** — same command; expected PASS.
- [x] **Step 5: Commit** — `git add frontend/src/lib/audio-engine.ts frontend/src/lib/audio-engine.test.ts && git commit -m "feat(audio): add volume, rate, skip, buffered to engine"`.

### Task 2: Store + duration formatter

**Files:**
- Modify: `frontend/src/stores/player.ts`
- Modify: `frontend/src/lib/format.ts`
- Test: `frontend/src/stores/player.test.ts`, `frontend/src/lib/format.test.ts`

**Interfaces:**
- Produces: store refs `buffered`, `volume`, `muted`, `playbackRate`; actions `setVolume`, `toggleMute`, `cycleRate`, `skip`.
- Produces: `formatDuration(totalSeconds: number): string` in `lib/format.ts`.
- Consumes: Task 1 engine API.

- [x] **Step 1: Write failing tests** — store initial state; `play(post)` maps `slug`, `categoryName` (first category, fallback author), `likeCount`; `cycleRate` order; `skip` delegates; engine subscription updates refs. `formatDuration(0) → '0:00'`, `65 → '1:05'`, `NaN/negative → '0:00'`.
- [x] **Step 2: Run tests to verify fail** — `npm test -- src/stores/player.test.ts src/lib/format.test.ts`.
- [x] **Step 3: Implement** store refs/actions and `formatDuration`.
- [x] **Step 4: Run tests to verify pass**.
- [x] **Step 5: Commit** — `feat(audio): expose volume, rate, skip, buffered in player store`.

### Task 3: Compact LikeButton

**Files:**
- Modify: `frontend/src/components/post/LikeButton.vue`
- No unit test; verified by e2e in Task 8.

**Interfaces:**
- Produces: `variant?: 'pill' | 'icon' | 'compact'`; prop type `Pick<Post, 'id' | 'likeCount'>`.
- Compact style: `h-9 gap-1.5 px-1.5 text-xs font-semibold`, no border/background.

- [x] **Step 1: Implement compact variant** preserving pill/icon behavior and `aria-pressed`.
- [x] **Step 2: Run existing tests + typecheck** — `npm test -- src/stores/bookmark.test.ts src/stores/player.test.ts` and `npm run typecheck`.
- [x] **Step 3: Commit** — `feat(audio): add compact like button variant`.

### Task 4: AudioPostHeader

**Files:**
- Create: `frontend/src/components/post/AudioPostHeader.vue`
- Modify: `frontend/src/pages/PostPage.vue` (integrate in Task 7)
- Create: `frontend/src/components/player/PlayingEqualizer.vue`

**Interfaces:**
- Props: `post: Post`, `playing: boolean`, `isCurrent: boolean`; emit `toggle`.
- Renders band 240 px, card `max-w-[78rem]`, vinyl 20s, overlay, 80 px play, categories, title, divider, author/date/read time, compact actions (like/comment/views | save/share/edit).
- Uses `LikeButton variant="compact"`, `SaveButton variant="icon"`, `canManagePost`.
- No excerpt.

- [x] **Step 1: Implement `PlayingEqualizer.vue`** (CSS bars, `prefers-reduced-motion`).
- [x] **Step 2: Implement `AudioPostHeader.vue`** with exact classes from spec §7.1; play button `aria-label="Play audio"/"Pause audio"`; edit only if `canManagePost`.
- [x] **Step 3: Typecheck** — `npm run typecheck`.
- [x] **Step 4: Commit** — `feat(audio): add Ncmaz-style audio post header`.

### Task 5: Dock subcomponents

**Files:**
- Create: `frontend/src/components/player/PlayerProgressBar.vue`
- Create: `frontend/src/components/player/PlayerTrackInfo.vue`
- Create: `frontend/src/components/player/PlayerControls.vue`
- Create: `frontend/src/components/player/PlayerVolume.vue`
- Create: `frontend/src/components/player/SkipButton.vue`

**Interfaces:**
- `PlayerProgressBar`: props `currentTime`, `duration`, `buffered`; emit `seek(seconds)`. Absolute `inset-x-0 bottom-full`; 2 px track; 12 px thumb; `aria-label="Seek audio"`.
- `PlayerTrackInfo`: props `track: AudioTrack`, `playing: boolean`; cover 40/48 px spin; link `/post/:slug`; title/category; like compact + save icon `hidden xl:flex`.
- `PlayerControls`: props `layout: 'desktop' | 'mobile'`, `playing`, `rate`; emits `toggle`, `skip(seconds)`, `cycleRate`; skip -10/+15, 56/64 px play, speed 36×24.
- `PlayerVolume`: props `volume`, `muted`; emits `update:volume`, `toggleMute`; icon + 96 px slider.
- `SkipButton`: props `seconds`, `direction: 'back' | 'forward'`; 48 px button + number.

- [x] **Step 1: Implement each component** with aria labels from spec §8.
- [x] **Step 2: Typecheck + lint** — `npm run typecheck && npm run lint`.
- [x] **Step 3: Commit** — `feat(audio): add music player dock components`.

### Task 6: Dock integration + BackToTop/Toast offset

**Files:**
- Modify: `frontend/src/components/player/AudioPlayer.vue`
- Modify: `frontend/src/components/layout/BackToTop.vue`
- Modify: `frontend/src/components/layout/ToastHost.vue`

**Interfaces:**
- `AudioPlayer` root `role="region" aria-label="Audio player"`, `ref="dockEl"`, `v-if="player.track"`.
- Mobile expand state local; chevron `aria-label="Expand player"/"Collapse player"`; top-row play/pause hidden when expanded; second row save/skip/play/speed.
- `ResizeObserver` sets `--player-dock-height` on `document.documentElement`; reset `0px` on unmount/track null.
- BackToTop inline style `bottom: calc(var(--player-dock-height, 0px) + 1.5rem)`.
- ToastHost inline style `bottom: calc(var(--player-dock-height, 0px) + 1rem)`.

- [x] **Step 1: Rewrite `AudioPlayer.vue`** using Task 5 components, keep close/error behavior, `z-30`.
- [x] **Step 2: Implement ResizeObserver + CSS var** (cleanup on unmount).
- [x] **Step 3: Offset BackToTop + ToastHost** with the CSS var.
- [x] **Step 4: Typecheck/lint/tests** — `npm run typecheck && npm run lint && npm test`.
- [x] **Step 5: Commit** — `feat(audio): replace mini card with full-width player dock`.

### Task 7: PostPage integration

**Files:**
- Modify: `frontend/src/pages/PostPage.vue`

**Interfaces:**
- Replace inline audio header block with `<AudioPostHeader :post="post" :playing="isPlayingThis" :is-current="player.isCurrentPost(post.id)" @toggle="..." />`.
- Hide old action row for audio: `v-if="!isAudioPost"`.
- Hide bottom “Written by” card for audio: `v-if="!isMagazineStyle && !isAudioPost"`.
- Keep breadcrumb, content, tags, comments, related.

- [x] **Step 1: Replace header block + wire toggle**.
- [x] **Step 2: Hide duplicate action surfaces for audio**.
- [x] **Step 3: Typecheck/lint** — `npm run typecheck && npm run lint`.
- [x] **Step 4: Commit** — `feat(audio): use Ncmaz header on audio post pages`.

### Task 8: E2E + smoke-oriented verification

**Files:**
- Create: `frontend/e2e/audio-player.spec.ts`

**Interfaces:**
- Test route `/post/the-producers-reshaping-ambient-music` (mock).
- Assert dock visible after `Play audio`; speed cycle; close hides; BackToTop geometry at 1440, 390 collapsed/expanded; non-audio post unaffected.

- [x] **Step 1: Write e2e test** with exact selectors/aria labels.
- [x] **Step 2: Run** — `npm run e2e -- audio-player.spec.ts`; expected PASS.
- [x] **Step 3: Run full gates** — `npm run typecheck`, `npm run lint`, `npm test`, `npm run e2e`.
- [x] **Step 4: Manual screenshots** desktop/mobile light/dark (temp; do not commit unless requested).
- [x] **Step 5: Commit** — `test(audio): cover dock, back-to-top, mobile expand`.

### Task 9: Docs + changelog

**Files:**
- Modify: `docs/features/22-audio-player-and-upload.md`
- Modify: `docs/README.md` (status/description if needed)
- Modify: `CHANGELOG.md` (append team-work entry)

- [x] **Step 1: Update feature doc** with header/dock, controls, BackToTop, deviations, verification.
- [x] **Step 2: Update index/status**.
- [x] **Step 3: Add CHANGELOG entry** (Author/Role/Status, What/Why/Verified/Handover) after real verification.
- [x] **Step 4: Commit** — `docs(audio): document Ncmaz player parity and verification`.

### Task 10: Build, deploy, smoke test, final commit

**Files/artifacts:**
- `frontend/dist` (ignored), `backend/dist` (ignored), `backend/blogku` (Linux binary, ignored).
- Remote: `/opt/blogku/blogku` on `64.235.45.122:2232`.

- [x] **Step 1: Build frontend** — from `frontend/`:
  ```powershell
  $env:VITE_USE_POCKETBASE='true'; $env:VITE_PB_URL=''; npm run build
  ```
  Expected: `dist/` sukses.
- [x] **Step 2: Copy dist + cross-compile**:
  ```powershell
  Remove-Item ..\backend\dist -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory ..\backend\dist | Out-Null
  Copy-Item dist\* ..\backend\dist\ -Recurse -Force
  cd ..\backend
  $env:CGO_ENABLED='0'; $env:GOOS='linux'; $env:GOARCH='amd64'
  go build -trimpath -ldflags="-s -w" -o blogku .
  ```
- [x] **Step 3: Deploy** — `scp -P 2232 -i $env:USERPROFILE\.ssh\id_ed25519 backend/blogku root@64.235.45.122:/opt/blogku/blogku.new`; then ssh move/chown/restart; verify `systemctl is-active blogku`, `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8090/`.
- [x] **Step 4: Production smoke test** — Playwright against `https://blog.artku.my.id/post/snap-cracle`: header visible, dock appear on play, speed/volume/close, BackToTop gap at 1440 + 390 expanded; check `/api/health`.
- [x] **Step 5: Update CHANGELOG** with actual deployment/verification output; commit source/docs (not binary) — `feat(audio): ship Ncmaz player parity`.
- [x] **Step 6: Report** — include build result, deploy status, smoke results, commit SHA, and any handover caveats.

## Execution Notes

- Use `npm` from `frontend/`; backend Go from `backend/`.
- `npm run build` runs `vue-tsc --noEmit && vite build`; fix type errors before deploying.
- If production smoke fails, do not mark Done; fix and redeploy.
- Do not commit build artifacts (`frontend/dist`, `backend/dist`, `backend/blogku`).
- Preserve existing untracked specs/plans unless the user asked to commit them; this plan and its spec are intentionally committed.

