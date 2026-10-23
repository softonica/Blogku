export type PostStatus = 'published' | 'draft'
export type ReactionType = 'like' | 'dislike' | 'favorite'
export type Role = 'admin' | 'penulis' | 'subscriber'
export type PostType = 'standard' | 'video' | 'audio' | 'gallery'

export interface User {
  id: string
  username: string
  name: string
  email: string
  avatar: string
  bio: string
  role: Role
  postCount?: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  image: string
  parentId: string | null
  postCount?: number
}

export interface Tag {
  id: string
  name: string
  slug: string
  postCount?: number
}

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover: string
  status: PostStatus
  postType?: PostType
  videoUrl?: string
  audioUrl?: string
  gallery?: string[]
  createdAt: string
  updatedAt: string
  author: User
  categories: Category[]
  tags: Tag[]
  likeCount: number
  viewCount: number
  commentCount: number
  readingTime: number
  featured: boolean
}

export interface Comment {
  id: string
  postId: string
  author: User
  content: string
  createdAt: string
  parentId: string | null
}

export interface Page<T> {
  items: T[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface PostFilter {
  categorySlug?: string
  tagSlug?: string
  authorUsername?: string
  search?: string
  status?: PostStatus
  featured?: boolean
  ids?: string[]
}

export interface ListPostsParams {
  page: number
  perPage: number
  sort?: string
  filter?: PostFilter
}

export interface PostInput {
  title: string
  slug?: string
  excerpt: string
  content: string
  cover?: string
  status?: PostStatus
  postType?: PostType
  videoUrl?: string
  audioUrl?: string
  gallery?: string[]
  categoryIds?: string[]
  tagIds?: string[]
  featured?: boolean
}

export interface CategoryInput {
  id?: string
  name: string
  slug?: string
  description?: string
  image?: string
  parentId?: string | null
}

export interface TagInput {
  id?: string
  name: string
  slug?: string
}

export interface SiteSettings {
  siteName: string
  siteDescription: string
  contactEmail: string
  allowRegistration: boolean
  footerText: string
  logo?: string
  logoDark?: string
  favicon?: string
  allowedImageDomains?: string[]
}
