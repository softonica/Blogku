import { describe, expect, it, vi } from 'vitest'
import { PocketBaseSource } from './pocketbase.source'
import { AppError, RateLimitError, toAppError } from './errors'

interface FakeCollection {
  getList?: ReturnType<typeof vi.fn>
  getOne?: ReturnType<typeof vi.fn>
  getFirstListItem?: ReturnType<typeof vi.fn>
  getFullList?: ReturnType<typeof vi.fn>
  create?: ReturnType<typeof vi.fn>
  update?: ReturnType<typeof vi.fn>
  delete?: ReturnType<typeof vi.fn>
  authWithPassword?: ReturnType<typeof vi.fn>
  requestPasswordReset?: ReturnType<typeof vi.fn>
  confirmPasswordReset?: ReturnType<typeof vi.fn>
}

function makePb(overrides: {
  collections?: Record<string, Partial<FakeCollection>>
  record?: unknown
  filesUrl?: string
} = {}): {
  pb: {
    collection: (name: string) => FakeCollection
    filter: ReturnType<typeof vi.fn>
    authStore: { record: unknown; clear: ReturnType<typeof vi.fn> }
    files: { getURL: ReturnType<typeof vi.fn> }
  }
  collections: Record<string, FakeCollection>
} {
  const collections: Record<string, FakeCollection> = {}
  for (const [name, methods] of Object.entries(overrides.collections ?? {})) {
    collections[name] = { ...methods }
  }
  const pb = {
    collection: (name: string) => collections[name] ?? (collections[name] = {}),
    filter: vi.fn((template: string) => template),
    authStore: {
      record: overrides.record ?? null,
      clear: vi.fn(),
    },
    files: {
      getURL: vi.fn(() => overrides.filesUrl ?? 'http://127.0.0.1:8090/api/files/x/y'),
    },
  }
  return { pb, collections }
}

const userRecord = {
  id: 'u1',
  username: 'demo',
  name: 'Demo Author',
  email: 'demo@blogku.com',
  avatar: 'a.png',
  bio: 'bio',
  role: 'penulis',
  postCount: 3,
}

const categoryRecords = [
  { id: 'c1', name: 'Tech', slug: 'tech', description: 'd', image: 'i.jpg', parent: null, postCount: 2 },
]

const tagRecords = [{ id: 't1', name: 'Vue', slug: 'vue', postCount: 1 }]

const postRecord = {
  id: 'p1',
  title: 'Hello',
  slug: 'hello',
  excerpt: 'Excerpt text goes here.',
  content: '<p>Body</p>',
  cover: 'cover.jpg',
  status: 'published',
  postType: 'standard',
  author: 'u1',
  categories: ['c1'],
  tags: ['t1'],
  featured: false,
  readingTime: 1,
  likeCount: 2,
  viewCount: 10,
  commentCount: 1,
  created: '2026-01-01T00:00:00.000Z',
  updated: '2026-01-02T00:00:00.000Z',
  expand: { author: userRecord, categories: categoryRecords, tags: tagRecords },
}

