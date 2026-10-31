import type { DataSource } from './source'
import {
  sanitizeEmail,
  sanitizeHtml,
  sanitizePlainText,
  sanitizeUrl,
} from '@/lib/sanitize'
import type {
  Category,
  CategoryInput,
  Comment,
  EditorSettings,
  ListMediaParams,
  ListPostsParams,
  MediaItem,
  OrphanCleanupResult,
  OrphanMediaItem,
  OrphanScanResult,
  Page,
  PageContent,
  Post,
  PostInput,
  ReactionType,
  Role,
  SiteSettings,
  Tag,
  TagInput,
  User,
  UserSocials,
} from './types'
import { DEFAULT_EDITOR_SETTINGS } from '@/lib/editor-defaults'
import { isVariantFileName, mediaRefKey } from '@/lib/media'
import { media as seedMedia } from './mock-data/media'
import {
  clampImageMaxDimension,
  clampImageQuality,
} from '@/lib/imageMeta'
import { comments as seedComments } from './mock-data/comments'
import { categories as seedCategories } from './mock-data/categories'
import { posts as seedPosts } from './mock-data/posts'
import { tags as seedTags } from './mock-data/tags'
import { users as seedUsers } from './mock-data/users'

const SESSION_KEY = 'ncmaz.mock.session.v1'
const POSTS_KEY = 'ncmaz.mock.posts.v1'
const CATEGORIES_KEY = 'ncmaz.mock.categories.v1'
const TAGS_KEY = 'ncmaz.mock.tags.v1'
const USERS_KEY = 'ncmaz.mock.users.v1'
const COMMENTS_KEY = 'ncmaz.mock.comments.v1'
const REACTIONS_KEY = 'ncmaz.mock.reactions.v1'
const SETTINGS_KEY = 'ncmaz.mock.settings.v1'
const PAGES_KEY = 'ncmaz.mock.pages.v1'
const EDITOR_SETTINGS_KEY = 'ncmaz.mock.editor-settings.v1'
const MEDIA_KEY = 'ncmaz.mock.media.v1'

interface ReactionRecord {
  postId: string
  userId: string
  type: ReactionType
}

const defaultSettings: SiteSettings = {
  siteName: 'Blogku',
  siteDescription: 'Modern magazine, editorial and community posts written with care.',
  contactEmail: 'contact@blogku.com',
  allowRegistration: true,
  footerText: '© 2026 Blogku — Safe · Fast · Simple digital editorial platform.',
  logo: '',
  logoDark: '',
  favicon: '/favicon.ico',
  allowedImageDomains: [
    'images.unsplash.com',
    'images.pexels.com',
    'res.cloudinary.com',
    'cdn.jsdelivr.net',
    'picsum.photos',
  ],
}

const defaultPages: Record<string, PageContent> = {
  about: {
    slug: 'about',
    title: 'About',
    body: '<p>Blogku is a modern editorial platform focused on technology, design, travel and culture. This is a phase 1 rewrite built with Vue 3 and a backend-ready data adapter.</p>',
  },
  contact: {
    slug: 'contact',
    title: 'Contact',
    body: '<p>Reach out to us and we will get back to you as soon as possible.</p><p>Email: contact@blogku.com</p>',
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    body: '<p>This privacy policy explains what information we collect and how we use it. In this phase 1 mock, all data stays in your browser.</p>',
  },
}

const isTest = import.meta.env.MODE === 'test'

