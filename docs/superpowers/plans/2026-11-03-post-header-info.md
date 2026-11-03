# Post Header Info Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one reusable `PostHeaderInfo.vue` component — avatar, author name, date · reading time, and a round action row (like + count, comments + count, views + count, divider, bookmark, share) — and use it as the single source for post header info across audio, standard, video, and hero post layouts.

**Architecture:** A new component in `frontend/src/components/post/PostHeaderInfo.vue` composed of existing atoms (`AppAvatar`, `LikeButton`, `SaveButton`, `formatDate`, `formatNumber`), with a `tone` prop for hero-overlay usage. `AudioPostHeader.vue` and `PostPage.vue` are refactored to use it.

**Tech Stack:** Vue 3 `<script setup lang="ts">`, Tailwind CSS v4, lucide-vue-next, Vitest + @vue/test-utils + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-03-post-header-info-component-design.md`

## Global Constraints

- Typecheck must pass: `npm run typecheck` (`vue-tsc --noEmit`) in `frontend/`.
- Lint must pass: `npm run lint` (`eslint .`) in `frontend/`.
- Tests must pass: `npm run test` (`vitest run`) in `frontend/`.
- All UI must support dark mode (`dark:`) and `aria-*` attributes; mobile-first (base = <640px, `sm:` = desktop) per `docs/features/19-mobile-compact-layout.md`.
- No `eval()`, no `new Function()`, no bypassing sanitization.
- All data interactions stay behind the `DataSource` interface (`@/api`); components never call backend/mock directly.
- New props added to `LikeButton`/`SaveButton` must default to current behavior (backward compatible).

## Review Focus

1. **Default tone regression** — `tone="default"` (and omitted tone) must render exactly like today's colors; no global look change.
2. **Edit access preserved** — admin/author must still reach the editor after the `...`/Edit button is removed from action rows (moved to breadcrumb).
3. **Mobile overflow** — the action row must wrap cleanly at 375px without horizontal scroll or clipped buttons.
4. **Hero legibility** — `tone="on-image"` text/icons must stay readable over any cover image at 360px and 1440px.
5. **Shared stores still work** — like/bookmark toggles in the new header must keep using `useReactionStore`/`useBookmarkStore` (same behavior, same place).

---

### Task 1: Add `size` and `tone` props to LikeButton & SaveButton

**Files:**
- Modify: `frontend/src/components/post/LikeButton.vue`
- Modify: `frontend/src/components/post/SaveButton.vue`
- Test: `frontend/src/components/post/LikeButton.test.ts` (new)
- Test: `frontend/src/components/post/SaveButton.test.ts` (new)

**Interfaces:**
- Produces (consumed by Task 2):
  - `LikeButton` props: `variant?: 'pill' | 'icon' | 'compact'` (unchanged), `size?: 'sm' | 'md'` (default `'sm'`), `tone?: 'default' | 'on-image'` (default `'default'`). `size`/`tone` only affect `variant="compact"`; pill/icon output unchanged.
  - `SaveButton` props: `variant?: 'pill' | 'icon'` (unchanged), `size?: 'sm' | 'md'` (default `'sm'`), `tone?: 'default' | 'on-image'` (default `'default'`). Applies to both variants; `pill` keeps its `showLabel` behavior.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/post/LikeButton.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LikeButton from './LikeButton.vue'

function mountLike(props: Record<string, unknown> = {}) {
  return mount(LikeButton, {
    props: { post: { id: 'p1', likeCount: 3 }, ...props },
    global: { stubs: { RouterLink: true } },
  })
}

describe('LikeButton compact variants', () => {
  it('keeps the legacy compact size by default (sm)', () => {
    setActivePinia(createPinia())
    const wrapper = mountLike({ variant: 'compact' })
    expect(wrapper.classes()).toContain('h-9')
  })

  it('applies md size for compact variant', () => {
    setActivePinia(createPinia())
    const wrapper = mountLike({ variant: 'compact', size: 'md' })
    expect(wrapper.classes()).toContain('h-11')
  })

  it('applies on-image tone classes to compact variant', () => {
    setActivePinia(createPinia())
    const wrapper = mountLike({ variant: 'compact', tone: 'on-image' })
    expect(wrapper.classes()).toContain('text-white')
  })
})
```

