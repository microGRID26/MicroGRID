'use client'

import { useSignedUrl } from './useSignedUrl'

interface Props {
  imagePath: string | null
  imageUrl: string | null
  message: string
  // Used to pick the download-icon emoji (📎 prefix) out of the comment message
  // so we can reconstruct the original filename for the Save As.
  paperclipPrefix?: string
}

// Replaces the inline IIFE in TicketRow.tsx / tickets/page.tsx that read
// `(c as any).image_url` directly. The logic (image thumbnail for image
// mimetypes, download-as-blob button for other file types) is unchanged —
// only the URL source is now a signed URL resolved from image_path (new) or
// parsed from image_url (legacy rows).
export default function TicketCommentAttachment({
  imagePath,
  imageUrl,
  message,
  paperclipPrefix = '\u{1F4CE}',
}: Props) {
  const signedUrl = useSignedUrl('ticket-attachments', imagePath, imageUrl)

  if (!imagePath && !imageUrl) return null
  // Still resolving — render nothing. A spinner here would thrash the
  // comment list; the ticket renders in <100ms on cache hit anyway.
  if (!signedUrl) return null

  // The stored path (or the filename portion of the legacy URL) is what we
  // use to decide whether this attachment is an image. The signed URL
  // includes query params, so a regex on the signed URL would miss.
  const nameForTypeCheck = imagePath ?? imageUrl ?? ''
  const isImage = /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/i.test(nameForTypeCheck)

  if (isImage) {
    return (
      <a href={signedUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={signedUrl}
          alt="Attachment"
          className="max-w-[200px] rounded-lg mt-1 mb-1 cursor-pointer hover:opacity-80"
        />
      </a>
    )
  }

  // Non-image file: render a download button that fetches the blob and
  // triggers a save-as with the comment's original filename (so the
  // download isn't named `<random>.pdf?token=...`).
  const paperclipRx = new RegExp(`${paperclipPrefix}\\s*`, 'u')
  const displayName = message.replace(paperclipRx, '').trim()
  const urlExt = nameForTypeCheck.split('.').pop()?.split('?')[0] ?? ''
  const downloadName = displayName.match(/\.\w+$/) ? displayName : `attachment.${urlExt}`

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const resp = await fetch(signedUrl)
          const blob = await resp.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = downloadName
          a.click()
          URL.revokeObjectURL(url)
        } catch {
          window.open(signedUrl, '_blank')
        }
      }}
      className="flex items-center gap-2 mt-1 mb-1 px-3 py-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors text-left"
    >
      <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="text-[11px] text-gray-200 truncate">{downloadName}</span>
    </button>
  )
}
