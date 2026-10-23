import { beforeEach, describe, expect, it } from 'vitest'
import { MockSource } from './mock.source'

describe('MockSource', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('paginates published posts', async () => {
    const source = new MockSource()
    const first = await source.listPosts({ page: 1, perPage: 5 })
    expect(first.items).toHaveLength(5)
    expect(first.totalItems).toBeGreaterThan(10)
    expect(first.totalPages).toBe(Math.ceil(first.totalItems / 5))

    const second = await source.listPosts({ page: 2, perPage: 5 })
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id)
  })

  it('filters by category, tag, author and search', async () => {
    const source = new MockSource()
    const design = await source.listPosts({
      page: 1,
      perPage: 20,
      filter: { categorySlug: 'design' },
    })
    expect(design.items.length).toBeGreaterThan(0)
    expect(
      design.items.every((post) =>
        post.categories.some((category) => category.slug === 'design'),
      ),
    ).toBe(true)

    const tagged = await source.listPosts({
      page: 1,
      perPage: 20,
      filter: { tagSlug: 'vue' },
    })
    expect(tagged.items.length).toBeGreaterThan(0)
    expect(tagged.items.every((post) => post.tags.some((tag) => tag.slug === 'vue'))).toBe(
      true,
    )

    const byAuthor = await source.listPosts({
      page: 1,
      perPage: 20,
      filter: { authorUsername: 'leo-martin' },
    })
    expect(
      byAuthor.items.every((post) => post.author.username === 'leo-martin'),
    ).toBe(true)

    const search = await source.listPosts({
      page: 1,
      perPage: 20,
      filter: { search: 'slow technology' },
    })
    expect(search.items[0]?.slug).toBe('the-quiet-rise-of-slow-technology')
  })

  it('returns a post by slug', async () => {
    const source = new MockSource()
    const post = await source.getPostBySlug('vue-3-patterns-that-scale-past-ten-screens')
    expect(post?.title).toContain('Vue 3')
    expect(await source.getPostBySlug('does-not-exist')).toBeNull()
  })

  it('handles login, logout and invalid credentials', async () => {
    const source = new MockSource()
    await expect(source.login('demo', 'wrong')).rejects.toThrow(
      'Invalid username or password',
    )
    const user = await source.login('demo', 'password')
    expect(user.username).toBe('demo')
    expect(source.currentUser()?.id).toBe(user.id)

    const restored = new MockSource()
    expect(restored.currentUser()?.username).toBe('demo')

    await restored.logout()
    expect(restored.currentUser()).toBeNull()
  })

  it('requires auth to comment and stores comments', async () => {
    const source = new MockSource()
    await expect(
      source.createComment({ postId: 'post_01', content: 'Hello there' }),
    ).rejects.toThrow('LOGIN_REQUIRED')

    await source.login('demo', 'password')
    const created = await source.createComment({
      postId: 'post_01',
      content: 'A thoughtful note.',
    })
    expect(created.author.username).toBe('demo')
    expect(created.content).toBe('A thoughtful note.')

    const comments = await source.listComments('post_01')
    expect(comments.some((comment) => comment.id === created.id)).toBe(true)
  })

  it('supports demo login with demo/demo credentials', async () => {
    const source = new MockSource()
    const user = await source.login('demo', 'demo')
    expect(user.username).toBe('demo')
    expect(user.role).toBe('penulis')
  })

  it('rejects empty and oversized comments', async () => {
    const source = new MockSource()
    await source.login('demo', 'password')
    await expect(
      source.createComment({ postId: 'post_01', content: '   ' }),
    ).rejects.toThrow('Comment cannot be empty')
    await expect(
      source.createComment({ postId: 'post_01', content: 'x'.repeat(5001) }),
    ).rejects.toThrow('Comment is too long')
  })

  it('requires auth to react and persists reactions', async () => {
    const source = new MockSource()
    await expect(
      source.toggleReaction({ postId: 'post_01', type: 'like' }),
    ).rejects.toThrow('LOGIN_REQUIRED')

    await source.login('demo', 'password')
    await source.toggleReaction({ postId: 'post_01', type: 'like' })
    const stored = JSON.parse(localStorage.getItem('ncmaz.mock.reactions.v1') ?? '[]')
    expect(stored).toHaveLength(1)
  })

  it('supports post CRUD with role enforcement', async () => {
    const source = new MockSource()

    // Guest cannot create post
    await expect(
      source.createPost({
        title: 'New Story',
        excerpt: 'Story excerpt',
        content: '<p>Content</p>',
      }),
    ).rejects.toThrow('LOGIN_REQUIRED')

    // Subscriber cannot create post
    await source.login('subscriber', 'password')
    await expect(
      source.createPost({
        title: 'New Story',
        excerpt: 'Story excerpt',
        content: '<p>Content</p>',
      }),
    ).rejects.toThrow('FORBIDDEN')

    // Penulis (author) can create post
    await source.login('demo', 'password')
    const created = await source.createPost({
      title: 'Demo Post Title',
      excerpt: 'Exciting excerpt',
      content: '<p>This is test content.</p>',
    })
    expect(created.id).toBeDefined()
    expect(created.author.username).toBe('demo')

    // Retrieve by ID
    const fetched = await source.getPostById(created.id)
    expect(fetched?.title).toBe('Demo Post Title')

    // Update post by author
    const updated = await source.updatePost(created.id, {
      title: 'Demo Post Updated',
      excerpt: 'Updated excerpt',
      content: '<p>Updated content</p>',
    })
    expect(updated.title).toBe('Demo Post Updated')

    // Subscriber cannot update this post
    await source.login('subscriber', 'password')
    await expect(
      source.updatePost(created.id, {
        title: 'Hacked',
        excerpt: 'Hacked',
        content: 'Hacked',
      }),
    ).rejects.toThrow('FORBIDDEN')

    // Delete post by author
    await source.login('demo', 'password')
    await source.deletePost(created.id)
    expect(await source.getPostById(created.id)).toBeNull()
  })

  it('creates and updates posts with postType, media urls, categories and tags', async () => {
    const source = new MockSource()
    await source.login('demo', 'password')

    const cats = await source.listCategories()
    const tags = await source.listTags()

    const created = await source.createPost({
      title: 'Exciting Video Story',
      excerpt: 'Watch this amazing journey.',
      content: '<p>A video story about technology.</p>',
      postType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      categoryIds: [cats[0]!.id, cats[1]!.id],
      tagIds: [tags[0]!.id],
    })

    expect(created.postType).toBe('video')
    expect(created.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(created.categories).toHaveLength(2)
    expect(created.tags).toHaveLength(1)

    const updated = await source.updatePost(created.id, {
      postType: 'audio',
      audioUrl: 'https://example.com/podcast.mp3',
      categoryIds: [cats[0]!.id],
      tagIds: [tags[0]!.id, tags[1]!.id],
    })

    expect(updated.postType).toBe('audio')
    expect(updated.audioUrl).toBe('https://example.com/podcast.mp3')
    expect(updated.categories).toHaveLength(1)
    expect(updated.tags).toHaveLength(2)
  })

  it('supports comment moderation and role management by admin', async () => {
    const source = new MockSource()

    // Subscriber leaves a comment
    await source.login('subscriber', 'password')
    const comment = await source.createComment({
      postId: 'post_01',
      content: 'A comment to moderate',
    })

    // Another author cannot delete it
    await source.login('demo', 'password')
    await expect(source.deleteComment(comment.id)).rejects.toThrow('FORBIDDEN')

    // Admin can delete it
    await source.login('admin', 'password')
    await source.deleteComment(comment.id)
    const allComments = await source.listAllComments()
    expect(allComments.some((c) => c.id === comment.id)).toBe(false)

    // Admin can manage user roles
    const users = await source.listUsers()
    const targetUser = users.find((u) => u.username === 'subscriber')
    expect(targetUser?.role).toBe('subscriber')

    await source.updateUserRole(targetUser!.id, 'penulis')
    const refreshedUsers = await source.listUsers()
    expect(refreshedUsers.find((u) => u.id === targetUser!.id)?.role).toBe('penulis')

    // Admin can update site settings
    const settings = await source.getSiteSettings()
    expect(settings.siteName).toBe('Blogku')
    const updatedSettings = await source.updateSiteSettings({
      siteName: 'Blogku Pro',
      logo: 'https://example.com/logo.png',
      favicon: 'https://example.com/favicon.png',
      allowedImageDomains: ['images.unsplash.com', 'cdn.custom.com'],
    })
    expect(updatedSettings.siteName).toBe('Blogku Pro')
    expect(updatedSettings.logo).toBe('https://example.com/logo.png')
    expect(updatedSettings.allowedImageDomains).toContain('cdn.custom.com')
  })

  it('handles image file upload and validates size/type', async () => {
    const source = new MockSource()
    const validFile = new File(['dummy-content'], 'test.png', { type: 'image/png' })
    const result = await source.uploadFile(validFile)
    expect(result.url).toBeDefined()
    expect(result.name).toBe('test.png')

    const invalidFile = new File(['bad'], 'script.exe', { type: 'application/x-msdownload' })
    await expect(source.uploadFile(invalidFile)).rejects.toThrow('Only image files')
  })

  it('performs full CRUD for categories and tags', async () => {
    const source = new MockSource()
    await source.login('admin', 'password')

    // Create Category
    const newCat = await source.createCategory({
      name: 'Artificial Intelligence',
      slug: 'ai',
      description: 'AI and ML editorial stories',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
    })
    expect(newCat.id).toBeDefined()
    expect(newCat.slug).toBe('ai')

    let allCats = await source.listCategories()
    expect(allCats.some((c) => c.slug === 'ai')).toBe(true)

    // Update Category
    const updatedCat = await source.updateCategory(newCat.id, {
      name: 'AI & Robotics',
      slug: 'ai-robotics',
    })
    expect(updatedCat.name).toBe('AI & Robotics')
    expect(updatedCat.slug).toBe('ai-robotics')

    // Delete Category
    await source.deleteCategory(newCat.id)
    allCats = await source.listCategories()
    expect(allCats.some((c) => c.id === newCat.id)).toBe(false)

    // Create Tag
    const newTag = await source.createTag({
      name: 'robotics',
      slug: 'robotics',
    })
    expect(newTag.id).toBeDefined()
    expect(newTag.name).toBe('robotics')

    let allTags = await source.listTags()
    expect(allTags.some((t) => t.slug === 'robotics')).toBe(true)

    // Update Tag
    const updatedTag = await source.updateTag(newTag.id, {
      name: 'advanced-robotics',
      slug: 'advanced-robotics',
    })
    expect(updatedTag.name).toBe('advanced-robotics')

    // Delete Tag
    await source.deleteTag(newTag.id)
    allTags = await source.listTags()
    expect(allTags.some((t) => t.id === newTag.id)).toBe(false)
  })
})
