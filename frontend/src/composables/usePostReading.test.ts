import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { usePostReading } from './usePostReading'

type Api = ReturnType<typeof usePostReading>

function mountReading(article: HTMLElement | null) {
  let api: Api | null = null
  const Comp = defineComponent({
    setup() {
      const articleRef = ref<HTMLElement | null>(article)
      api = usePostReading({ articleRef })
      return () => h('div')
    },
  })
  const wrapper = mount(Comp, { attachTo: document.body })
  return { api: api as unknown as Api, wrapper }
}

function makeArticle(html: string): HTMLElement {
  const article = document.createElement('article')
  article.innerHTML = html
  document.body.appendChild(article)
  return article
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('usePostReading', () => {
  it('collects h2/h3/h4 and assigns unique slug ids', () => {
    const article = makeArticle(
      '<h2>Hello World</h2><h3>Hello World</h3><h2>Code should look okay</h2><h4>Deep Dive</h4>',
    )
    const { api, wrapper } = mountReading(article)

    api.collectHeadings()

    expect(api.headings.value.map((item) => item.id)).toEqual([
      'hello-world',
      'hello-world-2',
      'code-should-look-okay',
      'deep-dive',
    ])
    expect(api.headings.value.map((item) => item.level)).toEqual([2, 3, 2, 4])
    const headings = article.querySelectorAll('h2, h3, h4')
    expect(headings[0].id).toBe('hello-world')
    expect(headings[1].id).toBe('hello-world-2')
    wrapper.unmount()
  })

  it('clamps reading progress between 0 and 100', () => {
    const article = makeArticle('<p>Body</p>')
    Object.defineProperty(article, 'offsetHeight', { value: 1300, configurable: true })
    vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
      top: -100,
      bottom: 1200,
      left: 0,
      right: 0,
      width: 0,
      height: 1300,
      x: 0,
      y: -100,
      toJSON: () => ({}),
    } as DOMRect)
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })

    const { api, wrapper } = mountReading(article)
    api.update()
    expect(api.progress.value).toBe(20)

    vi.spyOn(article, 'getBoundingClientRect').mockReturnValue({
      top: -10000,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 1300,
      x: 0,
      y: -10000,
      toJSON: () => ({}),
    } as DOMRect)
    api.update()
    expect(api.progress.value).toBe(100)

    wrapper.unmount()
  })

  it('shows back-to-top once the comments section enters the viewport', () => {
    const article = makeArticle('<p>Body</p>')
    const comments = document.createElement('section')
    comments.id = 'comments'
    document.body.appendChild(comments)
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })

    const commentRect = vi
      .spyOn(comments, 'getBoundingClientRect')
      .mockReturnValue({ top: 700, bottom: 900 } as DOMRect)

    const { api, wrapper } = mountReading(article)

    api.update()
    expect(api.showBackToTop.value).toBe(true)

    commentRect.mockReturnValue({ top: 900, bottom: 1200 } as DOMRect)
    api.update()
    expect(api.showBackToTop.value).toBe(false)

    wrapper.unmount()
  })

  it('scrolls to the top smoothly', () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { api, wrapper } = mountReading(makeArticle('<p>Body</p>'))

    api.backToTop()

    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    wrapper.unmount()
  })
})