async function wait(ms = isTest ? 0 : 50): Promise<void> {
  if (ms <= 0) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage can be unavailable in private mode */
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function compare(a: Post, b: Post, key: string): number {
  switch (key) {
    case 'likeCount':
      return a.likeCount - b.likeCount
    case 'viewCount':
      return a.viewCount - b.viewCount
    case 'title':
      return a.title.localeCompare(b.title)
    case 'createdAt':
    default:
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  }
}

function matches(post: Post, filter: ListPostsParams['filter']): boolean {
  if (!filter) return true
  if (filter.status && post.status !== filter.status) return false
  if (filter.featured !== undefined && post.featured !== filter.featured) {
    return false
  }
  if (filter.categorySlug) {
    if (!post.categories.some((c) => c.slug === filter.categorySlug)) return false
  }
  if (filter.tagSlug) {
    if (!post.tags.some((t) => t.slug === filter.tagSlug)) return false
  }
  if (filter.authorUsername && post.author.username !== filter.authorUsername) {
    return false
  }
  if (filter.ids && !filter.ids.includes(post.id)) return false
  if (filter.search) {
    const needle = filter.search.trim().toLowerCase()
    if (!needle) return true
    const haystack = [
      post.title,
      post.excerpt,
      post.content,
      post.author.name,
      ...post.categories.map((c) => c.name),
      ...post.tags.map((t) => t.name),
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  return true
}

export class MockSource implements DataSource {
  private posts: Post[]
  private categories: Category[]
  private tags: Tag[]
  private users: User[]
  private comments: Comment[]
  private reactions: ReactionRecord[]
  private settings: SiteSettings
  private pages: Record<string, PageContent>
  private editorSettings: EditorSettings
  private media: MediaItem[]

  constructor() {
    this.posts = readJson<Post[]>(POSTS_KEY, seedPosts)
    this.categories = readJson<Category[]>(CATEGORIES_KEY, seedCategories)
    this.tags = readJson<Tag[]>(TAGS_KEY, seedTags)
    this.users = readJson<User[]>(USERS_KEY, seedUsers)
    this.comments = readJson<Comment[]>(COMMENTS_KEY, seedComments)
    this.reactions = readJson<ReactionRecord[]>(REACTIONS_KEY, [])
    this.settings = readJson<SiteSettings>(SETTINGS_KEY, defaultSettings)
    this.pages = readJson<Record<string, PageContent>>(PAGES_KEY, defaultPages)
    this.editorSettings = {
      ...DEFAULT_EDITOR_SETTINGS,
      ...readJson<Partial<EditorSettings>>(EDITOR_SETTINGS_KEY, {}),
    }
    this.media = readJson<MediaItem[]>(MEDIA_KEY, seedMedia)
  }

  async listPosts(params: ListPostsParams): Promise<Page<Post>> {
    await wait()
    const page = Math.max(1, Math.floor(params.page || 1))
    const perPage = Math.min(100, Math.max(1, Math.floor(params.perPage || 10)))
    const sort = params.sort || '-createdAt'
    const descending = sort.startsWith('-')
    const key = descending ? sort.slice(1) : sort

    const filter = params.filter ?? {}
    const status = filter.status ?? 'published'
    const filtered = this.posts
      .filter((post) => post.status === status)
      .filter((post) => matches(post, { ...filter, status: undefined }))
      .sort((a, b) => (descending ? -1 : 1) * compare(a, b, key))

    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * perPage

    return {
      items: filtered.slice(start, start + perPage).map((post) => ({
        ...post,
        commentCount: this.comments.filter((c) => c.postId === post.id).length,
      })),
      page: safePage,
      perPage,
      totalItems,
      totalPages,
    }
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    await wait()
    const post = this.posts.find((item) => item.slug === slug)
    if (!post) return null
    return {
      ...post,
      commentCount: this.comments.filter((c) => c.postId === post.id).length,
    }
  }

  async getPostById(id: string): Promise<Post | null> {
    await wait()
    const post = this.posts.find((item) => item.id === id)
    if (!post) return null
    return {
      ...post,
      commentCount: this.comments.filter((c) => c.postId === post.id).length,
    }
  }

  async createPost(input: PostInput): Promise<Post> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    if (user.role !== 'admin' && user.role !== 'penulis') {
      throw new Error('FORBIDDEN')
    }

    const title = sanitizePlainText(input.title)
    if (!title) throw new Error('Title is required')
    const slug = (input.slug && slugify(input.slug)) || slugify(title) || `post-${Date.now()}`
    const excerpt = sanitizePlainText(input.excerpt)
    const content = sanitizeHtml(input.content)
    const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(words / 200))

    const selectedCategories = this.categories.filter((c) =>
      input.categoryIds?.includes(c.id),
    )
    const assignedCategories = selectedCategories.length
      ? selectedCategories
      : [this.categories[0] ?? {
          id: 'cat_general',
          name: 'General',
          slug: 'general',
          description: 'Posts',
          image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200',
          parentId: null,
        }]

    const selectedTags = this.tags.filter((t) => input.tagIds?.includes(t.id))

    const postType = input.postType ?? 'standard'

    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slug,
      title,
      excerpt,
      content,
      cover:
        (input.cover && sanitizeUrl(input.cover)) ||
        'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200',
      status: input.status ?? 'published',
      postType,
      videoUrl: input.videoUrl ? sanitizeUrl(input.videoUrl) : undefined,
      audioUrl: input.audioUrl ? sanitizeUrl(input.audioUrl) : undefined,
      gallery: input.gallery,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: user,
      categories: assignedCategories,
      tags: selectedTags,
      likeCount: 0,
      viewCount: 0,
      commentCount: 0,
      readingTime,
      featured: input.featured ?? false,
    }

    this.posts = [newPost, ...this.posts]
    writeJson(POSTS_KEY, this.posts)
    return newPost
  }

  async updatePost(id: string, input: Partial<PostInput>): Promise<Post> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')

    const index = this.posts.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('Post not found')
    const existing = this.posts[index]

    if (user.role !== 'admin' && existing.author.id !== user.id) {
      throw new Error('FORBIDDEN')
    }

    const title =
      input.title !== undefined
        ? sanitizePlainText(input.title) || existing.title
        : existing.title
    const slug = (input.slug && slugify(input.slug)) || existing.slug
    const excerpt =
      input.excerpt !== undefined
        ? sanitizePlainText(input.excerpt)
        : existing.excerpt
    const content =
      input.content !== undefined ? sanitizeHtml(input.content) : existing.content
    const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(words / 200))

    const categories = input.categoryIds
      ? this.categories.filter((c) => input.categoryIds?.includes(c.id))
      : existing.categories

    const tags = input.tagIds
      ? this.tags.filter((t) => input.tagIds?.includes(t.id))
      : existing.tags

    const updated: Post = {
      ...existing,
      title,
      slug,
      excerpt,
      content,
      cover: input.cover ? sanitizeUrl(input.cover) || existing.cover : existing.cover,
      status: input.status ?? existing.status,
      postType: input.postType ?? existing.postType ?? 'standard',
      videoUrl:
        input.videoUrl !== undefined ? sanitizeUrl(input.videoUrl) : existing.videoUrl,
      audioUrl:
        input.audioUrl !== undefined ? sanitizeUrl(input.audioUrl) : existing.audioUrl,
      gallery: input.gallery !== undefined ? input.gallery : existing.gallery,
      categories,
      tags,
      featured: input.featured !== undefined ? input.featured : existing.featured,
      readingTime,
      updatedAt: new Date().toISOString(),
    }

    this.posts = this.posts.map((p) => (p.id === id ? updated : p))
    writeJson(POSTS_KEY, this.posts)
    return updated
  }

  async deletePost(id: string): Promise<void> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')

    const target = this.posts.find((p) => p.id === id)
    if (!target) throw new Error('Post not found')

    if (user.role !== 'admin' && target.author.id !== user.id) {
      throw new Error('FORBIDDEN')
    }

    this.posts = this.posts.filter((p) => p.id !== id)
    writeJson(POSTS_KEY, this.posts)
  }

  async listCategories(): Promise<Category[]> {
    await wait()
    return this.categories
  }

  async saveCategory(input: CategoryInput): Promise<Category> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    if (user.role !== 'admin' && user.role !== 'penulis') {
      throw new Error('FORBIDDEN')
    }

    const name = sanitizePlainText(input.name)
    if (!name) throw new Error('Category name is required')
    const slug = (input.slug && slugify(input.slug)) || slugify(name)

    if (input.id) {
      const idx = this.categories.findIndex((c) => c.id === input.id)
      if (idx === -1) throw new Error('Category not found')
      const updated: Category = {
        ...this.categories[idx],
        name,
        slug,
        description:
          input.description !== undefined
            ? sanitizePlainText(input.description)
            : this.categories[idx].description,
        image:
          input.image !== undefined
            ? sanitizeUrl(input.image) || this.categories[idx].image
            : this.categories[idx].image,
        parentId: input.parentId !== undefined ? input.parentId : this.categories[idx].parentId,
      }
      this.categories = this.categories.map((c) => (c.id === input.id ? updated : c))
      writeJson(CATEGORIES_KEY, this.categories)
      return updated
    }

    const newCategory: Category = {
      id: `cat_${Date.now()}`,
      name,
      slug,
      description: input.description ? sanitizePlainText(input.description) : '',
      image: input.image ? sanitizeUrl(input.image) || '/covers/1.jpg' : '/covers/1.jpg',
      parentId: input.parentId ?? null,
    }
    this.categories = [...this.categories, newCategory]
    writeJson(CATEGORIES_KEY, this.categories)
    return newCategory
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    return this.saveCategory(input)
  }

  async updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const existing = this.categories.find((c) => c.id === id)
    if (!existing) throw new Error('Category not found')
    return this.saveCategory({
      id,
      name: input.name ?? existing.name,
      slug: input.slug ?? existing.slug,
      description: input.description ?? existing.description,
      image: input.image ?? existing.image,
      parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
    })
  }

  async deleteCategory(id: string): Promise<void> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    if (user.role !== 'admin') throw new Error('FORBIDDEN')

    const idx = this.categories.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Category not found')

    this.categories = this.categories.filter((c) => c.id !== id)
    writeJson(CATEGORIES_KEY, this.categories)
  }

  async listTags(): Promise<Tag[]> {
    await wait()
    return this.tags
  }

  async createTag(input: TagInput): Promise<Tag> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    if (user.role !== 'admin' && user.role !== 'penulis') throw new Error('FORBIDDEN')

    const name = sanitizePlainText(input.name)
    if (!name) throw new Error('Tag name is required')
    const slug = (input.slug && slugify(input.slug)) || slugify(name)

    const existing = this.tags.find((t) => t.slug === slug)
    if (existing) return existing

    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name,
      slug,
      postCount: 0,
    }
    this.tags = [...this.tags, newTag]
    writeJson(TAGS_KEY, this.tags)
    return newTag
  }

  async updateTag(id: string, input: Partial<TagInput>): Promise<Tag> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    if (user.role !== 'admin') throw new Error('FORBIDDEN')

    const idx = this.tags.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Tag not found')

    const name = input.name !== undefined ? sanitizePlainText(input.name) : this.tags[idx].name
    if (!name) throw new Error('Tag name is required')
    const slug = (input.slug && slugify(input.slug)) || slugify(name)

    const updated: Tag = {
      ...this.tags[idx],
      name,
      slug,
    }
    this.tags = this.tags.map((t) => (t.id === id ? updated : t))
    writeJson(TAGS_KEY, this.tags)
    return updated
  }

  async deleteTag(id: string): Promise<void> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    if (user.role !== 'admin') throw new Error('FORBIDDEN')

    const idx = this.tags.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Tag not found')

    this.tags = this.tags.filter((t) => t.id !== id)
    writeJson(TAGS_KEY, this.tags)
  }

  async listAuthors(): Promise<User[]> {
    await wait()
    return seedUsers
      .filter((user) => user.role !== 'subscriber')
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async listAuthorsFeatured(limit: number): Promise<User[]> {
    const authors = await this.listAuthors()
    return authors
      .slice()
      .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
      .slice(0, limit)
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await wait()
    return this.users.find((user) => user.username === username) ?? null
  }

  async listComments(postId: string): Promise<Comment[]> {
    await wait()
    return this.comments
      .filter((comment) => comment.postId === postId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
  }

  async listAllComments(): Promise<Comment[]> {
    await wait()
    return this.comments
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }

  async createComment(input: {
    postId: string
    content: string
  }): Promise<Comment> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    const content = sanitizePlainText(input.content)
    if (content.length < 1) throw new Error('Comment cannot be empty')
    if (content.length > 5000) throw new Error('Comment is too long')

    const post = this.posts.find((item) => item.id === input.postId)
    if (!post) throw new Error('Post not found')

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      postId: input.postId,
      author: user,
      content,
      createdAt: new Date().toISOString(),
      parentId: null,
    }
    this.comments = [...this.comments, comment]
    writeJson(COMMENTS_KEY, this.comments)
    return comment
  }

  async deleteComment(id: string): Promise<void> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')

    const target = this.comments.find((c) => c.id === id)
    if (!target) throw new Error('Comment not found')

    if (user.role !== 'admin' && target.author.id !== user.id) {
      throw new Error('FORBIDDEN')
    }

    this.comments = this.comments.filter((c) => c.id !== id)
    writeJson(COMMENTS_KEY, this.comments)
  }

  async toggleReaction(input: {
    postId: string
    type: ReactionType
  }): Promise<void> {
    await wait(40)
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')
    const index = this.reactions.findIndex(
      (item) =>
        item.postId === input.postId &&
        item.userId === user.id &&
        item.type === input.type,
    )
    if (index >= 0) {
      this.reactions = this.reactions.filter((_, i) => i !== index)
    } else {
      this.reactions = [...this.reactions, { ...input, userId: user.id }]
    }
    writeJson(REACTIONS_KEY, this.reactions)
  }

  async login(username: string, password: string): Promise<User> {
    await wait()
    const identifier = username.trim().toLowerCase()
    const user = this.users.find(
      (item) =>
        item.username.toLowerCase() === identifier ||
        item.email.toLowerCase() === identifier,
    )
    const isValidPass =
      (user?.username === 'demo' && (password === 'demo' || password === 'password')) ||
      password === 'password'
    if (!user || !isValidPass) {
      throw new Error('Invalid username or password')
    }
    writeJson(SESSION_KEY, { userId: user.id })
    return user
  }

  async register(input: {
    name: string
    username: string
    email: string
    password: string
  }): Promise<User> {
    await wait()
    const name = sanitizePlainText(input.name)
    const username = sanitizePlainText(input.username).toLowerCase()
    if (!name || !username || !input.email || !input.password) {
      throw new Error('Invalid registration data')
    }
    if (this.users.some((u) => u.username.toLowerCase() === username)) {
      throw new Error('Username is already taken')
    }
    const user: User = {
      id: `local_${Date.now()}`,
      username,
      name,
      email: sanitizeEmail(input.email),
      avatar:
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=256&h=256&q=80',
      bio: 'New member.',
      role: 'subscriber',
      postCount: 0,
    }
    this.users = [...this.users, user]
    writeJson(USERS_KEY, this.users)
    writeJson(SESSION_KEY, { userId: user.id })
    return user
  }

  async requestPasswordReset(email: string): Promise<void> {
    await wait()
    void email
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await wait()
    void token
    void newPassword
  }

  async changePassword(input: {
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    await wait()
    const current = this.currentUser()
    if (!current) throw new Error('LOGIN_REQUIRED')

    const mockPasswordValid =
      (current.username === 'demo' &&
        (input.currentPassword === 'demo' || input.currentPassword === 'password')) ||
      input.currentPassword === 'password'
    if (!mockPasswordValid) {
      throw new Error('Current password is incorrect')
    }
    void input.newPassword
  }

  async logout(): Promise<void> {
    await wait(40)
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }

  currentUser(): User | null {
    const session = readJson<{ userId?: string } | null>(SESSION_KEY, null)
    if (!session?.userId) return null
    return this.users.find((user) => user.id === session.userId) ?? null
  }

  async listUsers(): Promise<User[]> {
    await wait()
    return this.users
  }

  async updateUserRole(userId: string, role: Role): Promise<User> {
    await wait()
    const current = this.currentUser()
    if (!current || current.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }

    const idx = this.users.findIndex((u) => u.id === userId)
    if (idx === -1) throw new Error('User not found')

    const updated: User = { ...this.users[idx], role }
    this.users = this.users.map((u) => (u.id === userId ? updated : u))
    writeJson(USERS_KEY, this.users)
    return updated
  }

  async getSiteSettings(): Promise<SiteSettings> {
    await wait()
    return this.settings
  }

  async updateSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
    await wait()
    const current = this.currentUser()
    if (!current || current.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }

    const sanitizedInput: Partial<SiteSettings> = { ...input }
    if (input.siteName !== undefined) sanitizedInput.siteName = sanitizePlainText(input.siteName)
    if (input.siteDescription !== undefined) {
      sanitizedInput.siteDescription = sanitizePlainText(input.siteDescription)
    }
    if (input.contactEmail !== undefined) {
      sanitizedInput.contactEmail = sanitizeEmail(input.contactEmail)
    }
    if (input.footerText !== undefined) {
      sanitizedInput.footerText = sanitizePlainText(input.footerText)
    }
    if (input.logo !== undefined) {
      sanitizedInput.logo = sanitizeUrl(input.logo)
    }
    if (input.logoDark !== undefined) {
      sanitizedInput.logoDark = sanitizeUrl(input.logoDark)
    }
    if (input.favicon !== undefined) {
      sanitizedInput.favicon = sanitizeUrl(input.favicon)
    }
    if (input.allowedImageDomains !== undefined) {
      sanitizedInput.allowedImageDomains = input.allowedImageDomains
        .map((d) => sanitizePlainText(d).toLowerCase())
        .filter(Boolean)
    }

    this.settings = { ...this.settings, ...sanitizedInput }
    writeJson(SETTINGS_KEY, this.settings)
    return this.settings
  }

  async getPage(slug: string): Promise<PageContent | null> {
    await wait()
    const page = this.pages[slug]
    if (!page) return null
    return { ...page }
  }

  async updatePage(
    slug: string,
    input: { title?: string; body?: string },
  ): Promise<PageContent> {
    await wait()
    const current = this.currentUser()
    if (!current || current.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }
    const existing = this.pages[slug]
    if (!existing) throw new Error('Page not found')

    const next: PageContent = {
      ...existing,
      title:
        input.title !== undefined ? sanitizePlainText(input.title) : existing.title,
      body:
        input.body !== undefined ? sanitizeHtml(input.body) : existing.body,
    }
    this.pages = { ...this.pages, [slug]: next }
    writeJson(PAGES_KEY, this.pages)
    return { ...next }
  }

  async getEditorSettings(): Promise<EditorSettings> {
    await wait()
    return { ...this.editorSettings }
  }

  async updateEditorSettings(input: Partial<EditorSettings>): Promise<EditorSettings> {
    await wait()
    const current = this.currentUser()
    if (!current || current.role !== 'admin') {
      throw new Error('FORBIDDEN')
    }
    const sanitized: Partial<EditorSettings> = { ...input }
    if (input.placeholder !== undefined) {
      sanitized.placeholder = sanitizePlainText(input.placeholder)
    }
    if (typeof input.maxContentLength === 'number') {
      sanitized.maxContentLength = Math.max(0, Math.floor(input.maxContentLength))
    }
    if (typeof input.maxImageUploadSize === 'number') {
      sanitized.maxImageUploadSize = Math.max(0, Math.floor(input.maxImageUploadSize))
    }
    if (input.imageMaxDimension !== undefined) {
      sanitized.imageMaxDimension = clampImageMaxDimension(input.imageMaxDimension)
    }
    if (input.imageQuality !== undefined) {
      sanitized.imageQuality = clampImageQuality(input.imageQuality)
    }
    this.editorSettings = { ...this.editorSettings, ...sanitized }
    writeJson(EDITOR_SETTINGS_KEY, this.editorSettings)
    return { ...this.editorSettings }
  }

  async updateUserProfile(input: {
    name?: string
    bio?: string
    avatar?: string
    coverBanner?: string
    socials?: UserSocials
  }): Promise<User> {
    await wait()
    const current = this.currentUser()
    if (!current) throw new Error('LOGIN_REQUIRED')

    const idx = this.users.findIndex((u) => u.id === current.id)
    if (idx === -1) throw new Error('User not found')

    const sanitizedInput: typeof input = {}
    if (input.name !== undefined) sanitizedInput.name = sanitizePlainText(input.name)
    if (input.bio !== undefined) sanitizedInput.bio = sanitizePlainText(input.bio)
    if (input.avatar !== undefined) sanitizedInput.avatar = sanitizeUrl(input.avatar)
    if (input.coverBanner !== undefined) sanitizedInput.coverBanner = sanitizeUrl(input.coverBanner)
    if (input.socials !== undefined) {
      const socials: UserSocials = {}
      for (const [key, value] of Object.entries(input.socials)) {
        const trimmed = typeof value === 'string' ? value.trim() : ''
        if (!trimmed) continue
        const clean = sanitizeUrl(trimmed)
        if (clean) socials[key as keyof UserSocials] = clean
      }
      sanitizedInput.socials = socials
    }

    const updated: User = { ...this.users[idx], ...sanitizedInput }
    this.users = this.users.map((u) => (u.id === current.id ? updated : u))
    writeJson(USERS_KEY, this.users)
    return updated
  }

  async uploadFile(file: File): Promise<{ url: string; name: string }> {
    await wait()
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
    if (!allowedMime.includes(file.type)) {
      throw new Error('Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.')
    }
    const maxSizeBytes = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxSizeBytes) {
      throw new Error('File size exceeds the 5 MB limit.')
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        const record: MediaItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url,
          name: file.name,
          ownerId: this.currentUser()?.id,
          createdAt: new Date().toISOString(),
        }
        this.media = [record, ...this.media]
        writeJson(MEDIA_KEY, this.media)
        resolve({ url, name: file.name })
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  async listMedia(params: ListMediaParams): Promise<Page<MediaItem>> {
    await wait()
    const page = Math.max(1, Math.floor(params.page ?? 1) || 1)
    const perPage = Math.min(100, Math.max(1, Math.floor(params.perPage ?? 48) || 48))
    const search = params.search?.trim().toLowerCase() ?? ''

    const filtered = this.media
      .filter((item) => !isVariantFileName(item.name))
      .filter((item) => !search || item.name.toLowerCase().includes(search))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
    const start = (page - 1) * perPage

    return {
      items: filtered.slice(start, start + perPage),
      page,
      perPage,
      totalItems,
      totalPages,
    }
  }

  private referencedMediaRefs(): Set<string> {
    const refs = new Set<string>()
    const add = (value: string | undefined): void => {
      if (value) refs.add(mediaRefKey(value))
    }
    const addHtml = (html: string): void => {
      for (const m of html.matchAll(/src="([^"]+)"/gi)) add(m[1])
    }

    for (const post of this.posts) {
      add(post.cover)
      for (const url of post.gallery ?? []) add(url)
      addHtml(post.content)
    }
    for (const user of this.users) {
      add(user.avatar)
      add(user.coverBanner)
    }
    for (const category of this.categories) add(category.image)
    for (const page of Object.values(this.pages)) addHtml(page.body)
    add(this.settings.logo)
    add(this.settings.logoDark)
    add(this.settings.favicon)

    return refs
  }

  private orphanMediaItems(): OrphanMediaItem[] {
    const refs = this.referencedMediaRefs()
    const items: OrphanMediaItem[] = []
    for (const media of this.media) {
      if (refs.has(mediaRefKey(media.url))) continue
      items.push({
        id: media.id,
        url: media.url,
        name: media.name,
        createdAt: media.createdAt,
        refCount: 0,
        variant: isVariantFileName(media.name),
      })
    }
    return items
  }

  async deleteMedia(id: string): Promise<void> {
    await wait()
    const user = this.currentUser()
    if (!user) throw new Error('LOGIN_REQUIRED')

    const idx = this.media.findIndex((media) => media.id === id)
    if (idx === -1) throw new Error('Media not found')

    const target = this.media[idx]
    const isOwner = target.ownerId !== undefined && target.ownerId === user.id
    if (user.role !== 'admin' && !isOwner) {
      throw new Error('FORBIDDEN')
    }

    this.media = this.media.filter((media) => media.id !== id)
    writeJson(MEDIA_KEY, this.media)
  }

  async listOrphanMedia(): Promise<OrphanScanResult> {
    await wait()
    const items = this.orphanMediaItems()
    return { total: items.length, items }
  }

  async cleanupOrphanMedia(): Promise<OrphanCleanupResult> {
    await wait()
    const ids = new Set(this.orphanMediaItems().map((item) => item.id))
    if (ids.size === 0) return { deleted: 0 }
    const before = this.media.length
    this.media = this.media.filter((item) => !ids.has(item.id))
    writeJson(MEDIA_KEY, this.media)
    return { deleted: before - this.media.length }
  }

  async trackView(postId: string): Promise<void> {
    if (!postId) return
    this.posts = this.posts.map((p) =>
      p.id === postId ? { ...p, viewCount: p.viewCount + 1 } : p,
    )
    writeJson(POSTS_KEY, this.posts)
  }
}
