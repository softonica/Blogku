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

function mountInfo(tone?: 'default' | 'on-image') {
  return mount(PostHeaderInfo, {
    props: { post, ...(tone ? { tone } : {}) },
    global: {
      stubs: {
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
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
