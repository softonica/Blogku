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

  it('applies the Ncmaz md count spacing for compact variant', () => {
    setActivePinia(createPinia())
    const wrapper = mountLike({ variant: 'compact', size: 'md' })
    expect(wrapper.html()).toContain('min-w-4.5')
  })

  it('applies on-image tone classes to compact variant', () => {
    setActivePinia(createPinia())
    const wrapper = mountLike({ variant: 'compact', tone: 'on-image' })
    expect(wrapper.classes()).toContain('text-white')
  })
})
