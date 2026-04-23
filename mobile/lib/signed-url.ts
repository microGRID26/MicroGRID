import { supabase } from './supabase'

// Mirror of MicroGRID web's lib/storage/signed-url.ts. Kept separate because
// RN and Next share no module tree; any change here should be mirrored there.
// See supabase/migrations/150-storage-paths-for-private-buckets.sql for the
// list of buckets flipped private on 2026-04-23.
export type SignedBucket =
  | 'wo-photos'
  | 'ticket-attachments'
  | 'rep-files'
  | 'customer-feedback'
  | 'spoke-feedback'
  | 'Project-documents'

export const DEFAULT_SIGN_TTL = 3600

export function parsePathFromLegacyUrl(url: string, bucket: SignedBucket): string | null {
  const pattern = new RegExp(
    `^https?://[^/]+/storage/v1/object/(?:public/)?${bucket.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}/(.+)$`,
  )
  const m = url.match(pattern)
  return m ? m[1] : null
}

const PATH_ALLOW_RX = /^[A-Za-z0-9_./\- ]+$/
function isPathSafe(path: string): boolean {
  if (!path) return false
  if (path.length > 512) return false
  if (path.startsWith('/')) return false
  if (path.includes('//')) return false
  if (path.includes('..')) return false
  return PATH_ALLOW_RX.test(path)
}

export async function signStoragePath(
  bucket: SignedBucket,
  path: string,
  ttlSeconds: number = DEFAULT_SIGN_TTL,
): Promise<string | null> {
  if (!isPathSafe(path)) {
    console.warn(`[signStoragePath:${bucket}] rejected unsafe path (len=${path.length})`)
    return null
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds)
  if (error || !data?.signedUrl) {
    if (error) console.error(`[signStoragePath:${bucket}]`, error.message)
    return null
  }
  return data.signedUrl
}

export async function resolveSignedUrl(
  bucket: SignedBucket,
  opts: { path?: string | null; legacyUrl?: string | null; ttlSeconds?: number },
): Promise<string | null> {
  const ttl = opts.ttlSeconds ?? DEFAULT_SIGN_TTL
  const path = opts.path ?? (opts.legacyUrl ? parsePathFromLegacyUrl(opts.legacyUrl, bucket) : null)
  if (!path) return null
  return signStoragePath(bucket, path, ttl)
}
