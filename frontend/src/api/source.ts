import type {
  Category,
  CategoryInput,
  Comment,
  ListPostsParams,
  Page,
  Post,
  PostInput,
  ReactionType,
  Role,
  SiteSettings,
  Tag,
  TagInput,
  User,
} from './types'

export interface DataSource {
  listPosts(p: ListPostsParams): Promise<Page<Post>>
  getPostBySlug(slug: string): Promise<Post | null>
  getPostById(id: string): Promise<Post | null>
  createPost(input: PostInput): Promise<Post>
  updatePost(id: string, input: Partial<PostInput>): Promise<Post>
  deletePost(id: string): Promise<void>
  listCategories(): Promise<Category[]>
  createCategory(input: CategoryInput): Promise<Category>
  updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category>
  deleteCategory(id: string): Promise<void>
  saveCategory(input: CategoryInput): Promise<Category>
  listComments(postId: string): Promise<Comment[]>
  createComment(input: { postId: string; content: string }): Promise<Comment>
  deleteComment(id: string): Promise<void>
  listAllComments(): Promise<Comment[]>
  toggleReaction(input: {
    postId: string
    type: ReactionType
  }): Promise<void>
  login(username: string, password: string): Promise<User>
  logout(): Promise<void>
  currentUser(): User | null

  listTags(): Promise<Tag[]>
  createTag(input: TagInput): Promise<Tag>
  updateTag(id: string, input: Partial<TagInput>): Promise<Tag>
  deleteTag(id: string): Promise<void>
  listAuthors(): Promise<User[]>
  getUserByUsername(username: string): Promise<User | null>
  listAuthorsFeatured(limit: number): Promise<User[]>

  listUsers(): Promise<User[]>
  updateUserRole(userId: string, role: Role): Promise<User>
  getSiteSettings(): Promise<SiteSettings>
  updateSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings>
  updateUserProfile(input: {
    name?: string
    bio?: string
    avatar?: string
  }): Promise<User>
  uploadFile(file: File): Promise<{ url: string; name: string }>
}