Create `frontend/src/components/post/SaveButton.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SaveButton from './SaveButton.vue'

describe('SaveButton sizes', () => {
  it('keeps the legacy size by default (sm)', () => {
    setActivePinia(createPinia())
    const wrapper = mount(SaveButton, { props: { postId: 'p1' } })
    expect(wrapper.classes()).toContain('h-9')
  })

  it('applies md size', () => {
    setActivePinia(createPinia())
    const wrapper = mount(SaveButton, { props: { postId: 'p1', size: 'md' } })
    expect(wrapper.classes()).toContain('h-11')
  })

  it('applies on-image tone classes', () => {
    setActivePinia(createPinia())
    const wrapper = mount(SaveButton, { props: { postId: 'p1', tone: 'on-image' } })
    expect(wrapper.classes()).toContain('bg-white/10')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test` (cwd `frontend/`)
Expected: FAIL — `h-11`/`text-white`/`bg-white/10` classes not present.

- [ ] **Step 3: Implement the props in `LikeButton.vue`**

Add to `withDefaults`:

```ts
size?: 'sm' | 'md'
tone?: 'default' | 'on-image'
```

with defaults `'sm'` and `'default'`. Compact variant layout changes (current classes preserved for `sm`):

- `size === 'md'`: wrapper `h-11 gap-2 px-2 text-sm`, inner circle `h-11 w-11`, icon `h-5 w-5`; `sm` keeps todays `h-9 gap-1.5 px-1.5 text-xs`, circle `h-9 w-9`, icon `h-[18px] w-[18px]`.
- `tone === 'on-image'` (unliked only): wrapper `text-white hover:text-rose-300 dark:text-white dark:hover:text-rose-300`; inner circle `bg-white/10 hover:bg-white/20 dark:bg-white/10 dark:hover:bg-white/20`; liked state keeps today's rose colors.

- [ ] **Step 4: Implement the props in `SaveButton.vue`**

Add to `withDefaults`: `size?: 'sm' | 'md'`, `tone?: 'default' | 'on-image'` with defaults `'sm'`/`'default'`.

