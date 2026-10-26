<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import {
  ArrowUpRight,
  CalendarDays,
  Eye,
  FileText,
  Heart,
  MessageCircle,
  PenLine,
  Sparkles,
  Star,
  Users,
} from 'lucide-vue-next'
import type { Comment, Post, User } from '@/api/types'
import { getDataSource } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { buildTimeline, type TimelineEvent } from '@/lib/admin-timeline'
import { formatNumber } from '@/lib/format'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

interface MetricCard {
  key: string
  label: string
  value: string
  caption: string
  gradient: string
  progress: number
  icon: Component
  people: User[]
  extra: number
}

const auth = useAuthStore()
const ui = useUiStore()
const pageTitle = ref('Admin Overview')
useDocumentTitle(pageTitle)

const loading = ref(true)
const posts = ref<Post[]>([])
const comments = ref<Comment[]>([])
const users = ref<User[]>([])

onMounted(async () => {
  try {
    const [publishedPage, draftPage, allComments, allUsers] = await Promise.all([
      getDataSource().listPosts({
        page: 1,
        perPage: 100,
        sort: '-createdAt',
        filter: { status: 'published' },
      }),
      getDataSource().listPosts({
        page: 1,
        perPage: 100,
        sort: '-updatedAt',
        filter: { status: 'draft' },
      }),
      getDataSource().listAllComments(),
      getDataSource().listUsers(),
    ])
    posts.value = [...publishedPage.items, ...draftPage.items]
    comments.value = allComments
    users.value = allUsers
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load the admin dashboard.', 'error')
  } finally {
    loading.value = false
  }
})

const published = computed(() => posts.value.filter((post) => post.status === 'published'))
const drafts = computed(() => posts.value.filter((post) => post.status === 'draft'))
const featured = computed(() => published.value.filter((post) => post.featured))
const topRead = computed(() =>
  [...published.value].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3),
)

const totalViews = computed(() =>
  published.value.reduce((total, post) => total + post.viewCount, 0),
)
const totalLikes = computed(() =>
  published.value.reduce((total, post) => total + post.likeCount, 0),
)
const totalComments = computed(() => comments.value.length)
const commentedPostCount = computed(
  () => published.value.filter((post) => post.commentCount > 0).length,
)

function uniqueUsers(list: User[]): User[] {
  const seen = new Set<string>()
  return list.filter((user) => {
    if (seen.has(user.id)) return false
    seen.add(user.id)
    return true
  })
}

function withPeople(list: User[], limit = 3): { people: User[]; extra: number } {
  return { people: list.slice(0, limit), extra: Math.max(0, list.length - limit) }
}

function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)))
}

const publishedAuthors = computed(() => uniqueUsers(published.value.map((post) => post.author)))
const draftAuthors = computed(() => uniqueUsers(drafts.value.map((post) => post.author)))
const commentAuthors = computed(() => uniqueUsers(comments.value.map((comment) => comment.author)))
const contributors = computed(() => users.value.filter((user) => user.role !== 'subscriber'))
const authors = computed(() =>
  users.value.filter((user) => user.role === 'admin' || user.role === 'penulis'),
)

