import { describe, expect, it } from 'vitest'
import { can, canManagePost } from './permissions'

describe('can', () => {
  it('only lets admins manage settings, users and moderation', () => {
    for (const action of ['manage_settings', 'manage_taxonomies', 'manage_users', 'moderate_comment'] as const) {
      expect(can('admin', action)).toBe(true)
      expect(can('penulis', action)).toBe(false)
      expect(can('subscriber', action)).toBe(false)
      expect(can(null, action)).toBe(false)
    }
  })

  it('lets authors and admins write posts', () => {
    expect(can('admin', 'write_post')).toBe(true)
    expect(can('penulis', 'write_post')).toBe(true)
    expect(can('subscriber', 'write_post')).toBe(false)
    expect(can(null, 'write_post')).toBe(false)
  })

  it('requires a signed in user to comment or react', () => {
    expect(can('subscriber', 'comment')).toBe(true)
    expect(can('subscriber', 'react')).toBe(true)
    expect(can(null, 'comment')).toBe(false)
    expect(can(null, 'react')).toBe(false)
  })
})

describe('canManagePost', () => {
  it('lets admins manage any post', () => {
    expect(canManagePost('admin', 'user_1', 'user_2')).toBe(true)
  })

  it('lets authors manage only their own posts', () => {
    expect(canManagePost('penulis', 'user_1', 'user_1')).toBe(true)
    expect(canManagePost('penulis', 'user_1', 'user_2')).toBe(false)
  })

  it('never lets subscribers manage posts', () => {
    expect(canManagePost('subscriber', 'user_1', 'user_1')).toBe(false)
    expect(canManagePost(null, 'user_1', 'user_1')).toBe(false)
  })
})
