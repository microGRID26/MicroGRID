'use client'

import { useEffect, useState } from 'react'
import { resolveSignedUrl, type SignedBucket } from '@/lib/storage/signed-url'

// useSignedUrl(bucket, path, legacyUrl) — resolve and return a signed URL
// for the given object. Returns null while loading or on failure. Re-fetches
// whenever any input changes.
//
// Use this when the existing UI needs a plain URL string (e.g. to pass to a
// blob-download button that fetches the URL then triggers a download). For
// simple <img>/<a> rendering, prefer <SignedImage>/<SignedLink> instead.
export function useSignedUrl(
  bucket: SignedBucket,
  path?: string | null,
  legacyUrl?: string | null,
  ttlSeconds?: number,
): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path && !legacyUrl) {
      setUrl(null)
      return
    }
    let cancelled = false
    resolveSignedUrl(bucket, { path, legacyUrl, ttlSeconds }).then(signed => {
      if (!cancelled) setUrl(signed)
    })
    return () => {
      cancelled = true
    }
  }, [bucket, path, legacyUrl, ttlSeconds])

  return url
}