const metricCards = computed<MetricCard[]>(() => {
  const publishedPeople = withPeople(publishedAuthors.value)
  const draftPeople = withPeople(draftAuthors.value)
  const commentPeople = withPeople(commentAuthors.value)
  const teamPeople = withPeople(contributors.value)

  return [
    {
      key: 'published',
      label: 'Published',
      value: formatNumber(published.value.length),
      caption: `${formatNumber(totalViews.value)} total reads`,
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      progress: percent(published.value.length, posts.value.length),
      icon: FileText,
      ...publishedPeople,
    },
    {
      key: 'drafts',
      label: 'Drafts',
      value: formatNumber(drafts.value.length),
      caption: 'Awaiting an editorial pass',
      gradient: 'from-sky-500 via-cyan-500 to-blue-600',
      progress: percent(drafts.value.length, posts.value.length),
      icon: PenLine,
      ...draftPeople,
    },
    {
      key: 'comments',
      label: 'Comments',
      value: formatNumber(totalComments.value),
      caption: `${commentedPostCount.value} stories with replies`,
      gradient: 'from-amber-400 via-orange-400 to-rose-400',
      progress: percent(commentedPostCount.value, published.value.length),
      icon: MessageCircle,
      ...commentPeople,
    },
    {
      key: 'team',
      label: 'Contributors',
      value: formatNumber(authors.value.length),
      caption: `${contributors.value.length} newsroom accounts`,
      gradient: 'from-pink-500 via-rose-500 to-fuchsia-500',
      progress: percent(authors.value.length, contributors.value.length),
      icon: Users,
      ...teamPeople,
    },
  ]
})

const boardColumns = computed(() => [
  {
    key: 'drafts',
    title: 'Drafts',
    accent: 'bg-sky-500',
    total: drafts.value.length,
    items: drafts.value.slice(0, 3),
  },
  {
    key: 'published',
    title: 'Published',
    accent: 'bg-violet-500',
    total: published.value.length,
    items: published.value.slice(0, 3),
  },
  {
    key: 'featured',
    title: 'Featured',
    accent: 'bg-amber-500',
    total: featured.value.length,
    items: featured.value.slice(0, 3),
  },
  {
    key: 'top',
    title: 'Top read',
    accent: 'bg-pink-500',
    total: topRead.value.length,
    items: topRead.value,
  },
])

const timeline = computed(() =>
  buildTimeline(published.value.length ? published.value : posts.value),
)

const timeMarks = computed(() => {
  const marks: Array<{ label: string; top: number }> = []
  const span = timeline.value.endHour - timeline.value.startHour

  for (let hour = timeline.value.startHour; hour < timeline.value.endHour; hour += 2) {
    marks.push({
      label: `${String(hour).padStart(2, '0')}:00`,
      top: ((hour - timeline.value.startHour) / span) * 100,
    })
  }

  return marks
})

function eventsForDay(dayKey: string): TimelineEvent[] {
  return timeline.value.events.filter((event) => event.dayKey === dayKey)
}

function postLink(post: Post): RouteLocationRaw {
  return post.status === 'draft'
    ? `/editor/${post.id}`
    : { name: 'post', params: { slug: post.slug } }
}

const reachStats = computed(() => [
  { label: 'Total reads', value: formatNumber(totalViews.value), icon: Eye, color: 'text-violet-500' },
  { label: 'Likes', value: formatNumber(totalLikes.value), icon: Heart, color: 'text-rose-500' },
  {
    label: 'Comments',
    value: formatNumber(totalComments.value),
    icon: MessageCircle,
    color: 'text-amber-500',
  },
  {
    label: 'Contributors',
    value: formatNumber(authors.value.length),
    icon: Users,
    color: 'text-sky-500',
  },
])

const hourOfDay = new Date().getHours()
const greeting =
  hourOfDay < 12 ? 'morning' : hourOfDay < 18 ? 'afternoon' : 'evening'
const firstName = computed(() => (auth.user?.name ?? 'Admin').split(' ')[0])
</script>

