'use client'

import { useEffect, useRef, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'
import { resolveSignedUrl, type SignedBucket } from '@/lib/storage/signed-url'

interface SignedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  bucket: SignedBucket
  // Preferred: the stored object path (new *_path columns after migration 150).
  path?: string | null
  // Fallback for rows written before the migration that still only have a
  // public URL persisted. The helper extracts the path and signs it.
  legacyUrl?: string | null
  // How long the signed URL should live. Default 1h.
  ttlSeconds?: number
  // Rendered while the sign request is in flight. Defaults to null (no DOM).
  placeholder?: React.ReactNode
  // Rendered if path/URL resolution fails (network error, object deleted).
  // Defaults to null.
  fallback?: React.ReactNode
}

// <SignedImage bucket="ticket-attachments" path={c.image_path} legacyUrl={c.image_url} />
//
// Replaces <img src={publicUrl}> patterns now that the 6 buckets from
// migration 150 are private. Fetches a fresh signed URL on mount (and
// whenever `path`/`legacyUrl` change) and renders the <img> once the URL
// resolves. Renders nothing (or `placeholder`) while the fetch is in flight,
// and nothing (or `fallback`) if the fetch fails.
export default function SignedImage({
  bucket,
  path,
  legacyUrl,
  ttlSeconds,
  placeholder = null,
  fallback = null,
  ...imgProps
}: SignedImageProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const requestId = useRef(0)

  useEffect(() => {
    if (!path && !legacyUrl) {
      setState('error')
      setUrl(null)
      return
    }
    const current = ++requestId.current
    setState('loading')
    resolveSignedUrl(bucket, { path, legacyUrl, ttlSeconds }).then(signed => {
      // Skip stale responses if the props changed while the fetch was in flight.
      if (current !== requestId.current) return
      if (signed) {
        setUrl(signed)
        setState('ready')
      } else {
        setUrl(null)
        setState('error')
      }
    })
  }, [bucket, path, legacyUrl, ttlSeconds])

  if (state === 'loading') return <>{placeholder}</>
  if (state === 'error' || !url) return <>{fallback}</>
  return <img src={url} {...imgProps} />
}
