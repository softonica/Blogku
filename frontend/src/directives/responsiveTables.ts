import type { Directive } from 'vue'

export const TABLE_SCROLL_CLASS = 'nc-table-scroll'

/**
 * Wraps every table inside `root` with a horizontal scroll container so wide
 * tables stay usable on small screens (same pattern as Ncmaz's
 * `wp-block-table` figure). Idempotent: tables already wrapped are skipped.
 */
export function wrapResponsiveTables(root: HTMLElement | null | undefined): number {
  if (!root) return 0

  let wrapped = 0
  root.querySelectorAll('table').forEach((table) => {
    const parent = table.parentElement
    if (!parent || parent.classList.contains(TABLE_SCROLL_CLASS)) return

    const wrapper = document.createElement('div')
    wrapper.className = TABLE_SCROLL_CLASS
    parent.insertBefore(wrapper, table)
    wrapper.appendChild(table)
    wrapped += 1
  })

  return wrapped
}

/**
 * `v-responsive-tables` — applied to `v-html` containers. Runs on mount and
 * whenever the rendered content changes.
 */
export const vResponsiveTables: Directive<HTMLElement> = {
  mounted(el) {
    wrapResponsiveTables(el)
  },
  updated(el) {
    wrapResponsiveTables(el)
  },
}