- `size === 'md'`: icon variant `h-11 w-11` (was `h-9 w-9 sm:h-10 sm:w-10`), icon `h-5 w-5` (was `h-4 w-4`); `pill` keeps `h-10 px-3 sm:px-4`.
- `tone === 'on-image'` unsaved: `border-white/25 bg-white/10 text-white hover:bg-white/20 dark:bg-white/10`; saved on-image: `border-primary-300/80 bg-primary-500/30 text-primary-100`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS (all old tests still green).

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/post/LikeButton.vue frontend/src/components/post/SaveButton.vue frontend/src/components/post/LikeButton.test.ts frontend/src/components/post/SaveButton.test.ts
git commit -m "feat(post): add size and tone props to LikeButton/SaveButton"
```

---

### Task 2: Create PostHeaderInfo component + unit tests

**Files:**
- Create: `frontend/src/components/post/PostHeaderInfo.vue`
- Test: `frontend/src/components/post/PostHeaderInfo.test.ts`

**Interfaces:**
- Consumes: Task 1 props (`LikeButton variant="compact" size="md" tone`, `SaveButton size="md" tone`), existing `AppAvatar`, `formatDate`, `formatNumber`.
- Produces (consumed by Tasks 3 & 4):
  - Props: `post: Post`, `tone?: 'default' | 'on-image'` (default `'default'`), `align?: 'start' | 'center'` (default `'start'`).
  - Emits: `comments: []`, `share: []`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/post/PostHeaderInfo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Post } from '@/api/types'
import { formatDate, formatNumber } from '@/lib/format'
import PostHeaderInfo from './PostHeaderInfo.vue'

const post: Post = {
  id: 'p1',
  slug: 'hello',
  title: 'Hello world',
  excerpt: '',
  content: '',
  cover: '',
  status: 'published',
  createdAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  author: { id: 'u1', username: 'john', name: 'John Doe', avatar: '', role: 'author' },
  categories: [],
  tags: [],
  likeCount: 5,
  viewCount: 120,
  commentCount: 7,
  readingTime: 4,
  featured: false,
}

function mountInfo(tone?: 'default' | 'on-image') {
  return mount(PostHeaderInfo, {
    props: { post, ...(tone ? { tone } : {}) },
    global: {
      stubs: {
        RouterLink: { template: '<a :href="to"><slot /></a>' },
        LikeButton: { template: '<button class="like-stub">Like</button>' },
        SaveButton: { template: '<button class="save-stub">Save</button>' },
      },
    },
  })
}

describe('PostHeaderInfo', () => {
  it('renders author avatar link, name, formatted date and reading time', () => {
    const wrapper = mountInfo()
    expect(wrapper.find('a[href="/author/john"]').text()).toContain('John Doe')
    expect(wrapper.text()).toContain(formatDate(post.createdAt))
    expect(wrapper.text()).toContain('4 min read')
  })

  it('shows view, comment counts and stubbed action buttons', () => {
    const wrapper = mountInfo()
    expect(wrapper.text()).toContain(formatNumber(120))
    expect(wrapper.text()).toContain(formatNumber(7))
    expect(wrapper.find('button.like-stub').exists()).toBe(true)
    expect(wrapper.find('button.save-stub').exists()).toBe(true)
  })

  it('emits comments and share events', async () => {
    const wrapper = mountInfo()
    await wrapper.find('button[aria-label^="Comments"]').trigger('click')
    await wrapper.find('button[aria-label="Share post"]').trigger('click')
    expect(wrapper.emitted('comments')).toBeTruthy()
    expect(wrapper.emitted('share')).toBeTruthy()
  })

  it('applies on-image tone classes', () => {
    const wrapper = mountInfo('on-image')
    expect(wrapper.classes()).toContain('text-white')
  })

  it('centers content when align is center', () => {
    const wrapper = mount(PostHeaderInfo, {
      props: { post, align: 'center' },
      global: { stubs: { RouterLink: true, LikeButton: true, SaveButton: true } },
    })
    expect(wrapper.classes()).toContain('items-center')
  })
})
```

