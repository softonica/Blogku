import { describe, expect, it } from 'vitest'
import { can } from '@/lib/permissions'
import router from './index'

const adminRoutes = router
  .getRoutes()
  .filter((route) => route.path === '/admin' || route.path.startsWith('/admin/'))

describe('admin route access policy', () => {
  it('registers the admin area and its child pages', () => {
    expect(adminRoutes.length).toBeGreaterThanOrEqual(8)
  })

  it('marks every /admin path as adminOnly', () => {
    for (const route of adminRoutes) {
      expect(router.resolve(route.path).meta.adminOnly, route.path).toBe(true)
    }
  })

  it('never grants an admin route permission to penulis or subscriber', () => {
    for (const route of adminRoutes) {
      const meta = router.resolve(route.path).meta
      if (!meta.permission) continue
      expect(can('penulis', meta.permission), route.path).toBe(false)
      expect(can('subscriber', meta.permission), route.path).toBe(false)
      expect(can('admin', meta.permission), route.path).toBe(true)
    }
  })

  it('keeps the admin-only guard off public and author pages', () => {
    expect(router.resolve('/').meta.adminOnly).toBeUndefined()
    expect(router.resolve('/dashboard').meta.adminOnly).toBeUndefined()
    expect(router.resolve('/profile').meta.adminOnly).toBeUndefined()
  })
})
