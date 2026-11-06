import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PostImage from './PostImage.vue'

describe('PostImage', () => {
  it('renders the image when src is provided', () => {
    const wrapper = mount(PostImage, {
      props: { src: 'https://x.test/a.jpg', alt: 'Article cover' },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://x.test/a.jpg')
    expect(wrapper.text()).not.toContain('No image')
  })

  it('renders a no-image placeholder when src is empty', () => {
    const wrapper = mount(PostImage, {
      props: { src: '', alt: 'Article cover' },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('No image')
  })
})