Note: the `User` type fields used here must match `frontend/src/api/types.ts`; adjust the fixture if the interface has required fields beyond those listed (e.g. `socials`, `bio`, `coverBanner`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- PostHeaderInfo`
Expected: FAIL — `PostHeaderInfo.vue` not found.

- [ ] **Step 3: Implement `PostHeaderInfo.vue`**

Structure (mobile-first, `sm:` for desktop):

1. Root: `<div class="flex flex-col gap-4" :class="align === 'center' ? 'items-center' : 'items-start'">`; when `tone === 'on-image'` also add `text-white` and `dark:text-white`.
2. Author row: `RouterLink` → `/author/${post.author.username}`, wrapping `AppAvatar :src :name size="md"`; next to it name (`text-lg font-bold`, link styling like `PostMeta.vue`) and a meta line (`text-sm`, color `text-neutral-500 dark:text-neutral-400`, or `text-white/80` on-image) containing `<time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>`, `·`, and `{{ post.readingTime }} min read`.
3. Action row: `flex flex-wrap items-center gap-1.5 sm:gap-2` containing, in order:
   - `<LikeButton :post="post" variant="compact" size="md" :tone="tone" />`
   - Comments button (round `h-11 w-11`, icon `MessageCircle` `h-5 w-5` + `formatNumber(post.commentCount)`), `aria-label="Comments (N)"`, emits `comments`.
   - Views stat (non-interactive span, same size, `Eye` icon, `title="Views"`, `aria-label` with count).
   - Divider `mx-1 h-5 border-s border-neutral-200 dark:border-neutral-700` (on-image: `border-white/25`).
   - `<SaveButton :post-id="post.id" :post-title="post.title" variant="icon" size="md" :tone="tone" />`
   - Share button (round `h-11 w-11`, `Share2` `h-5 w-5`, `aria-label="Share post"`), emits `share`.
   - Round-button base classes: default `bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`; on-image `bg-white/10 text-white hover:bg-white/20 dark:bg-white/10`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- PostHeaderInfo`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/post/PostHeaderInfo.vue frontend/src/components/post/PostHeaderInfo.test.ts
git commit -m "feat(post): add reusable PostHeaderInfo component"
```

---

### Task 3: Refactor AudioPostHeader to use PostHeaderInfo

**Files:**
- Modify: `frontend/src/components/post/AudioPostHeader.vue`

**Interfaces:**
- Consumes: Task 2 (`PostHeaderInfo` props/emits).
- Produces: unchanged external contract — props `post`, `playing`; emits `toggle`, `share`, `comments`.

- [ ] **Step 1: Replace the author/meta/action block**

In `AudioPostHeader.vue`, replace everything inside the right-hand column from the first `<div class="mt-4 flex flex-wrap justify-between ...">` (author + actions) through its closing `</div>` with:

```vue
<PostHeaderInfo
  :post="post"
  @comments="emit('comments')"
  @share="emit('share')"
/>
```

Keep the category badge list, `<h1>`, and the border divider above it.

- [ ] **Step 2: Clean up imports**

Remove now-unused imports: `AppAvatar`, `LikeButton`, `SaveButton`, `Clock`, `Eye`, `MessageCircle`, `Share2`, `PenLine`, `formatDate`, `formatNumber`, `canManagePost`, `useAuthStore`, and the `auth`/`canEdit` declarations. Add `import PostHeaderInfo from '@/components/post/PostHeaderInfo.vue'`. Keep `Play`, `PlayingEqualizer`, `Post`, `computed`, `defineProps`/`defineEmits`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors (this catches any leftover unused import/var).

- [ ] **Step 4: Run full test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/post/AudioPostHeader.vue
git commit -m "refactor(post): use PostHeaderInfo in audio post header"
```

---

### Task 4: Refactor PostPage to use PostHeaderInfo across all layouts

**Files:**
- Modify: `frontend/src/pages/PostPage.vue`

**Interfaces:**
- Consumes: Task 2 (`PostHeaderInfo`), existing `canManagePost`, `scrollToComments`, `openShare`, `postStyle` computeds.

- [ ] **Step 1: Import PostHeaderInfo**

Add `import PostHeaderInfo from '@/components/post/PostHeaderInfo.vue'` to the script imports.

- [ ] **Step 2: Standard & video header (style 1–3)**

In the `<header v-if="!isAudioPost && !isHeroStyle">` block, replace the whole author/info `<div>` (avatar, name, date, clock, views — currently `mt-5 sm:mt-7 ...`) with:

```vue
<div :class="isCenteredStyle ? 'mt-5 sm:mt-7 flex justify-center' : 'mt-5 sm:mt-7'">
  <PostHeaderInfo
    :post="post"
    :align="isCenteredStyle ? 'center' : 'start'"
    @comments="scrollToComments"
    @share="openShare"
  />
</div>
```

- [ ] **Step 3: Hero overlay (style 4)**

In the hero overlay (`<div class="absolute inset-x-0 bottom-0 ...">`), replace the meta line (author name · date · reading time) with:

```vue
<div class="mt-4 sm:mt-5">
  <PostHeaderInfo tone="on-image" :post="post" @comments="scrollToComments" @share="openShare" />
</div>
```

Also add `text-start` handling if needed — `PostHeaderInfo` is left-aligned by default, which matches the overlay.

- [ ] **Step 4: Remove the pill action row**

Remove the entire `<div v-if="!isAudioPost" class="mt-5 sm:mt-7 flex flex-wrap items-center gap-2 ...">` block (Edit pill, LikeButton, SaveButton, comments pill, share pill). Its functionality now lives in `PostHeaderInfo`.

- [ ] **Step 5: Remove the bottom "Written by" card**

Remove the `<div v-if="!isMagazineStyle && !isAudioPost" class="mt-8 sm:mt-10 hidden sm:flex ...">` block (duplicate author + Like/Save now provided by the header).

- [ ] **Step 6: Magazine sidebar**

In the `<aside v-if="isMagazineStyle" ...>` sidebar, the "Written by" card no longer renders `AppAvatar`/author/date/`LikeButton`/`SaveButton`/Share. Keep only the "Post details" card (reading time · views) — leave the surrounding card markup but strip the author/action content (or remove the card entirely and keep just "Post details").

- [ ] **Step 7: Move Edit link to breadcrumb**

Wrap the breadcrumb `<nav>` content in a flex row (`flex items-center justify-between gap-3 flex-wrap`) and append:

```vue
<RouterLink
  v-if="canManagePost(auth.user?.role, auth.user?.id, post.author.id)"
  :to="`/editor/${post.id}`"
  class="inline-flex h-8 items-center gap-1.5 rounded-full border border-neutral-200 px-3 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
>
  <PenLine class="h-3.5 w-3.5" aria-hidden="true" />
  Edit post
</RouterLink>
```

- [ ] **Step 8: Clean up script imports/computeds**

Remove unused imports and computeds (typecheck/lint will surface them): `AppAvatar`, `Clock`, `Eye`, `Share2`, and `formatDate`/`formatNumber` if no longer referenced (verify — the share modal and `formatNumber` may still be used elsewhere; only remove what's actually unused). Keep `MessageCircle`, `PenLine`, `Link2`, `X`, `Facebook`, `Linkedin`, `Send`, `Twitter`.

- [ ] **Step 9: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 10: Run full test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 11: Manual smoke check (Playwright or dev server)**

Run: `npm run dev`, open:
- Audio post → header uses vinyl + `PostHeaderInfo`, play/pause still works, comments/share fire correctly.
- Standard post all four styles (`style1`–`style4`) via editor or mock data → header info + action row appear once, edit link in breadcrumb (as admin), no duplicate like/save, no leftover pill row.
- Video post → same header treatment.
- Toggle dark mode, resize to 375px (no horizontal scroll), check 1440px.
- Click like while logged out → redirect to login; bookmark toggles; share modal opens.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/pages/PostPage.vue
git commit -m "refactor(post): unify post header info across layouts"
```

---

### Task 5: Documentation & changelog

**Files:**
- Create: `docs/features/23-post-header-info-component.md`
- Modify: `docs/README.md` (index)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Write feature doc**

Create `docs/features/23-post-header-info-component.md` following `docs/FEATURE-DOCUMENTATION-GUIDELINES.md` (summary/motivation, architecture & components, data contract & TS types, authorization & security, UI/UX usage guide, testing & verification). Include the component contract (`post`, `tone`, `align`, emits), the atom props added, the integration matrix from the spec §6, and the verification commands used.

- [ ] **Step 2: Update docs index**

Add the new feature file to the list in `docs/README.md` (check its current numbering/link format and match it).

- [ ] **Step 3: Append changelog entry**

Append to `CHANGELOG.md` in the team-work format:

```markdown
## [2026-11-03] — Post header info component (reusable across post types)
**Author** · **Role** (Dev) · **Status** (Done)
### What changed
- New `frontend/src/components/post/PostHeaderInfo.vue` (avatar, author, date · reading time, round action row: like/comments/views, divider, save, share).
- `LikeButton`/`SaveButton`: new optional `size`/`tone` props (defaults unchanged).
- `AudioPostHeader.vue` and `PostPage.vue` refactored to use it; pill action row, duplicate bottom "Written by" card, and magazine sidebar author/action card removed; Edit link moved to breadcrumb.
- Docs: `docs/features/23-post-header-info-component.md`, `docs/README.md`.
### Why
- Unify header info presentation across audio/standard/video/hero post layouts; avoid duplicated info per feature 19 rule.
### How it was verified
- `npm run typecheck && npm run lint && npm run test` all pass in `frontend/`.
- Manual smoke (dev server): all post styles, dark mode, 375px + 1440px, like/bookmark/share/comments, login redirect.
### Handover notes
- No API/backend changes; stores untouched. If a future design wants a "..." menu, add it inside `PostHeaderInfo` and re-introduce Edit there.
```

- [ ] **Step 4: Commit**

```bash
git add docs/features/23-post-header-info-component.md docs/README.md CHANGELOG.md
git commit -m "docs: post header info component + changelog"
```

---

## Final Verification (whole branch)

Run from `frontend/`: `npm run typecheck && npm run lint && npm run test` — all green, then confirm `git log --oneline` shows five commits (Tasks 1–5).
