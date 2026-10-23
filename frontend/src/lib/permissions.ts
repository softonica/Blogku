import type { Role } from '@/api/types'

export type Permission =
  | 'manage_settings'
  | 'manage_taxonomies'
  | 'manage_users'
  | 'moderate_comment'
  | 'write_post'
  | 'comment'
  | 'react'

export function can(role: Role | null | undefined, action: Permission): boolean {
  switch (action) {
    case 'manage_settings':
    case 'manage_taxonomies':
    case 'manage_users':
    case 'moderate_comment':
      return role === 'admin'
    case 'write_post':
      return role === 'admin' || role === 'penulis'
    case 'comment':
    case 'react':
      return role != null
  }
}

export function canManagePost(
  role: Role | null | undefined,
  userId: string | undefined,
  authorId: string,
): boolean {
  if (role === 'admin') return true
  return role === 'penulis' && userId != null && userId === authorId
}
