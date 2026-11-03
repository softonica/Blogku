import { describe, expect, it } from 'vitest'
import { TABLE_SCROLL_CLASS, wrapResponsiveTables } from './responsiveTables'

function makeRoot(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('wrapResponsiveTables', () => {
  it('wraps each table in a scroll container', () => {
    const root = makeRoot('<p>x</p><table><tbody><tr><td>a</td></tr></tbody></table>')

    expect(wrapResponsiveTables(root)).toBe(1)

    const wrapper = root.querySelector(`.${TABLE_SCROLL_CLASS}`)
    expect(wrapper).not.toBeNull()
    expect(wrapper?.querySelector('table')).not.toBeNull()
  })

  it('does not wrap the same table twice', () => {
    const root = makeRoot('<table><tbody><tr><td>a</td></tr></tbody></table>')

    expect(wrapResponsiveTables(root)).toBe(1)
    expect(wrapResponsiveTables(root)).toBe(0)
    expect(root.querySelectorAll(`.${TABLE_SCROLL_CLASS}`)).toHaveLength(1)
  })

  it('wraps multiple tables', () => {
    const root = makeRoot(
      '<table><tbody><tr><td>a</td></tr></tbody></table><table><tbody><tr><td>b</td></tr></tbody></table>',
    )

    expect(wrapResponsiveTables(root)).toBe(2)
    expect(root.querySelectorAll(`.${TABLE_SCROLL_CLASS}`)).toHaveLength(2)
  })

  it('handles a missing root', () => {
    expect(wrapResponsiveTables(null)).toBe(0)
  })
})
