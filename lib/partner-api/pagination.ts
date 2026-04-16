// lib/partner-api/pagination.ts — Cursor-based pagination helpers.
//
// Cursors are base64url-encoded JSON: {"t": <ISO>, "id": "<uuid-or-id>"}. Decoded
// by the handler, used as a tie-breaking bound on (created_at, id) so the list
// stays stable under inserts.

import { ApiError } from './errors'

export interface Cursor {
  /** Created-at value as ISO 8601. */
  t: string
  /** Row id for tie-breaking when multiple rows share created_at. */
  id: string
}

const MAX_PAGE = 100
const DEFAULT_PAGE = 25

export function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_PAGE
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) {
    throw new ApiError('invalid_request', '`limit` must be a positive integer')
  }
  return Math.min(n, MAX_PAGE)
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url')
}

export function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(json) as unknown
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as Cursor).t !== 'string' ||
      typeof (parsed as Cursor).id !== 'string'
    ) {
      throw new Error('cursor payload must have {t, id} strings')
    }
    return parsed as Cursor
  } catch (err) {
    throw new ApiError('invalid_request', 'Invalid cursor', {
      reason: err instanceof Error ? err.message : String(err),
    })
  }
}

/** Shape of a paginated list response. Consistent across all list endpoints. */
export interface ListResponse<T> {
  data: T[]
  cursor: string | null        // opaque — clients should echo back verbatim
  has_more: boolean
}

/** Build a paginated response from a batch of rows. Assumes rows already
 *  sorted by (created_at DESC, id DESC) and limited to `limit + 1`. */
export function buildListResponse<T extends { created_at: string; id: string }>(
  rows: T[],
  limit: number,
): ListResponse<T> {
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const cursor = hasMore && last
    ? encodeCursor({ t: last.created_at, id: last.id })
    : null
  return { data: page, cursor, has_more: hasMore }
}
