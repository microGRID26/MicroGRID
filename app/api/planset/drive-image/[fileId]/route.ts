/**
 * GET /api/planset/drive-image/[fileId]
 *
 * Proxies a Google Drive file through our server so it can be served in an
 * <img> tag on /planset. Drive doesn't support signed URLs (only GCS does),
 * so we stream bytes through. Auth-gated — only authenticated CRM users can
 * hit this endpoint.
 *
 * Hard MIME gate (images only) + 10MB size cap so a misclassified 4K TIFF
 * can't bomb the server. Browser-cached 5 min.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getFileMetadata, getFileBytes } from '@/lib/google-drive'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await rateLimit(`planset-img:${user.email}`, {
    windowMs: 60_000, max: 300, prefix: 'planset-img',
  })
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { fileId } = await context.params
  if (!fileId || fileId.length > 128) {
    return NextResponse.json({ error: 'invalid fileId' }, { status: 400 })
  }

  // Metadata check first — enforce MIME + size cap before streaming bytes
  const meta = await getFileMetadata(fileId)
  if (!meta) {
    return NextResponse.json({ error: 'file not found or not accessible' }, { status: 404 })
  }
  if (!ALLOWED_MIMES.has(meta.mimeType)) {
    return NextResponse.json({ error: `unsupported mime: ${meta.mimeType}` }, { status: 415 })
  }
  const size = meta.size ? parseInt(meta.size, 10) : 0
  if (size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: `file too large: ${size} bytes` }, { status: 413 })
  }

  const result = await getFileBytes(fileId)
  if (!result) {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  }

  return new NextResponse(result.bytes, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
