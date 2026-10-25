import { MockSource } from './mock.source'
import { PocketBaseSource } from './pocketbase.source'
import type { DataSource } from './source'

let source: DataSource = new MockSource()

export function setDataSource(next: DataSource): void {
  source = next
}

export function getDataSource(): DataSource {
  return source
}

export * from './types'
export type { DataSource } from './source'
export { MockSource, PocketBaseSource }
export * from './errors'
