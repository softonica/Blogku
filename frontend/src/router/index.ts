import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { can } from '@/lib/permissions'
import HomePage from '@/pages/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: { title: 'Home' },
    },
    {
      path: '/post/:slug',
      name: 'post',
      component: () => import('@/pages/PostPage.vue'),
      meta: { title: 'Story' },
    },
    {
      path: '/category/:slug',
      name: 'category',
      component: () => import('@/pages/CategoryPage.vue'),
      meta: { title: 'Category' },
    },
    {
      path: '/tag/:slug',
      name: 'tag',
      component: () => import('@/pages/TagPage.vue'),
      meta: { title: 'Tag' },
    },
    {
      path: '/author/:username',
      name: 'author',
      component: () => import('@/pages/AuthorPage.vue'),
      meta: { title: 'Author' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/pages/SearchPage.vue'),
      meta: { title: 'Search' },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { title: 'Sign in' },
    },
    {
      path: '/sign-up',
      name: 'sign-up',
      component: () => import('@/pages/SignUpPage.vue'),
      meta: { title: 'Create account' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/pages/ResetPasswordPage.vue'),
      meta: { title: 'Reset password' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/DashboardPage.vue'),
      meta: {
        title: 'Dashboard',
        requiresAuth: true,
        permission: 'write_post',
      },
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/pages/EditorPage.vue'),
      meta: {
        title: 'New story',
        requiresAuth: true,
        permission: 'write_post',
      },
    },
    {
      path: '/submission',
      name: 'submission',
      component: () => import('@/pages/EditorPage.vue'),
      meta: {
        title: 'New submission',
        requiresAuth: true,
        permission: 'write_post',
      },
    },
    {
      path: '/submission/:id',
      name: 'submission-edit',
      component: () => import('@/pages/EditorPage.vue'),
      meta: {
        title: 'Edit submission',
        requiresAuth: true,
        permission: 'write_post',
      },
    },
    {
      path: '/editor/:id',
      name: 'editor-edit',
      component: () => import('@/pages/EditorPage.vue'),
      meta: {
        title: 'Edit story',
        requiresAuth: true,
        permission: 'write_post',
      },
    },
    {
      path: '/bookmarks',
      name: 'bookmarks',
      component: () => import('@/pages/BookmarksPage.vue'),
      meta: {
        title: 'Bookmarks',
      },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/ProfilePage.vue'),
      meta: {
        title: 'Profile',
        requiresAuth: true,
      },
    },
    {
      path: '/admin/settings',
      name: 'admin-settings',
      component: () => import('@/pages/admin/AdminSettingsPage.vue'),
      meta: {
        title: 'Site Settings',
        requiresAuth: true,
        permission: 'manage_settings',
      },
    },
    {
      path: '/admin/taxonomies',
      name: 'admin-taxonomies',
      component: () => import('@/pages/admin/AdminTaxonomiesPage.vue'),
      meta: {
        title: 'Categories & Tags',
        requiresAuth: true,
        permission: 'manage_taxonomies',
      },
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/pages/admin/AdminUsersPage.vue'),
      meta: {
        title: 'User Management',
        requiresAuth: true,
        permission: 'manage_users',
      },
    },
    {
      path: '/admin/moderation',
      name: 'admin-moderation',
      component: () => import('@/pages/admin/AdminModerationPage.vue'),
      meta: {
        title: 'Comment Moderation',
        requiresAuth: true,
        permission: 'moderate_comment',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { title: 'Page not found' },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // Check general authentication requirement
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Check specific permission requirements
  if (to.meta.permission) {
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (!can(auth.user?.role, to.meta.permission)) {
      if (can(auth.user?.role, 'write_post')) {
        return { name: 'dashboard' }
      }
      return { name: 'profile' }
    }
  }

  // Authenticated users should not revisit login / sign up pages
  const authPages = ['login', 'sign-up', 'reset-password']
  if (authPages.includes(String(to.name)) && auth.isAuthenticated) {
    return can(auth.user?.role, 'write_post')
      ? { name: 'dashboard' }
      : { name: 'profile' }
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} — Ncmaz`
    : 'Ncmaz — Magazine & Blog'
})

export default router
