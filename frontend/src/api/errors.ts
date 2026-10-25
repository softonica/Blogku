/**
 * Normalized error contract for the data layer (PocketBase integration).
 *
 * UI code should never surface raw HTTP/SDK error payloads. This module maps
 * PocketBase `ClientResponseError` objects (and the mock source's plain
 * strings) into typed errors the UI can render and react to.
 */

export class AppError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AppError'
    this.status = status
  }
}

/**
 * Thrown when the server/edge returns `429 Too Many Requests`.
 * Carries the number of seconds to wait before retrying. UI should disable
 * submit buttons for `retryAfter` seconds and never auto-retry.
 */
export class RateLimitError extends AppError {
  readonly retryAfter: number

  constructor(retryAfter: number) {
    const seconds = Math.max(
      1,
      Math.ceil(Number.isFinite(retryAfter) ? retryAfter : 30),
    )
    super(`Too many requests. Please try again in ${seconds} seconds.`, 429)
    this.name = 'RateLimitError'
    this.retryAfter = seconds
  }
}

interface DataLike {
  message?: string
  data?: Record<string, { message?: string }>
}

interface ErrorLike {
  status?: number
  data?: DataLike
  response?: { status?: number; headers?: { get(name: string): string | null } }
}

function asErrorLike(value: unknown): ErrorLike | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as ErrorLike
  if (
    typeof candidate.status === 'number' ||
    typeof candidate.response?.status === 'number' ||
    candidate.data ||
    candidate.response
  ) {
    return candidate
  }
  return null
}

export function getStatus(err: unknown): number | undefined {
  const like = asErrorLike(err)
  if (like) {
    return like.response?.status ?? like.status
  }
  return undefined
}

function getRetryAfter(err: unknown): number {
  const like = asErrorLike(err)
  if (like?.response?.headers) {
    const header = like.response.headers.get('Retry-After')
    if (header) {
      const parsed = Number.parseInt(header, 10)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  if (like?.data) {
    const retry = like.data.data?.retryAfter ?? (like.data as { retryAfter?: number }).retryAfter
    if (typeof retry === 'number' && Number.isFinite(retry)) return Math.ceil(retry)
  }
  return 30
}

function firstFieldMessage(data: DataLike | undefined): string {
  if (!data?.data) return ''
  for (const field of Object.values(data.data)) {
    if (field?.message) return field.message
  }
  return ''
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Invalid input. Please check your entries.',
  401: 'LOGIN_REQUIRED',
  403: 'FORBIDDEN',
  404: 'The requested item was not found.',
  409: 'This action conflicts with existing data. Please refresh and try again.',
  500: 'The server is having trouble. Please try again.',
}

/**
 * Converts any thrown value into a normalized `Error`.
 * `nullOn404` callers handle 404 themselves (getters return null); this hook
 * is only used by mutating methods.
 */
export function toAppError(err: unknown): Error {
  if (err instanceof AppError) return err
  const status = getStatus(err)

  if (status === 429) {
    return new RateLimitError(getRetryAfter(err))
  }

  if (status === 0) {
    return new AppError(
      'Unable to reach the server. Check your connection and try again.',
      status,
    )
  }

  if (typeof status === 'number') {
    if (status === 400) {
      const like = asErrorLike(err)
      const fieldMessage = firstFieldMessage(like?.data)
      if (fieldMessage) return new AppError(fieldMessage, status)
      return new AppError(DEFAULT_MESSAGES[400], status)
    }
    if (status === 409) {
      const like = asErrorLike(err)
      const serverMessage =
        like?.data?.message?.trim() || firstFieldMessage(like?.data)
      return new AppError(serverMessage || DEFAULT_MESSAGES[409], status)
    }
    if (status >= 500) {
      return new AppError(DEFAULT_MESSAGES[500], status)
    }
    return new AppError(DEFAULT_MESSAGES[status] ?? `Request failed (${status}).`, status)
  }

  if (err instanceof Error) return err

  return new AppError('Something went wrong. Please try again.')
}
