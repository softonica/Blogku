import { z } from 'zod'
import { sanitizeEmail, sanitizeHtml, sanitizePlainText, sanitizeUrl } from './sanitize'

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length >= 2, { message: 'Enter your username or email' }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .transform((val) => sanitizePlainText(val))
      .refine((val) => val.length >= 2, { message: 'Enter your name' }),
    username: z
      .string()
      .trim()
      .transform((val) => sanitizePlainText(val))
      .refine((val) => val.length >= 3, { message: 'Username must be at least 3 characters' })
      .refine((val) => /^[a-z0-9-]+$/.test(val), {
        message: 'Use lowercase letters, numbers and dashes',
      }),
    email: z
      .string()
      .trim()
      .transform((val) => sanitizeEmail(val))
      .pipe(z.email('Enter a valid email')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  })

export const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((val) => sanitizeEmail(val))
    .pipe(z.email('Enter a valid email')),
})

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length >= 2, { message: 'Write at least 2 characters' })
    .refine((val) => val.length <= 5000, {
      message: 'Comment must be 5,000 characters or less',
    }),
  website: z.string().max(0, 'Leave this field empty').optional(),
})

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .transform((val) => sanitizeEmail(val))
    .pipe(z.email('Enter a valid email')),
})

export const draftSchema = z.object({
  title: z
    .string()
    .trim()
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length >= 4, { message: 'Title must be at least 4 characters' })
    .refine((val) => val.length <= 140, { message: 'Title must be 140 characters or less' }),
  excerpt: z
    .string()
    .trim()
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length >= 10, { message: 'Excerpt must be at least 10 characters' })
    .refine((val) => val.length <= 300, { message: 'Excerpt must be 300 characters or less' }),
  content: z
    .string()
    .trim()
    .transform((val) => sanitizeHtml(val))
    .refine((val) => val.length >= 20, { message: 'Content must be at least 20 characters' })
    .refine((val) => val.length <= 50000, {
      message: 'Content must be 50,000 characters or less',
    }),
  postType: z.enum(['standard', 'video', 'audio', 'gallery']).default('standard'),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  cover: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeUrl(val) : undefined)),
  videoUrl: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeUrl(val) : undefined)),
  audioUrl: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeUrl(val) : undefined)),
})

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length >= 2, { message: 'Category name must be at least 2 characters' })
    .refine((val) => val.length <= 60, { message: 'Category name must be 60 characters or less' }),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? sanitizePlainText(val).toLowerCase() : undefined)),
  description: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? sanitizePlainText(val) : '')),
  image: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? sanitizeUrl(val) : '')),
  parentId: z.string().nullable().optional(),
})

export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .transform((val) => sanitizePlainText(val))
    .refine((val) => val.length >= 2, { message: 'Tag name must be at least 2 characters' })
    .refine((val) => val.length <= 40, { message: 'Tag name must be 40 characters or less' }),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? sanitizePlainText(val).toLowerCase() : undefined)),
})

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the form'
}
