import 'vue-router'
import type { Permission } from '@/lib/permissions'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    permission?: Permission
  }
}

export {}
