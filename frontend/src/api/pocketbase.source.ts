import type PocketBase from 'pocketbase'
import { getPb } from '@/lib/pb'
import { slugify } from '@/lib/format'
import { sanitizeEmail, sanitizeHtml, sanitizePlainText, sanitizeUrl } from '@/lib/sanitize'
import { clampImageMaxDimension, clampImageQuality } from '@/lib/imageMeta'
import { getStatus, toAppError } from './errors'
import type { DataSource } from './source'
import type {
  Category,
  CategoryInput,
  Comment,
  EditorSettings,
  ListMediaParams,
  ListPostsParams,
  MediaItem,
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

type PbRecord = Record<string, unknown> & { id: string }

interface PbUserRecord extends PbRecord {
  username?: string
  name?: string
  email?: string
  avatar?: string | null
  bio?: string
  role?: string
  postCount?: number
  coverBanner?: string | null
  socials?: UserSocials
}

interface PbCategoryRecord extends PbRecord {
  name?: string
  slug?: string
  description?: string
  image?: string | null
  parent?: string | PbCategoryRecord | null
  postCount?: number
}

interface PbTagRecord extends PbRecord {
  name?: string
  slug?: string
  postCount?: number
}

interface PbPostRecord extends PbRecord {
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  cover?: string | null
  status?: string
  postType?: string
  postStyle?: string
  videoUrl?: string | null
  audioUrl?: string | null
  gallery?: string[] | null
  author?: string | PbUserRecord
  categories?: string[]
  tags?: string[]
  featured?: boolean
  readingTime?: number
  likeCount?: number
  viewCount?: number
  commentCount?: number
  created?: string
  updated?: string
  expand?: { author?: PbUserRecord; categories?: PbCategoryRecord[]; tags?: PbTagRecord[] }
}

interface PbCommentRecord extends PbRecord {
  post?: string
  author?: string | PbUserRecord
  content?: string
  parent?: string | null
  created?: string
  expand?: { author?: PbUserRecord; post?: PbPostRecord }
}

interface PbSettingsRecord extends PbRecord {
  siteName?: string
  site_name?: string
  siteDescription?: string
  site_description?: string
  contactEmail?: string
  contact_email?: string
  allowRegistration?: boolean
  allow_registration?: boolean
  footerText?: string
  footer_text?: string
  logo?: string
  logoDark?: string
  logo_dark?: string
  favicon?: string
  allowedImageDomains?: string[]
  allowed_image_domains?: string[]
}

interface PbEditorSettingsRecord extends PbRecord {
  placeholder?: string
  showHeadings?: boolean
  showFormatting?: boolean
  showLists?: boolean
  showBlockquote?: boolean
  showRule?: boolean
  showLink?: boolean
  showImageUpload?: boolean
  showImageUrl?: boolean
  showEmoji?: boolean
  showAlign?: boolean
  showTable?: boolean
  autolink?: boolean
  maxContentLength?: number
  maxImageUploadSize?: number
  imageMaxDimension?: number
  imageQuality?: number
}

interface PbMediaRecord extends PbRecord {
  file?: string
  alt?: string
  owner?: string
  created?: string
}

interface PbPageRecord extends PbRecord {
  slug?: string
  title?: string
  body?: string
}

function normalizeRole(role: unknown): Role {
  if (role === 'admin' || role === 'penulis' || role === 'subscriber') return role
  if (role === 'author') return 'penulis'
  return 'subscriber'
}

function sanitizeSocials(socials: UserSocials): UserSocials {
  const out: UserSocials = {}
  for (const [key, value] of Object.entries(socials)) {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!trimmed) continue
    const clean = sanitizeUrl(trimmed)
    if (clean) out[key as keyof UserSocials] = clean
  }
  return out
}

function mapUser(record: PbUserRecord): User {
  return {
    id: record.id,
    username: record.username ?? '',
    name: record.name ?? record.username ?? '',
    email: record.email ?? '',
    avatar: typeof record.avatar === 'string' ? record.avatar : '',
    bio: record.bio ?? '',
    role: normalizeRole(record.role),
    postCount: typeof record.postCount === 'number' ? record.postCount : undefined,
    coverBanner: typeof record.coverBanner === 'string' ? record.coverBanner : undefined,
    socials: record.socials && typeof record.socials === 'object' ? record.socials : undefined,
  }
}

