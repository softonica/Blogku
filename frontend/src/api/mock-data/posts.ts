import type { Category, Post, PostType, Tag, User } from '../types'
import { categories } from './categories'
import { tags } from './tags'
import { users } from './users'

const covers = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=960&q=75',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
]

interface Seed {
  slug: string
  title: string
  excerpt: string
  categorySlug: string
  tagSlugs: string[]
  authorUsername: string
  createdAt: string
  likeCount: number
  viewCount: number
  commentCount: number
  readingTime: number
  featured: boolean
  postType?: PostType
  videoUrl?: string
  audioUrl?: string
  gallery?: string[]
}

const seeds: Seed[] = [
  {
    slug: 'the-quiet-rise-of-slow-technology',
    title: 'The quiet rise of slow technology',
    excerpt:
      'A new generation of tools is trading infinite feeds for focus. Here is what “slow tech” actually changes in daily work.',
    categorySlug: 'technology',
    tagSlugs: ['ai', 'web-development'],
    authorUsername: 'leo-martin',
    createdAt: '2026-10-18T08:15:00.000Z',
    likeCount: 284,
    viewCount: 12480,
    commentCount: 18,
    readingTime: 7,
    featured: true,
  },
  {
    slug: 'a-field-guide-to-designing-for-trust',
    title: 'A field guide to designing for trust',
    excerpt:
      'Trust is rarely a feature. It is a hundred small decisions about language, defaults and what happens when something goes wrong.',
    categorySlug: 'design',
    tagSlugs: ['minimalism', 'productivity'],
    authorUsername: 'maya-chen',
    createdAt: '2026-10-16T10:40:00.000Z',
    likeCount: 412,
    viewCount: 18930,
    commentCount: 24,
    readingTime: 9,
    featured: true,
  },
  {
    slug: '48-hours-in-the-faroe-islands',
    title: '48 hours in the Faroe Islands',
    excerpt:
      'Wind, grass roofs and roads that end at the sea. A short itinerary for people who prefer weather to queues.',
    categorySlug: 'travel',
    tagSlugs: ['hiking', 'photography'],
    authorUsername: 'sofia-reed',
    createdAt: '2026-10-14T07:05:00.000Z',
    likeCount: 356,
    viewCount: 15320,
    commentCount: 12,
    readingTime: 8,
    featured: true,
    postType: 'gallery',
  },
  {
    slug: 'why-your-next-coffee-should-be-a-ritual',
    title: 'Why your next cup of coffee should be a ritual',
    excerpt:
      'The difference between a good cup and a memorable one is rarely the beans. It is the ten minutes around them.',
    categorySlug: 'food',
    tagSlugs: ['coffee', 'culture'],
    authorUsername: 'arjun-patel',
    createdAt: '2026-10-12T06:20:00.000Z',
    likeCount: 198,
    viewCount: 9410,
    commentCount: 9,
    readingTime: 5,
    featured: true,
  },
  {
    slug: 'the-producers-reshaping-ambient-music',
    title: 'The producers reshaping ambient music',
    excerpt:
      'Across bedrooms and tiny studios, a new scene is making music that asks for attention in a different way.',
    categorySlug: 'music',
    tagSlugs: ['culture', 'review'],
    authorUsername: 'nina-kovacs',
    createdAt: '2026-10-10T12:00:00.000Z',
    likeCount: 156,
    viewCount: 7120,
    commentCount: 6,
    readingTime: 6,
    featured: false,
    postType: 'audio',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    slug: 'inside-the-small-teams-shipping-big-ai-features',
    title: 'Inside the small teams shipping big AI features',
    excerpt:
      'No giant platform, no twelve-month roadmap. Five engineers explain how they ship useful AI without losing the plot.',
    categorySlug: 'technology',
    tagSlugs: ['ai', 'web-development', 'tutorial'],
    authorUsername: 'leo-martin',
    createdAt: '2026-10-08T09:30:00.000Z',
    likeCount: 221,
    viewCount: 11020,
    commentCount: 14,
    readingTime: 10,
    featured: false,
    postType: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
  },
  {
    slug: 'minimalism-is-not-about-owning-less',
    title: 'Minimalism is not about owning less',
    excerpt:
      'The useful version of minimalism is not an empty shelf. It is a clear decision about what deserves your attention.',
    categorySlug: 'lifestyle',
    tagSlugs: ['minimalism', 'productivity'],
    authorUsername: 'nina-kovacs',
    createdAt: '2026-10-06T15:45:00.000Z',
    likeCount: 187,
    viewCount: 8640,
    commentCount: 11,
    readingTime: 6,
    featured: false,
  },
  {
    slug: 'a-practical-guide-to-accessible-color-systems',
    title: 'A practical guide to accessible color systems',
    excerpt:
      'Contrast ratios are the beginning, not the end. A working method for palettes that stay readable in every state.',
    categorySlug: 'design',
    tagSlugs: ['web-development', 'tutorial', 'photography'],
    authorUsername: 'maya-chen',
    createdAt: '2026-10-04T11:10:00.000Z',
    likeCount: 143,
    viewCount: 6890,
    commentCount: 8,
    readingTime: 8,
    featured: false,
  },
  {
    slug: 'hiking-the-dolomites-without-the-crowds',
    title: 'Hiking the Dolomites without the crowds',
    excerpt:
      'Three quieter trails, two mountain huts and one rule: start earlier than you think you need to.',
    categorySlug: 'travel',
    tagSlugs: ['hiking', 'photography'],
    authorUsername: 'sofia-reed',
    createdAt: '2026-10-02T05:55:00.000Z',
    likeCount: 264,
    viewCount: 13010,
    commentCount: 15,
    readingTime: 7,
    featured: false,
    postType: 'audio',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    slug: 'the-case-for-cooking-one-great-meal-a-week',
    title: 'The case for cooking one great meal a week',
    excerpt:
      'A single repeatable dinner can do more for your week than a folder full of recipes you never open.',
    categorySlug: 'food',
    tagSlugs: ['coffee', 'productivity'],
    authorUsername: 'arjun-patel',
    createdAt: '2026-09-30T17:25:00.000Z',
    likeCount: 132,
    viewCount: 6020,
    commentCount: 7,
    readingTime: 5,
    featured: false,
  },
  {
    slug: 'how-vinyl-survived-and-then-thrived',
    title: 'How vinyl survived — and then thrived',
    excerpt:
      'The format was supposed to disappear. Instead it became a ritual, a design object and a small act of resistance.',
    categorySlug: 'music',
    tagSlugs: ['culture', 'review'],
    authorUsername: 'nina-kovacs',
    createdAt: '2026-09-28T13:35:00.000Z',
    likeCount: 174,
    viewCount: 7830,
    commentCount: 10,
    readingTime: 7,
    featured: false,
    postType: 'audio',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    slug: 'vue-3-patterns-that-scale-past-ten-screens',
    title: 'Vue 3 patterns that scale past ten screens',
    excerpt:
      'Composables, provide/inject and a data adapter: the boring structure that keeps a growing SPA calm.',
    categorySlug: 'technology',
    tagSlugs: ['vue', 'web-development', 'tutorial'],
    authorUsername: 'leo-martin',
    createdAt: '2026-09-26T08:00:00.000Z',
    likeCount: 309,
    viewCount: 16440,
    commentCount: 21,
    readingTime: 11,
    featured: false,
    postType: 'video',
    videoUrl: 'https://www.youtube.com/watch?v=b492_j_1d_E',
  },
  {
    slug: 'the-new-rules-of-creative-burnout',
    title: 'The new rules of creative burnout',
    excerpt:
      'Rest is not a reward for finishing. Five writers and designers on the boundaries that keep the work alive.',
    categorySlug: 'lifestyle',
    tagSlugs: ['health', 'productivity'],
    authorUsername: 'maya-chen',
    createdAt: '2026-09-24T16:10:00.000Z',
    likeCount: 245,
    viewCount: 11980,
    commentCount: 19,
    readingTime: 8,
    featured: false,
  },
  {
    slug: 'street-photography-in-cities-that-never-sleep',
    title: 'Street photography in cities that never sleep',
    excerpt:
      'Light, patience and the ethics of pointing a camera at strangers. Notes from three nights in Tokyo.',
    categorySlug: 'design',
    tagSlugs: ['photography', 'culture'],
    authorUsername: 'sofia-reed',
    createdAt: '2026-09-22T21:05:00.000Z',
    likeCount: 188,
    viewCount: 9020,
    commentCount: 9,
    readingTime: 6,
    featured: false,
  },
  {
    slug: 'what-great-onboarding-feels-like',
    title: 'What great onboarding feels like',
    excerpt:
      'The best first-run experiences do less, sooner. A short checklist for product teams rewriting theirs.',
    categorySlug: 'design',
    tagSlugs: ['productivity', 'minimalism'],
    authorUsername: 'maya-chen',
    createdAt: '2026-09-20T10:15:00.000Z',
    likeCount: 117,
    viewCount: 5410,
    commentCount: 5,
    readingTime: 6,
    featured: false,
  },
  {
    slug: 'the-architecture-of-a-calm-home-office',
    title: 'The architecture of a calm home office',
    excerpt:
      'Less about desks, more about sightlines, sound and the ability to close a door — even a metaphorical one.',
    categorySlug: 'lifestyle',
    tagSlugs: ['minimalism', 'health'],
    authorUsername: 'demo',
    createdAt: '2026-09-18T09:45:00.000Z',
    likeCount: 96,
    viewCount: 4320,
    commentCount: 4,
    readingTime: 5,
    featured: false,
  },
  {
    slug: 'independent-radio-is-having-a-moment',
    title: 'Independent radio is having a moment',
    excerpt:
      'Small stations are finding new audiences by sounding like places, not playlists. A tour of five worth following.',
    categorySlug: 'music',
    tagSlugs: ['culture', 'review'],
    authorUsername: 'arjun-patel',
    createdAt: '2026-09-16T18:30:00.000Z',
    likeCount: 141,
    viewCount: 6590,
    commentCount: 8,
    readingTime: 6,
    featured: false,
  },
  {
    slug: 'a-beginners-map-to-the-night-sky',
    title: "A beginner's map to the night sky",
    excerpt:
      'You do not need a telescope to start. A dark hour, a simple chart and one familiar constellation will do.',
    categorySlug: 'travel',
    tagSlugs: ['hiking', 'photography'],
    authorUsername: 'demo',
    createdAt: '2026-09-14T20:00:00.000Z',
    likeCount: 88,
    viewCount: 3980,
    commentCount: 3,
    readingTime: 5,
    featured: false,
  },
]