describe('PocketBaseSource', () => {
  it('maps postStyle from the record and defaults to style1', async () => {
    const styled = { ...postRecord, postStyle: 'style3' }
    const { pb } = makePb({
      collections: {
        posts: {
          getList: vi
            .fn()
            .mockResolvedValue({ items: [styled, postRecord], page: 1, perPage: 10, totalItems: 2, totalPages: 1 }),
        },
      },
    })
    const source = new PocketBaseSource(pb as never)

    const page = await source.listPosts({ page: 1, perPage: 10 })

    expect(page.items[0].postStyle).toBe('style3')
    expect(page.items[1].postStyle).toBe('style1')
  })

  it('sends postStyle when creating a post', async () => {
    const created = { ...postRecord, postStyle: 'style2' }
    const { pb, collections } = makePb({
      collections: {
        posts: {
          create: vi.fn().mockResolvedValue(created),
          getOne: vi.fn().mockResolvedValue(created),
        },
      },
    })
    const source = new PocketBaseSource(pb as never)

    await source.createPost({
      title: 'Styled post',
      excerpt: 'An excerpt that is long enough.',
      content: '<p>Body content long enough.</p>',
      status: 'published',
      postStyle: 'style2',
    })

    const [body] = collections.posts.create!.mock.calls[0]
    expect(body.postStyle).toBe('style2')
  })

  it('maps post records (created/updated + expand)', async () => {
    const { pb } = makePb({
      collections: {
        posts: { getList: vi.fn().mockResolvedValue({ items: [postRecord], page: 1, perPage: 10, totalItems: 1, totalPages: 1 }) },
      },
    })
    const source = new PocketBaseSource(pb as never)

    const page = await source.listPosts({ page: 1, perPage: 10, sort: '-createdAt' })

    expect(page.items).toHaveLength(1)
    const post = page.items[0]
    expect(post.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(post.updatedAt).toBe('2026-01-02T00:00:00.000Z')
    expect(post.author.username).toBe('demo')
    expect(post.author.email).toBe('demo@blogku.com')
    expect(post.categories[0].slug).toBe('tech')
    expect(post.tags[0].slug).toBe('vue')
    expect(post.likeCount).toBe(2)
    expect(post.readingTime).toBe(1)
    const [pageArg, perPageArg, options] = pb.collection('posts').getList!.mock.calls[0]
    expect(pageArg).toBe(1)
    expect(perPageArg).toBe(10)
    expect(options.expand).toBe('author,categories,tags')
    expect(options.sort).toBe('-created')
  })

  it('builds filter from list params (category, author, search, status)', async () => {
    const { pb } = makePb({
      collections: {
        posts: { getList: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 }) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await source.listPosts({
      page: 1,
      perPage: 10,
      filter: { categorySlug: 'tech', authorUsername: 'demo', search: 'vue' },
    })
    const filterArg = pb.collection('posts').getList!.mock.calls[0][2].filter
    expect(filterArg).toContain('status = {:status}')
    expect(filterArg).toContain('categories.slug ?= {:categorySlug}')
    expect(filterArg).toContain('author.username = {:authorUsername}')
    expect(filterArg).toContain('(title ~ {:q} || excerpt ~ {:q} || content ~ {:q})')
    const captured = pb.filter.mock.calls[0][1]
    expect(captured.status).toBe('published')
    expect(captured.categorySlug).toBe('tech')
  })

  it('returns null on 404 for getters', async () => {
    const notFound = Object.assign(new Error('not found'), { status: 404 })
    const { pb } = makePb({
      collections: {
        posts: { getFirstListItem: vi.fn().mockRejectedValue(notFound) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await expect(source.getPostBySlug('missing')).resolves.toBeNull()
  })

  it('normalizes 429 into RateLimitError with retryAfter from header', async () => {
    const err = Object.assign(new Error('too many'), {
      status: 429,
      response: { status: 429, headers: { get: () => '25' } },
    })
    const { pb } = makePb({
      collections: {
        posts: { getList: vi.fn().mockRejectedValue(err) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await expect(source.listPosts({ page: 1, perPage: 10 })).rejects.toBeInstanceOf(RateLimitError)
    await expect(source.listPosts({ page: 1, perPage: 10 })).rejects.toMatchObject({
      retryAfter: 25,
      status: 429,
    })
  })

  it('normalizes 401 into LOGIN_REQUIRED message', async () => {
    const err = Object.assign(new Error('unauthorized'), { status: 401, data: { message: 'unauthorized' } })
    const { pb } = makePb({
      collections: {
        posts: { getList: vi.fn().mockRejectedValue(err) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await expect(source.listPosts({ page: 1, perPage: 10 })).rejects.toThrow('LOGIN_REQUIRED')
  })

  it('extracts first field error message on 400', async () => {
    const err = Object.assign(new Error('bad'), {
      status: 400,
      data: {
        message: 'Validation failed',
        data: { title: { code: 'validation_required', message: 'Title is required' } },
      },
    })
    const { pb } = makePb({
      collections: {
        posts: { getList: vi.fn().mockRejectedValue(err) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await expect(source.listPosts({ page: 1, perPage: 10 })).rejects.toThrow('Title is required')
  })

  it('toggleReaction removes existing reaction and creates new one', async () => {
    const found = { id: 'r1' }
    const { pb } = makePb({
      record: { id: 'u1' },
      collections: {
        reactions: {
          getFirstListItem: vi.fn().mockResolvedValue(found),
          delete: vi.fn().mockResolvedValue(true),
          create: vi.fn().mockResolvedValue({ id: 'r2' }),
        },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await source.toggleReaction({ postId: 'p1', type: 'like' })
    expect(pb.collection('reactions').delete!).toHaveBeenCalledWith('r1')

    pb.collection('reactions').getFirstListItem = vi.fn().mockRejectedValue({ status: 404 })
    await source.toggleReaction({ postId: 'p1', type: 'favorite' })
    const [body] = pb.collection('reactions').create!.mock.calls[0]
    expect(body.post).toBe('p1')
    expect(body.type).toBe('favorite')
  })

  it('login maps user and register delegates to register/authWithPassword', async () => {
    const { pb } = makePb({
      collections: {
        users: {
          authWithPassword: vi.fn().mockResolvedValue({ record: userRecord }),
          create: vi.fn().mockResolvedValue({ id: 'u9' }),
        },
      },
    })
    const source = new PocketBaseSource(pb as never)
    const user = await source.login('demo', 'demo')
    expect(user.role).toBe('penulis')
    expect(user.postCount).toBe(3)

    await source.register({ name: 'A', username: 'NewUser', email: 'a@b.com', password: 'password123' })
    expect(pb.collection('users').create!).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'newuser', password: 'password123' }),
    )
    expect(pb.collection('users').authWithPassword!).toHaveBeenLastCalledWith('newuser', 'password123')
  })

  it('uploadFile builds multipart and returns url', async () => {
    const { pb } = makePb({
      collections: {
        media: { create: vi.fn().mockResolvedValue({ id: 'm1', file: 'x.png' }) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    const file = new File(['x'], 'x.png', { type: 'image/png' })
    const result = await source.uploadFile(file)
    expect(result.url).toContain('/api/files/x/y')
    expect(result.name).toBe('x.png')
    const [formData] = pb.collection('media').create!.mock.calls[0]
    expect(formData.get('file')).toBe(file)
  })

  it('clamps page and perPage for listPosts', async () => {
    const { pb } = makePb({
      collections: {
        posts: { getList: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 100, totalItems: 0, totalPages: 0 }) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await source.listPosts({ page: -5, perPage: 500 })
    const [pageArg, perPageArg] = pb.collection('posts').getList!.mock.calls[0]
    expect(pageArg).toBe(1)
    expect(perPageArg).toBe(100)
  })

  it('preserves the existing slug when updating only the title', async () => {
    const updated = { ...postRecord, title: 'New title' }
    const { pb } = makePb({
      collections: {
        posts: {
          update: vi.fn().mockResolvedValue(updated),
          getOne: vi.fn().mockResolvedValue(postRecord),
        },
      },
    })
    const source = new PocketBaseSource(pb as never)
    const post = await source.updatePost('p1', { title: 'New title' })
    const body = pb.collection('posts').update!.mock.calls[0][1]
    expect(body).not.toHaveProperty('slug')
    expect(post.slug).toBe('hello')
  })

  it('createComment re-fetches the record with author expand', async () => {
    const created = { id: 'c1', post: 'p1', author: 'u1', content: 'hi', created: '2026-01-01T00:00:00.000Z' }
    const expanded = { ...created, expand: { author: userRecord } }
    const { pb } = makePb({
      collections: {
        comments: {
          create: vi.fn().mockResolvedValue(created),
          getOne: vi.fn().mockResolvedValue(expanded),
        },
      },
    })
    const source = new PocketBaseSource(pb as never)
    const comment = await source.createComment({ postId: 'p1', content: 'hi' })
    expect(comment.author.username).toBe('demo')
    expect(pb.collection('comments').getOne!).toHaveBeenCalledWith('c1', { expand: 'author' })
  })

  it('createTag only swallows 404 lookups', async () => {
    const { pb } = makePb({
      collections: {
        tags: { getFirstListItem: vi.fn().mockRejectedValue({ status: 500 }) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await expect(source.createTag({ name: 'X' })).rejects.toThrow('The server is having trouble')
  })

  it('toggleReaction only swallows 404 lookups', async () => {
    const { pb } = makePb({
      record: { id: 'u1' },
      collections: {
        reactions: { getFirstListItem: vi.fn().mockRejectedValue({ status: 500 }) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await expect(source.toggleReaction({ postId: 'p1', type: 'like' })).rejects.toThrow(
      'The server is having trouble',
    )
  })

  it('changePassword updates the current user record with old/new password', async () => {
    const { pb } = makePb({
      record: { id: 'u1' },
      collections: {
        users: { update: vi.fn().mockResolvedValue(userRecord) },
      },
    })
    const source = new PocketBaseSource(pb as never)
    await source.changePassword({ currentPassword: 'oldpass1', newPassword: 'newpass123' })
    expect(pb.collection('users').update!).toHaveBeenCalledWith('u1', {
      oldPassword: 'oldpass1',
      password: 'newpass123',
      passwordConfirm: 'newpass123',
    })
  })

  it('normalizes 403, 409, 5xx and network errors', () => {
    const forbidden = toAppError(Object.assign(new Error('denied'), { status: 403 }))
    expect(forbidden.message).toBe('FORBIDDEN')

    const conflict = toAppError(
      Object.assign(new Error('conflict'), { status: 409, data: { message: 'Slug sudah dipakai' } }),
    )
    expect(conflict.message).toBe('Slug sudah dipakai')

    const server = toAppError(Object.assign(new Error('boom'), { status: 502 }))
    expect((server as AppError).status).toBe(502)
    expect(server.message).toContain('server')

    const network = toAppError(Object.assign(new Error('offline'), { status: 0 }))
    expect(network.message).toContain('server')
  })

  it('RateLimitError clamps and rounds retryAfter upward', () => {
    expect(new RateLimitError(2.4).retryAfter).toBe(3)
    expect(new RateLimitError(0).retryAfter).toBe(1)
  })

  it('trackView POSTs to /track-view', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock as typeof fetch
    try {
      const source = new PocketBaseSource(makePb({}).pb as never)
      await source.trackView('p1')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/track-view')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ postId: 'p1' })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