function mapCategory(record: PbCategoryRecord): Category {
  const parentValue = record.parent
  const parentId =
    typeof parentValue === 'string'
      ? parentValue
      : parentValue && typeof parentValue === 'object'
        ? parentValue.id
        : null
  return {
    id: record.id,
    name: record.name ?? '',
    slug: record.slug ?? '',
    description: record.description ?? '',
    image: typeof record.image === 'string' ? record.image : '',
    parentId,
    postCount: typeof record.postCount === 'number' ? record.postCount : undefined,
  }
}

function mapTag(record: PbTagRecord): Tag {
  return {
    id: record.id,
    name: record.name ?? '',
    slug: record.slug ?? '',
    postCount: typeof record.postCount === 'number' ? record.postCount : undefined,
  }
}

function mapPost(record: PbPostRecord): Post {
  const expand = record.expand
  const authorRecord =
    expand?.author ??
    (typeof record.author === 'object' && record.author !== null ? (record.author as PbUserRecord) : undefined)
  return {
    id: record.id,
    slug: record.slug ?? '',
    title: record.title ?? '',
    excerpt: record.excerpt ?? '',
    content: record.content ?? '',
    cover: typeof record.cover === 'string' ? record.cover : '',
    status: record.status === 'draft' ? 'draft' : 'published',
    postType: (record.postType as Post['postType']) ?? 'standard',
    postStyle: (record.postStyle as Post['postStyle']) ?? 'style1',
    videoUrl: typeof record.videoUrl === 'string' ? record.videoUrl : undefined,
    audioUrl: typeof record.audioUrl === 'string' ? record.audioUrl : undefined,
    gallery: Array.isArray(record.gallery) ? record.gallery.map(String) : undefined,
    createdAt: record.created ?? new Date().toISOString(),
    updatedAt: record.updated ?? record.created ?? new Date().toISOString(),
    author: authorRecord
      ? mapUser(authorRecord)
      : ({
          id: typeof record.author === 'string' ? record.author : '',
          username: '',
          name: '',
          email: '',
          avatar: '',
          bio: '',
          role: 'subscriber',
        } as User),
    categories: (expand?.categories ?? []).map((c) => mapCategory(c as PbCategoryRecord)),
    tags: (expand?.tags ?? []).map((t) => mapTag(t as PbTagRecord)),
    likeCount: typeof record.likeCount === 'number' ? record.likeCount : 0,
    viewCount: typeof record.viewCount === 'number' ? record.viewCount : 0,
    commentCount: typeof record.commentCount === 'number' ? record.commentCount : 0,
    readingTime: typeof record.readingTime === 'number' ? record.readingTime : 1,
    featured: Boolean(record.featured),
  }
}

function mapComment(record: PbCommentRecord): Comment {
  const authorRecord =
    record.expand?.author ??
    (typeof record.author === 'object' && record.author !== null ? (record.author as PbUserRecord) : undefined)
  return {
    id: record.id,
    postId: record.expand?.post?.id ?? (typeof record.post === 'string' ? record.post : ''),
    author: authorRecord
      ? mapUser(authorRecord)
      : {
          id: typeof record.author === 'string' ? record.author : '',
          username: '',
          name: '',
          email: '',
          avatar: '',
          bio: '',
          role: 'subscriber',
        },
    content: record.content ?? '',
    createdAt: record.created ?? new Date().toISOString(),
    parentId: typeof record.parent === 'string' ? record.parent : null,
  }
}

function mapSiteSettings(record: PbSettingsRecord): SiteSettings {
  return {
    siteName: record.siteName ?? record.site_name ?? '',
    siteDescription: record.siteDescription ?? record.site_description ?? '',
    contactEmail: record.contactEmail ?? record.contact_email ?? '',
    allowRegistration: Boolean(record.allowRegistration ?? record.allow_registration ?? false),
    footerText: record.footerText ?? record.footer_text ?? '',
    logo: record.logo ?? '',
    logoDark: record.logoDark ?? record.logo_dark ?? '',
    favicon: record.favicon ?? '',
    allowedImageDomains: record.allowedImageDomains ?? record.allowed_image_domains ?? [],
  }
}