<template>
  <div class="pb-10">
    <div class="mx-auto max-w-[1500px] space-y-6">
      <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">
            Admin console
          </p>
          <h2 class="mt-1 text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            Good {{ greeting }}, {{ firstName }}
          </h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Here is what is happening across your editorial team today.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            to="/admin/moderation"
            class="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-600"
          >
            <MessageCircle class="h-4 w-4" aria-hidden="true" />
            Moderate ({{ comments.length }})
          </RouterLink>
          <RouterLink
            to="/editor"
            class="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            <PenLine class="h-4 w-4" aria-hidden="true" />
            New post
          </RouterLink>
        </div>
      </section>

      <div v-if="loading" class="flex justify-center py-24">
        <LoadingSpinner />
      </div>

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Content metrics">
          <article
            v-for="card in metricCards"
            :key="card.key"
            class="relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg shadow-neutral-900/5"
            :class="card.gradient"
          >
            <span class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
            <div class="relative">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-h-7 -space-x-2">
                  <span
                    v-for="member in card.people"
                    :key="member.id"
                    class="inline-flex rounded-full ring-2 ring-white/70"
                  >
                    <AppAvatar :src="member.avatar" :name="member.name" size="xs" />
                  </span>
                  <span
                    v-if="card.extra > 0"
                    class="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-[10px] font-bold text-white ring-2 ring-white/70"
                  >
                    +{{ card.extra }}
                  </span>
                </div>
                <component :is="card.icon" class="h-5 w-5 shrink-0 text-white/80" aria-hidden="true" />
              </div>

              <p class="mt-4 text-sm font-semibold text-white/90">{{ card.label }}</p>
              <p class="mt-0.5 text-2xl font-black tracking-tight">{{ card.value }}</p>
              <p class="mt-0.5 text-[11px] font-medium text-white/70">{{ card.caption }}</p>

              <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  class="h-full rounded-full bg-white/85 transition-all duration-500"
                  :style="{ width: `${card.progress}%` }"
                />
              </div>
            </div>
          </article>
        </section>

        <section
          class="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                Content board
              </h3>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                Stories grouped by workflow stage and performance.
              </p>
            </div>
            <RouterLink
              to="/dashboard"
              class="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
            >
              Open post manager
              <ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" />
            </RouterLink>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="column in boardColumns"
              :key="column.key"
              class="rounded-2xl bg-neutral-50/80 p-3 dark:bg-neutral-950/50"
            >
              <div class="flex items-center justify-between px-1 pb-3">
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full" :class="column.accent" />
                  <h4 class="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                    {{ column.title }}
                  </h4>
                </div>
                <span
                  class="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  {{ column.total }}
                </span>
              </div>

              <div class="space-y-2.5">
                <RouterLink
                  v-for="post in column.items"
                  :key="`${column.key}-${post.id}`"
                  :to="postLink(post)"
                  class="group block rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span
                      v-if="post.categories[0]"
                      class="truncate rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                    >
                      {{ post.categories[0].name }}
                    </span>
                    <span
                      v-else
                      class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      Uncategorized
                    </span>
                    <span class="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                      <Star class="h-3 w-3 fill-current" aria-hidden="true" />
                      {{ formatNumber(post.likeCount) }}
                    </span>
                  </div>

                  <h5
                    class="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 transition group-hover:text-violet-600 dark:text-neutral-100 dark:group-hover:text-violet-300"
                  >
                    {{ post.title }}
                  </h5>

                  <div class="mt-3 flex items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-1.5">
                      <AppAvatar :src="post.author.avatar" :name="post.author.name" size="xs" />
                      <span class="truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {{ post.author.name }}
                      </span>
                    </div>
                    <div class="flex shrink-0 items-center gap-2 text-[10px] font-semibold text-neutral-400">
                      <span class="inline-flex items-center gap-0.5">
                        <MessageCircle class="h-3 w-3" aria-hidden="true" />
                        {{ post.commentCount }}
                      </span>
                      <span class="inline-flex items-center gap-0.5">
                        <Eye class="h-3 w-3" aria-hidden="true" />
                        {{ formatNumber(post.viewCount) }}
                      </span>
                    </div>
                  </div>
                </RouterLink>

                <p
                  v-if="!column.items.length"
                  class="rounded-xl border border-dashed border-neutral-200 px-3 py-6 text-center text-[11px] text-neutral-400 dark:border-neutral-800 dark:text-neutral-500"
                >
                  Nothing here yet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div
            class="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-2.5">
                <span
                  class="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
                >
                  <CalendarDays class="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                    Publication timeline
                  </h3>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ timeline.label }}</p>
                </div>
              </div>
              <span
                class="inline-flex w-fit items-center rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
              >
                Last 7 active days
              </span>
            </div>

            <div class="mt-5 overflow-x-auto pb-2">
              <div class="min-w-[620px]">
                <div class="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-1">
                  <div />
                  <div
                    v-for="day in timeline.days"
                    :key="day.key"
                    class="pb-2 text-center"
                  >
                    <p class="text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                      {{ day.weekday }}
                    </p>
                    <p class="mt-0.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                      {{ day.dateLabel }}
                    </p>
                  </div>

                  <div class="relative h-[440px]">
                    <span
                      v-for="mark in timeMarks"
                      :key="mark.label"
                      class="absolute right-2 -translate-y-1/2 text-[10px] font-semibold text-neutral-400"
                      :style="{ top: `${mark.top}%` }"
                    >
                      {{ mark.label }}
                    </span>
                  </div>

                  <div
                    v-for="day in timeline.days"
                    :key="`column-${day.key}`"
                    class="relative h-[440px] rounded-xl border-s border-neutral-100 bg-neutral-50/40 dark:border-neutral-800 dark:bg-neutral-950/30"
                  >
                    <span
                      v-for="mark in timeMarks"
                      :key="`line-${day.key}-${mark.label}`"
                      class="absolute inset-x-0 border-t border-dashed border-neutral-100 dark:border-neutral-800"
                      :style="{ top: `${mark.top}%` }"
                    />

                    <RouterLink
                      v-for="event in eventsForDay(day.key)"
                      :key="event.id"
                      :to="{ name: 'post', params: { slug: event.slug } }"
                      class="absolute inset-x-1 z-10 overflow-hidden rounded-xl px-2 py-1.5 text-white shadow-md transition hover:brightness-110"
                      :class="event.color"
                      :style="{ top: `${event.top}%`, height: '62px' }"
                    >
                      <div class="flex items-center gap-1">
                        <AppAvatar
                          :src="event.author.avatar"
                          :name="event.author.name"
                          size="xs"
                          class="ring-1 ring-white/70"
                        />
                        <span class="text-[9px] font-bold text-white/80">{{ event.time }}</span>
                      </div>
                      <p class="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight">
                        {{ event.title }}
                      </p>
                    </RouterLink>

                    <p
                      v-if="!eventsForDay(day.key).length"
                      class="absolute inset-x-0 top-1/2 text-center text-[10px] font-medium text-neutral-300 dark:text-neutral-700"
                    >
                      —
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="space-y-4">
            <div
              class="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Editorial reach
              </h3>
              <dl class="mt-4 space-y-2">
                <div
                  v-for="stat in reachStats"
                  :key="stat.label"
                  class="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/40"
                >
                  <div class="flex items-center gap-2">
                    <component :is="stat.icon" class="h-4 w-4" :class="stat.color" aria-hidden="true" />
                    <dt class="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                      {{ stat.label }}
                    </dt>
                  </div>
                  <dd class="text-sm font-bold text-neutral-900 dark:text-white">{{ stat.value }}</dd>
                </div>
              </dl>
            </div>

            <div class="rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 p-5 text-white">
              <span class="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                <Sparkles class="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 class="mt-3 text-sm font-bold">Need a hand?</h3>
              <p class="mt-1 text-xs leading-relaxed text-white/75">
                Review site settings, editor defaults and RBAC permissions from one place.
              </p>
              <RouterLink
                to="/admin/settings"
                class="mt-4 inline-flex h-9 items-center gap-1 rounded-full bg-white px-4 text-xs font-bold text-neutral-900 transition hover:bg-white/90"
              >
                Open settings
                <ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" />
              </RouterLink>
            </div>
          </aside>
        </section>
      </template>
    </div>
  </div>
</template>
