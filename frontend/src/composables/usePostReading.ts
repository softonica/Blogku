import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export interface TocHeading {
  id: string
  level: 2 | 3 | 4
  text: string
}

export interface UsePostReadingOptions {
  articleRef: Ref<HTMLElement | null>
  commentsId?: string
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'section'
}

/**
 * Tracks reading progress through a post article and exposes the headings
 * needed by the "On this page" table of contents. Once the comments section
 * enters the viewport, `showBackToTop` flips true so the action dock can swap
 * its progress chip for a back-to-top control.
 */
export function usePostReading(options: UsePostReadingOptions) {
  const commentsId = options.commentsId ?? 'comments'
  const headings = ref<TocHeading[]>([])
  const progress = ref(0)
  const showBackToTop = ref(false)

  function collectHeadings(): void {
    const article = options.articleRef.value
    if (!article) {
      headings.value = []
      return
    }

    const used = new Set<string>()
    const items: TocHeading[] = []

    article.querySelectorAll<HTMLElement>('h2, h3, h4').forEach((element) => {
      const text = (element.textContent ?? '').trim()
      if (!text) return

      const base = element.id || slugify(text)
      let id = base
      let suffix = 2
      while (used.has(id)) {
        id = `${base}-${suffix}`
        suffix += 1
      }
      used.add(id)
      if (element.id !== id) element.id = id

      const level = Number(element.tagName.slice(1)) as 2 | 3 | 4
      items.push({ id, level, text })
    })

    headings.value = items
  }

  function update(): void {
    const article = options.articleRef.value
    if (!article) {
      progress.value = 0
    } else {
      const top = article.getBoundingClientRect().top + window.scrollY
      const scrollable = Math.max(1, article.offsetHeight - window.innerHeight)
      const value = ((window.scrollY - top) / scrollable) * 100
      progress.value = Math.min(100, Math.max(0, Math.round(value)))
    }

    const comments = document.getElementById(commentsId)
    showBackToTop.value = comments
      ? comments.getBoundingClientRect().top <= window.innerHeight
      : false
  }

  function onScroll(): void {
    update()
  }

  function onResize(): void {
    update()
  }

  function backToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  onMounted(() => {
    collectHeadings()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
  })

  return {
    headings,
    progress,
    showBackToTop,
    collectHeadings,
    update,
    backToTop,
  }
}
