import { createClient } from '@/lib/supabase/client'

// Buckets that were flipped from public=true to public=false on 2026-04-23
// to close the `public_bucket_allows_listing` advisor finding. Every read
// of an object in these buckets now has to go through createSignedUrl(path).
// This file centralizes that call so the retry/parse logic lives in exactly
// one place.
export type SignedBucket =
  | 'wo-photos'
  | 'ticket-attachments'
  | 'rep-files'
  | 'customer-feedback'
  | 'spoke-feedback'
  | 'Project-documents'

// Default signed-URL TTL. 1 hour is long enough that a page doesn't need to
// refresh URLs mid-session but short enough that a leaked URL expires before
// it can be shared widely.
export const DEFAULT_SIGN_TTL = 3600

// Pull the object path out of a legacy public URL. Example:
//   https://abc.supabase.co/storage/v1/object/public/ticket-attachments/foo.jpg
//                                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                                    └ returned: foo.jpg
// Returns null for anything that doesn't match the bucket's public-URL shape.
export function parsePathFromLegacyUrl(url: string, bucket: SignedBucket): string | null {
  const pattern = new RegExp(
    `^https?://[^/]+/storage/v1/object/(?:public/)?${bucket.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}/(.+)$`,
  )
  const m = url.match(pattern)
  return m ? m[1] : null
}

// Reject paths with traversal, URL-reserved chars, or anything beyond the
// filename-safe set the MG uploaders actually produce. Defense-in-depth
// against a tainted DB row being passed straight through to createSignedUrl.
// Mirrors ATLAS-HQ/lib/storage/mg-sign.ts isPathSafe.
const PATH_ALLOW_RX = /^[A-Za-z0-9_./\- ]+$/
function isPathSafe(path: string): boolean {
  if (!path) return false
  if (path.length > 512) return false
  if (path.startsWith('/')) return false
  if (path.includes('//')) return false
  if (path.includes('..')) return false
  return PATH_ALLOW_RX.test(path)
}

// Sign a path against the given bucket. Returns the signed URL, or null on
// failure. Caller decides how to render null (broken image placeholder,
// "attachment unavailable" label, etc.).
export async function signStoragePath(
  bucket: SignedBucket,
  path: string,
  ttlSeconds: number = DEFAULT_SIGN_TTL,
): Promise<string | null> {
  if (!isPathSafe(path)) {
    console.warn(`[signStoragePath:${bucket}] rejected unsafe path (len=${path.length})`)
    return null
  }
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds)
  if (error || !data?.signedUrl) {
    if (error) console.error(`[signStoragePath:${bucket}]`, error.message)
    return null
  }
  return data.signedUrl
}

// Convenience for the transition: accept either a stored path OR a legacy
// public URL and return a freshly-signed URL. Prefers `path` when both are
// present. Used by read sites that still carry rows written before the
// storage_path backfill landed.
export async function resolveSignedUrl(
  bucket: SignedBucket,
  opts: { path?: string | null; legacyUrl?: string | null; ttlSeconds?: number },
): Promise<string | null> {
  const ttl = opts.ttlSeconds ?? DEFAULT_SIGN_TTL
  const path = opts.path ?? (opts.legacyUrl ? parsePathFromLegacyUrl(opts.legacyUrl, bucket) : null)
  if (!path) return null
  return signStoragePath(bucket, path, ttl)
}
