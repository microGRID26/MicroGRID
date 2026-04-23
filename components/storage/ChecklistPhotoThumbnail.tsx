'use client'

import { useSignedUrl } from './useSignedUrl'

interface Props {
  path?: string | null
  legacyUrl?: string | null
  // Tailwind size (renders w-{size} h-{size}). Default 16 = 64px.
  size?: number
}

// Signed-URL-aware replacement for the `<a><img src={photo_url}/></a>` pattern
// used in WODetail.tsx and app/mobile/field ProjectDetail.tsx. Keeps the
// existing tile styling (rounded, bordered, hover green on desktop) but the
// underlying src is now a signed URL against the private wo-photos bucket.
export default function ChecklistPhotoThumbnail({ path, legacyUrl, size = 16 }: Props) {
  const signedUrl = useSignedUrl('wo-photos', path, legacyUrl)

  if (!path && !legacyUrl) return null
  if (!signedUrl) return null

  const sizeClass = size === 12 ? 'w-12 h-12' : 'w-16 h-16'

  return (
    <a href={signedUrl} target="_blank" rel="noopener noreferrer">
      <img
        src={signedUrl}
        alt=""
        className={`${sizeClass} object-cover rounded border border-gray-700 hover:border-green-500 transition-colors`}
      />
    </a>
  )
}
