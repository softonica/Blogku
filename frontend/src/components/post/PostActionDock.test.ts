import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Post } from '@/api/types'
import PostActionDock from './PostActionDock.vue'

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

const headings = [
  { id: 'first-part', level: 2 as const, text: 'First part' },
  { id: 'nested-part', level: 3 as const, text: 'Nested part' },
]

function mountDock(props: Record<string, unknown> = {}) {
  return mount(PostActionDock, {
    props: { post, headings, progress: 42, showBackToTop: false, ...props },
    global: {
      plugins: [createPinia()],
      stubs: {
        LikeButton: { template: '<button class="like-stub">Like</button>' },
        SaveButton: { template: '<button class="save-stub">Save</button>' },
      },
    },
  })
}

describe('PostActionDock', () => {
  it('shows reading progress while reading the article', () => {
    const wrapper = mountDock()
    expect(wrapper.text()).toContain('42%')
    expect(wrapper.find('button[aria-label="Back to top"]').exists()).toBe(false)
  })

  it('swaps progress for a back-to-top control at the comments section', () => {
    const wrapper = mountDock({ showBackToTop: true })
    expect(wrapper.text()).not.toContain('42%')
    expect(wrapper.find('button[aria-label="Back to top"]').exists()).toBe(true)
  })

  it('scrolls to the top when back-to-top is clicked', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const wrapper = mountDock({ showBackToTop: true })

    await wrapper.find('button[aria-label="Back to top"]').trigger('click')

    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('opens the table of contents and lists the headings', async () => {
    const wrapper = mountDock()
    const trigger = wrapper.find('button[aria-label="Table of contents"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    const panel = wrapper.find('[role="dialog"]')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('On this page')
    expect(panel.text()).toContain('First part')
    expect(panel.text()).toContain('Nested part')
  })

  it('closes the table of contents on Escape', async () => {
    const wrapper = mountDock()
    await wrapper.find('button[aria-label="Table of contents"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('hides the table of contents button when there are no headings', () => {
    const wrapper = mountDock({ headings: [] })
    expect(wrapper.find('button[aria-label="Table of contents"]').exists()).toBe(false)
  })
})
