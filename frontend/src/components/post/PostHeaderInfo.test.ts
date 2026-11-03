import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
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
  author: {
    id: 'u1',
    username: 'john',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '',
    bio: '',
    role: 'penulis',
  },
  categories: [],
  tags: [],
  likeCount: 5,
  viewCount: 120,
  commentCount: 7,
  readingTime: 4,
  featured: false,
}

function createCaptureStub(name: string, stubClass: string, propNames: string[]) {
  const received = ref<Record<string, unknown>>({})
  const Stub = defineComponent({
    name: `${name}Stub`,
    inheritAttrs: false,
    props: propNames,
    setup(props) {
      received.value = { ...props }
      return () => h('button', { class: stubClass }, name)
    },
  })
  return { received, Stub }
}

const likeStub = createCaptureStub('Like', 'like-stub', [
  'post',
  'showCount',
  'variant',
  'size',
  'tone',
])
const saveStub = createCaptureStub('Save', 'save-stub', [
  'postId',
  'postTitle',
  'showLabel',
  'variant',
  'size',
  'tone',
])

function mountInfo(
  tone?: 'default' | 'on-image',
  postOverrides: Partial<Post> = {},
  role: 'admin' | 'penulis' | 'subscriber' | null = null,
) {
  likeStub.received.value = {}
  saveStub.received.value = {}
  const pinia = createPinia()
  setActivePinia(pinia)
  if (role) {
    const auth = useAuthStore()
    auth.user = {
      ...post.author,
      id: role === 'admin' ? 'admin-1' : post.author.id,
      role,
    }
  }
  return mount(PostHeaderInfo, {
    props: { post: { ...post, ...postOverrides }, ...(tone ? { tone } : {}) },
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        LikeButton: likeStub.Stub,
        SaveButton: saveStub.Stub,
      },
    },
  })
}

describe('PostHeaderInfo', () => {
  it('renders author avatar link, name, formatted date and reading time', () => {
    const wrapper = mountInfo()
    expect(wrapper.findAll('a[href="/author/john"]').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('John Doe')
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

  it('forwards size="md" and tone props to LikeButton', () => {
    mountInfo()
    expect(likeStub.received.value.size).toBe('md')
    expect(likeStub.received.value.tone).toBe('default')
  })

  it('forwards size="md" and tone props to SaveButton', () => {
    mountInfo()
    expect(saveStub.received.value.size).toBe('md')
    expect(saveStub.received.value.tone).toBe('default')
  })

  it('forwards on-image tone to LikeButton and SaveButton', () => {
    mountInfo('on-image')
    expect(likeStub.received.value.tone).toBe('on-image')
    expect(saveStub.received.value.tone).toBe('on-image')
  })

  it('renders zero counts', () => {
    const wrapper = mountInfo(undefined, {
      commentCount: 0,
      viewCount: 0,
      likeCount: 0,
    })
    expect(wrapper.find('button[aria-label="Comments (0)"]').exists()).toBe(true)
    expect(wrapper.find('span[aria-label="Views: 0"]').text()).toBe('0')
  })

  it('applies on-image tone classes', () => {
    const wrapper = mountInfo('on-image')
    expect(wrapper.classes()).toContain('text-white')
  })

  it('keeps the author info left-aligned beside the actions', () => {
    const wrapper = mountInfo()
    expect(wrapper.classes()).toContain('justify-between')
    expect(wrapper.classes()).not.toContain('items-center')
  })

  it('renders the same header for every post type', () => {
    for (const postType of ['standard', 'video', 'audio', 'gallery'] as const) {
      const wrapper = mountInfo(undefined, { postType })
      expect(wrapper.text()).toContain('John Doe')
      expect(wrapper.find('button[aria-label^="Comments"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Share post"]').exists()).toBe(true)
    }
  })

  it('hides the actions menu for visitors who cannot edit', () => {
    const wrapper = mountInfo()
    expect(wrapper.find('button[aria-label="More actions"]').exists()).toBe(false)
  })

  it('opens an edit menu for the post author', async () => {
    const wrapper = mountInfo(undefined, {}, 'penulis')
    const trigger = wrapper.find('button[aria-label="More actions"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')

    const item = wrapper.find('[role="menuitem"]')
    expect(item.exists()).toBe(true)
    expect(item.text()).toContain('Edit post')
    expect(item.attributes('href')).toBe('/editor/p1')
  })

  it('closes the actions menu on Escape', async () => {
    const wrapper = mountInfo(undefined, {}, 'admin')
    await wrapper.find('button[aria-label="More actions"]').trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