function mapEditorSettings(record: PbEditorSettingsRecord): EditorSettings {
  return {
    placeholder: record.placeholder ?? '',
    showHeadings: Boolean(record.showHeadings),
    showFormatting: Boolean(record.showFormatting),
    showLists: Boolean(record.showLists),
    showBlockquote: Boolean(record.showBlockquote),
    showRule: Boolean(record.showRule),
    showLink: Boolean(record.showLink),
    showImageUpload: Boolean(record.showImageUpload),
    showImageUrl: Boolean(record.showImageUrl),
    showEmoji: Boolean(record.showEmoji),
    showAlign: Boolean(record.showAlign),
    showTable: Boolean(record.showTable),
    autolink: Boolean(record.autolink),
    maxContentLength: typeof record.maxContentLength === 'number' ? record.maxContentLength : 50000,
    maxImageUploadSize:
      typeof record.maxImageUploadSize === 'number' ? record.maxImageUploadSize : 5 * 1024 * 1024,
    imageMaxDimension: clampImageMaxDimension(record.imageMaxDimension),
    imageQuality: clampImageQuality(record.imageQuality),
  }
}

function mapPage(record: PbPageRecord): PageContent {
  return {
    slug: record.slug ?? '',
    title: record.title ?? '',
    body: record.body ?? '',
  }
}

function sortToPb(sort: string | undefined): string {
  const value = sort || '-createdAt'
  const descending = value.startsWith('-')
  const key = descending ? value.slice(1) : value
  const mapped = key === 'createdAt' ? 'created' : key === 'updatedAt' ? 'updated' : key
  return (descending ? '-' : '') + mapped
}

function statusToPb(status: string | undefined): string {
  return status === 'draft' ? 'draft' : 'published'
}

const POST_EXPAND = 'author,categories,tags'

export class PocketBaseSource implements DataSource {
  private readonly pb: PocketBase
  private siteSettingsCache: SiteSettings | null = null

  constructor(pb: PocketBase = getPb()) {
    this.pb = pb
  }

