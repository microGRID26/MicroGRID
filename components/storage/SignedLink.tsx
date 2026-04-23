'use client'

import { useCallback, useState } from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { resolveSignedUrl, type SignedBucket } from '@/lib/storage/signed-url'

interface SignedLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  bucket: SignedBucket
  path?: string | null
  legacyUrl?: string | null
  ttlSeconds?: number
  // Label displayed inside the <a>. Most call sites pass children instead.
  children?: React.ReactNode
}

// <SignedLink bucket="rep-files" path={f.file_path} legacyUrl={f.file_url}>Download</SignedLink>
//
// Replaces <a href={publicUrl}> for downloadable attachments that live in a
// private bucket. We sign lazily on click — no fetch at render time — so a
// list of 20 files doesn't fire 20 signed-URL requests. On click we sign,
// then programmatically open the URL in a new tab.
//
// If signing fails (object deleted, network error) we swallow the click and
// log — better than handing the user a broken-link anchor.
export default function SignedLink({
  bucket,
  path,
  legacyUrl,
  ttlSeconds,
  children,
  onClick,
  target = '_blank',
  rel = 'noopener noreferrer',
  ...anchorProps
}: SignedLinkProps) {
  const [signing, setSigning] = useState(false)

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLAnchorElement>) => {
      if (onClick) onClick(e)
      if (e.defaultPrevented) return
      if (!path && !legacyUrl) {
        e.preventDefault()
        return
      }
      e.preventDefault()
      if (signing) return
      setSigning(true)
      try {
        const signed = await resolveSignedUrl(bucket, { path, legacyUrl, ttlSeconds })
        if (signed) {
          // Open in a new tab just like target="_blank" on a normal <a>.
          window.open(signed, target === '_self' ? '_self' : '_blank', 'noopener,noreferrer')
        } else {
          console.warn(`[SignedLink:${bucket}] could not resolve signed URL`)
        }
      } finally {
        setSigning(false)
      }
    },
    [bucket, path, legacyUrl, ttlSeconds, signing, onClick, target],
  )

  return (
    <a
      href="#"
      target={target}
      rel={rel}
      {...anchorProps}
      onClick={handleClick}
      aria-busy={signing || undefined}
    >
      {children}
    </a>
  )
}
