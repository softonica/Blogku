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
