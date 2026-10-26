import PocketBase from 'pocketbase'

function originUrl(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function resolveUrl(): string {
  const fromEnv = (import.meta.env.VITE_PB_URL as string | undefined)?.trim()
  return fromEnv ?? originUrl()
}

export function createPb(): PocketBase {
  const pb = new PocketBase(resolveUrl())
  pb.autoCancellation(false)
  return pb
}

let singleton: PocketBase | null = null

/**
 * Returns the app-wide PocketBase client. The SDK persists the auth token in
 * its own local storage (LocalAuthStore), so the session survives reloads.
 */
export function getPb(): PocketBase {
  if (!singleton) singleton = createPb()
  return singleton
}

export function resetPbForTests(): void {
  singleton = null
}