function categoryFor(slug: string): Category {
  const category = categories.find((item) => item.slug === slug)
  if (!category) throw new Error(`Unknown category: ${slug}`)
  return category
}

function tagsFor(slugs: string[]): Tag[] {
  return slugs.map((slug) => {
    const tag = tags.find((item) => item.slug === slug)
    if (!tag) throw new Error(`Unknown tag: ${slug}`)
    return tag
  })
}

function authorFor(username: string): User {
  const author = users.find((item) => item.username === username)
  if (!author) throw new Error(`Unknown author: ${username}`)
  return author
}

function buildContent(seed: Seed, cover: string, index: number): string {
  const codeBlock =
    index % 4 === 0
      ? `<pre><code>const source = new MockSource()
const page = await source.listPosts({ page: 1, perPage: 12 })
console.log(page.items.length)</code></pre>`
      : ''

  return `<p>${seed.excerpt}</p>
<h2>Start with the constraint</h2>
<p>Most advice about ${seed.categorySlug} begins with possibility. The more useful beginning is a constraint: one clear goal, one honest deadline, one thing you are willing to leave out. Constraints do not shrink the work — they give it a shape.</p>
<p>Over the past month we spoke with people who practise this daily. None of them described a dramatic system. They described small rules, kept consistently, and a willingness to remove what no longer earned its place.</p>
<h2>What to keep</h2>
<ul>
<li>Decide what the work is for before you decide how it looks.</li>
<li>Keep one source of truth and let everything else point at it.</li>
<li>Measure the outcome, not the activity around it.</li>
<li>Write the short version first. Expand only where it earns attention.</li>
</ul>
<p>The pattern repeats across disciplines: the calm version is usually the version that survived contact with a real week.</p>
<blockquote><p>Good work is not the absence of mess. It is the presence of a decision about which mess matters.</p></blockquote>
<h2>A practice, not a personality</h2>
<p>It is tempting to turn this into an identity. The healthier move is to treat it as a practice you can return to after a bad week. Start again on Monday. Keep the rule that still helps.</p>
${codeBlock}
<h3>Try this week</h3>
<p>Pick one habit from the list above and run it for seven days. At the end, write three sentences about what changed. That note is the beginning of your own field guide.</p>
<img src="${cover}" alt="${seed.title}" loading="lazy" decoding="async" />`
}

export const posts: Post[] = seeds.map((seed, index) => {
  const cover = covers[index % covers.length]
  return {
    id: `post_${String(index + 1).padStart(2, '0')}`,
    slug: seed.slug,
    title: seed.title,
    excerpt: seed.excerpt,
    content: buildContent(seed, cover, index),
    cover,
    status: 'published',
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
    author: authorFor(seed.authorUsername),
    categories: [categoryFor(seed.categorySlug)],
    tags: tagsFor(seed.tagSlugs),
    likeCount: seed.likeCount,
    viewCount: seed.viewCount,
    commentCount: seed.commentCount,
    readingTime: seed.readingTime,
    featured: seed.featured,
    postType: seed.postType ?? 'standard',
    videoUrl: seed.videoUrl,
    audioUrl: seed.audioUrl,
    gallery: seed.gallery,
  }
})