  private async wrap<T>(
    fn: () => Promise<T>,
    options: { nullOn404?: boolean } = {},
  ): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      if (options.nullOn404 && getStatus(err) === 404) {
        return null as T
      }
      throw toAppError(err)
    }
  }

  private currentUserId(): string | undefined {
    const model = this.pb.authStore.record as PbUserRecord | null
    return model?.id
  }

  private postBody(
    input: PostInput,
    options: { generateSlug?: boolean } = {},
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {}
    if (input.title !== undefined) body.title = sanitizePlainText(input.title)
    if (input.excerpt !== undefined) body.excerpt = sanitizePlainText(input.excerpt)
    if (input.content !== undefined) body.content = sanitizeHtml(input.content)
    if (input.cover !== undefined) body.cover = sanitizeUrl(input.cover)
    if (input.status !== undefined) body.status = statusToPb(input.status)
    if (input.postType !== undefined) body.postType = input.postType
    if (input.postStyle !== undefined) body.postStyle = input.postStyle
    if (input.videoUrl !== undefined) body.videoUrl = sanitizeUrl(input.videoUrl) || null
    if (input.audioUrl !== undefined) body.audioUrl = sanitizeUrl(input.audioUrl) || null
    if (input.gallery !== undefined) {
      body.gallery = (input.gallery ?? []).map((url) => sanitizeUrl(url)).filter(Boolean)
    }
    if (input.featured !== undefined) body.featured = Boolean(input.featured)
    if (input.categoryIds !== undefined) body.categories = input.categoryIds
    if (input.tagIds !== undefined) body.tags = input.tagIds

    if (input.slug !== undefined) {
      body.slug = slugify(input.slug)
    } else if (options.generateSlug && input.title !== undefined) {
      body.slug = slugify(input.title) || `post-${Date.now()}`
    }
    return body
  }

  async listPosts(params: ListPostsParams): Promise<Page<Post>> {
    return this.wrap(async () => {
      const filter = params.filter ?? {}
      const parts: string[] = []
      const filterParams: Record<string, unknown> = {}

      parts.push('status = {:status}')
      filterParams.status = statusToPb(filter.status)

      if (filter.featured !== undefined) {
        parts.push('featured = {:featured}')
        filterParams.featured = filter.featured
      }
      if (filter.categorySlug) {
        parts.push('categories.slug ?= {:categorySlug}')
        filterParams.categorySlug = filter.categorySlug
      }
      if (filter.tagSlug) {
        parts.push('tags.slug ?= {:tagSlug}')
        filterParams.tagSlug = filter.tagSlug
      }
      if (filter.authorUsername) {
        parts.push('author.username = {:authorUsername}')
        filterParams.authorUsername = filter.authorUsername
      }
      if (filter.ids?.length) {
        const idConds = filter.ids.map((_, index) => `id = {:id${index}}`)
        parts.push(`(${idConds.join(' || ')})`)
        filter.ids.forEach((id, index) => {
          filterParams[`id${index}`] = id
        })
      }
      if (filter.search) {
        const q = filter.search.trim()
        parts.push('(title ~ {:q} || excerpt ~ {:q} || content ~ {:q})')
        filterParams.q = q
      }

      const page = Math.max(1, Math.floor(params.page) || 1)
      const perPage = Math.min(100, Math.max(1, Math.floor(params.perPage) || 10))
      const result = await this.pb.collection('posts').getList(page, perPage, {
        filter: this.pb.filter(parts.join(' && '), filterParams),
        sort: sortToPb(params.sort),
        expand: POST_EXPAND,
      })

      return {
        items: result.items.map((item) => mapPost(item as unknown as PbPostRecord)),
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      }
    })
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    return this.wrap(
      async () => {
        const record = await this.pb.collection('posts').getFirstListItem(
          this.pb.filter('slug = {:slug}', { slug }),
          { expand: POST_EXPAND },
        )
        return mapPost(record as unknown as PbPostRecord)
      },
      { nullOn404: true },
    )
  }

  async getPostById(id: string): Promise<Post | null> {
    return this.wrap(
      async () => {
        const record = await this.pb.collection('posts').getOne(id, { expand: POST_EXPAND })
        return mapPost(record as unknown as PbPostRecord)
      },
      { nullOn404: true },
    )
  }

  async createPost(input: PostInput): Promise<Post> {
    const created = await this.wrap(async () => {
      const record = await this.pb
        .collection('posts')
        .create(this.postBody(input, { generateSlug: true }))
      return record as unknown as PbPostRecord
    })
    const full = await this.getPostById(created.id)
    if (!full) return mapPost(created)
    return full
  }

  async updatePost(id: string, input: Partial<PostInput>): Promise<Post> {
    const updated = await this.wrap(async () => {
      const record = await this.pb
        .collection('posts')
        .update(id, this.postBody(input as PostInput))
      return record as unknown as PbPostRecord
    })
    const full = await this.getPostById(updated.id)
    if (!full) return mapPost(updated)
    return full
  }

  async deletePost(id: string): Promise<void> {
    await this.wrap(async () => {
      await this.pb.collection('posts').delete(id)
    })
  }

  async listCategories(): Promise<Category[]> {
    return this.wrap(async () => {
      const records = await this.pb.collection('categories').getFullList({ sort: 'name' })
      return (records as unknown as PbCategoryRecord[]).map(mapCategory)
    })
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    return this.wrap(async () => {
      const body: Record<string, unknown> = {
        name: sanitizePlainText(input.name),
        slug: slugify(input.slug ?? input.name),
      }
      if (input.description !== undefined) body.description = sanitizePlainText(input.description)
      if (input.image !== undefined) body.image = sanitizeUrl(input.image)
      if (input.parentId !== undefined) body.parent = input.parentId || null
      const record = await this.pb.collection('categories').create(body)
      return mapCategory(record as unknown as PbCategoryRecord)
    })
  }

  async updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
    return this.wrap(async () => {
      const body: Record<string, unknown> = {}
      if (input.name !== undefined) body.name = sanitizePlainText(input.name)
      if (input.slug !== undefined) body.slug = slugify(input.slug)
      if (input.description !== undefined) body.description = sanitizePlainText(input.description)
      if (input.image !== undefined) body.image = sanitizeUrl(input.image)
      if (input.parentId !== undefined) body.parent = input.parentId || null
      const record = await this.pb.collection('categories').update(id, body)
      return mapCategory(record as unknown as PbCategoryRecord)
    })
  }

  async deleteCategory(id: string): Promise<void> {
    await this.wrap(async () => {
      await this.pb.collection('categories').delete(id)
    })
  }

  async saveCategory(input: CategoryInput): Promise<Category> {
    if (input.id) return this.updateCategory(input.id, input)
    return this.createCategory(input)
  }

  async listTags(): Promise<Tag[]> {
    return this.wrap(async () => {
      const records = await this.pb.collection('tags').getFullList({ sort: 'name' })
      return (records as unknown as PbTagRecord[]).map(mapTag)
    })
  }

  async createTag(input: TagInput): Promise<Tag> {
    return this.wrap(async () => {
      const slug = slugify(input.slug ?? input.name)
      const existing = await this.pb
        .collection('tags')
        .getFirstListItem(this.pb.filter('slug = {:slug}', { slug }))
        .catch((err: unknown) => {
          if (getStatus(err) === 404) return null
          throw err
        })
      if (existing) return mapTag(existing as unknown as PbTagRecord)
      const record = await this.pb.collection('tags').create({
        name: sanitizePlainText(input.name),
        slug,
      })
      return mapTag(record as unknown as PbTagRecord)
    })
  }

  async updateTag(id: string, input: Partial<TagInput>): Promise<Tag> {
    return this.wrap(async () => {
      const body: Record<string, unknown> = {}
      if (input.name !== undefined) body.name = sanitizePlainText(input.name)
      if (input.slug !== undefined) body.slug = slugify(input.slug)
      const record = await this.pb.collection('tags').update(id, body)
      return mapTag(record as unknown as PbTagRecord)
    })
  }

  async deleteTag(id: string): Promise<void> {
    await this.wrap(async () => {
      await this.pb.collection('tags').delete(id)
    })
  }

  async listComments(postId: string): Promise<Comment[]> {
    return this.wrap(async () => {
      const records = await this.pb.collection('comments').getFullList({
        filter: this.pb.filter('post = {:post}', { post: postId }),
        sort: 'created',
        expand: 'author',
      })
      return (records as unknown as PbCommentRecord[]).map(mapComment)
    })
  }

  async createComment(input: { postId: string; content: string }): Promise<Comment> {
    const created = await this.wrap(async () => {
      const record = await this.pb.collection('comments').create({
        post: input.postId,
        content: sanitizePlainText(input.content),
        parent: null,
      })
      return record as unknown as PbCommentRecord
    })
    const expanded = await this.pb
      .collection('comments')
      .getOne(created.id, { expand: 'author' })
      .catch(() => null)
    return mapComment((expanded ?? created) as unknown as PbCommentRecord)
  }

  async deleteComment(id: string): Promise<void> {
    await this.wrap(async () => {
      await this.pb.collection('comments').delete(id)
    })
  }

  async listAllComments(): Promise<Comment[]> {
    return this.wrap(async () => {
      const records = await this.pb.collection('comments').getFullList({
        sort: '-created',
        expand: 'post,author',
      })
      return (records as unknown as PbCommentRecord[]).map(mapComment)
    })
  }

  async toggleReaction(input: {
    postId: string
    type: ReactionType
  }): Promise<void> {
    await this.wrap(async () => {
      const userId = this.currentUserId()
      if (!userId) throw new Error('LOGIN_REQUIRED')
      const existing = await this.pb
        .collection('reactions')
        .getFirstListItem(
          this.pb.filter('post = {:post} && user = {:user} && type = {:type}', {
            post: input.postId,
            user: userId,
            type: input.type,
          }),
        )
        .catch((err: unknown) => {
          if (getStatus(err) === 404) return null
          throw err
        })
      if (existing) {
        await this.pb.collection('reactions').delete(existing.id)
      } else {
        await this.pb.collection('reactions').create({
          post: input.postId,
          type: input.type,
        })
      }
    })
  }

  async login(username: string, password: string): Promise<User> {
    return this.wrap(async () => {
      const response = await this.pb.collection('users').authWithPassword(username, password)
      return mapUser(response.record as unknown as PbUserRecord)
    })
  }

  async register(input: {
    name: string
    username: string
    email: string
    password: string
  }): Promise<User> {
    return this.wrap(async () => {
      const username = sanitizePlainText(input.username).toLowerCase()
      await this.pb.collection('users').create({
        name: sanitizePlainText(input.name),
        username,
        email: sanitizeEmail(input.email),
        password: input.password,
        passwordConfirm: input.password,
      })
      const response = await this.pb.collection('users').authWithPassword(username, input.password)
      return mapUser(response.record as unknown as PbUserRecord)
    })
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.wrap(async () => {
      await this.pb.collection('users').requestPasswordReset(sanitizeEmail(email))
    })
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await this.wrap(async () => {
      await this.pb.collection('users').confirmPasswordReset(token, newPassword, newPassword)
    })
  }

  async changePassword(input: {
    currentPassword: string
    newPassword: string
  }): Promise<void> {
    await this.wrap(async () => {
      const userId = this.currentUserId()
      if (!userId) throw new Error('LOGIN_REQUIRED')
      await this.pb.collection('users').update(userId, {
        oldPassword: input.currentPassword,
        password: input.newPassword,
        passwordConfirm: input.newPassword,
      })
    })
  }

  async logout(): Promise<void> {
    this.pb.authStore.clear()
  }

  currentUser(): User | null {
    const record = this.pb.authStore.record as PbUserRecord | null
    if (!record) return null
    return mapUser(record)
  }

  async listAuthors(): Promise<User[]> {
    return this.wrap(async () => {
      const records = await this.pb.collection('users').getFullList({
        filter: 'role != "subscriber"',
        sort: 'name',
      })
      return (records as unknown as PbUserRecord[]).map(mapUser)
    })
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.wrap(
      async () => {
        const record = await this.pb.collection('users').getFirstListItem(
          this.pb.filter('username = {:username}', { username }),
        )
        return mapUser(record as unknown as PbUserRecord)
      },
      { nullOn404: true },
    )
  }

  async listAuthorsFeatured(limit: number): Promise<User[]> {
    return this.wrap(async () => {
      if (limit <= 0) return []
      const perPage = Math.min(100, Math.max(1, Math.floor(limit)))
      const result = await this.pb.collection('users').getList(1, perPage, {
        filter: 'role != "subscriber"',
        sort: '-postCount',
      })
      return (result.items as unknown as PbUserRecord[]).map(mapUser)
    })
  }

  async listUsers(): Promise<User[]> {
    return this.wrap(async () => {
      const records = await this.pb.collection('users').getFullList({ sort: 'created' })
      return (records as unknown as PbUserRecord[]).map(mapUser)
    })
  }

  async updateUserRole(userId: string, role: Role): Promise<User> {
    return this.wrap(async () => {
      const record = await this.pb.collection('users').update(userId, { role })
      return mapUser(record as unknown as PbUserRecord)
    })
  }

  async getSiteSettings(): Promise<SiteSettings> {
    if (this.siteSettingsCache) return this.siteSettingsCache
    return this.wrap(async () => {
      const page = await this.pb.collection('site_settings').getList(1, 1)
      const record = page.items[0]
      if (!record) throw new Error('Site settings are not initialized')
      const settings = mapSiteSettings(record as unknown as PbSettingsRecord)
      this.siteSettingsCache = settings
      return settings
    })
  }

  async updateSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
    return this.wrap(async () => {
      const body: Record<string, unknown> = {}
      if (input.siteName !== undefined) body.siteName = sanitizePlainText(input.siteName)
      if (input.siteDescription !== undefined) body.siteDescription = sanitizePlainText(input.siteDescription)
      if (input.contactEmail !== undefined) body.contactEmail = sanitizeEmail(input.contactEmail)
      if (input.allowRegistration !== undefined) body.allowRegistration = Boolean(input.allowRegistration)
      if (input.footerText !== undefined) body.footerText = sanitizePlainText(input.footerText)
      if (input.logo !== undefined) body.logo = sanitizeUrl(input.logo)
      if (input.logoDark !== undefined) body.logoDark = sanitizeUrl(input.logoDark)
      if (input.favicon !== undefined) body.favicon = sanitizeUrl(input.favicon)
      if (input.allowedImageDomains !== undefined) {
        body.allowedImageDomains = input.allowedImageDomains
          .map((domain) => sanitizePlainText(domain).toLowerCase())
          .filter(Boolean)
      }
      const page = await this.pb.collection('site_settings').getList(1, 1)
      const existing = page.items[0]
      if (!existing) throw new Error('Site settings are not initialized')
      const record = await this.pb.collection('site_settings').update(existing.id, body)
      const settings = mapSiteSettings(record as unknown as PbSettingsRecord)
      this.siteSettingsCache = settings
      return settings
    })
  }

  async getPage(slug: string): Promise<PageContent | null> {
    return this.wrap(
      async () => {
        const record = await this.pb.collection('pages').getFirstListItem(
          this.pb.filter('slug = {:slug}', { slug }),
        )
        return mapPage(record as unknown as PbPageRecord)
      },
      { nullOn404: true },
    )
  }

  async updatePage(slug: string, input: { title?: string; body?: string }): Promise<PageContent> {
    return this.wrap(async () => {
      const record = await this.pb.collection('pages').getFirstListItem(
        this.pb.filter('slug = {:slug}', { slug }),
      )
      const body: Record<string, unknown> = {}
      if (input.title !== undefined) body.title = sanitizePlainText(input.title)
      if (input.body !== undefined) body.body = sanitizeHtml(input.body)
      const updated = await this.pb.collection('pages').update(record.id, body)
      return mapPage(updated as unknown as PbPageRecord)
    })
  }

  async getEditorSettings(): Promise<EditorSettings> {
    return this.wrap(async () => {
      const page = await this.pb.collection('editor_settings').getList(1, 1)
      const record = page.items[0]
      if (!record) throw new Error('Editor settings are not initialized')
      return mapEditorSettings(record as unknown as PbEditorSettingsRecord)
    })
  }

  async updateEditorSettings(input: Partial<EditorSettings>): Promise<EditorSettings> {
    return this.wrap(async () => {
      const body: Record<string, unknown> = { ...input }
      if (input.placeholder !== undefined) {
        body.placeholder = sanitizePlainText(input.placeholder)
      }
      if (input.imageMaxDimension !== undefined) {
        body.imageMaxDimension = clampImageMaxDimension(input.imageMaxDimension)
      }
      if (input.imageQuality !== undefined) {
        body.imageQuality = clampImageQuality(input.imageQuality)
      }
      const page = await this.pb.collection('editor_settings').getList(1, 1)
      const existing = page.items[0]
      if (!existing) throw new Error('Editor settings are not initialized')
      const record = await this.pb
        .collection('editor_settings')
        .update(existing.id, body)
      return mapEditorSettings(record as unknown as PbEditorSettingsRecord)
    })
  }

  async updateUserProfile(input: {
    name?: string
    bio?: string
    avatar?: string
    coverBanner?: string
    socials?: UserSocials
  }): Promise<User> {
    return this.wrap(async () => {
      const userId = this.currentUserId()
      if (!userId) throw new Error('LOGIN_REQUIRED')
      const body: Record<string, unknown> = {}
      if (input.name !== undefined) body.name = sanitizePlainText(input.name)
      if (input.bio !== undefined) body.bio = sanitizePlainText(input.bio)
      if (input.avatar !== undefined) body.avatar = sanitizeUrl(input.avatar)
      if (input.coverBanner !== undefined) body.coverBanner = sanitizeUrl(input.coverBanner)
      if (input.socials !== undefined) body.socials = sanitizeSocials(input.socials)
      const record = await this.pb.collection('users').update(userId, body)
      return mapUser(record as unknown as PbUserRecord)
    })
  }

  async uploadFile(file: File): Promise<{ url: string; name: string }> {
    return this.wrap(async () => {
      const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
      if (!allowedMime.includes(file.type)) {
        throw new Error('Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.')
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds the 5 MB limit.')
      }
      const formData = new FormData()
      formData.append('file', file)
      const record = await this.pb.collection('media').create(formData)
      return {
        url: this.pb.files.getURL(record, String(record.file)),
        name: file.name,
      }
    })
  }

  async listMedia(params: ListMediaParams): Promise<Page<MediaItem>> {
    return this.wrap(async () => {
      const page = Math.max(1, Math.floor(params.page ?? 1) || 1)
      const perPage = Math.min(100, Math.max(1, Math.floor(params.perPage ?? 48) || 48))
      const parts: string[] = [
        'file != ""',
        'file !~ "ncmaz_thumb_"',
        'file !~ "ncmaz_medium_"',
      ]
      const filterParams: Record<string, unknown> = {}
      const search = params.search?.trim()
      if (search) {
        parts.push('(file ~ {:q} || alt ~ {:q})')
        filterParams.q = search
      }

      const result = await this.pb.collection('media').getList(page, perPage, {
        filter: this.pb.filter(parts.join(' && '), filterParams),
        sort: '-created',
      })

      return {
        items: result.items.map((item) => {
          const record = item as unknown as PbMediaRecord
          const fileName = String(record.file ?? '')
          return {
            id: record.id,
            url: fileName ? this.pb.files.getURL(item, fileName) : '',
            name: fileName,
            ownerId: record.owner ? String(record.owner) : undefined,
            createdAt: String(record.created ?? ''),
          }
        }),
        page: result.page,
        perPage: result.perPage,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      }
    })
  }

  async trackView(postId: string): Promise<void> {
    if (!postId) return
    try {
      await fetch('/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
    } catch {
      // view tracking is best-effort; never break reading
    }
  }
}
