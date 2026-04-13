import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/invoices/[id]/pixel.gif
 *
 * Tracking pixel embedded in invoice emails. On the first GET, marks the
 * invoice as viewed (status='viewed', viewed_at=now). Subsequent GETs are
 * no-ops. Always returns a 1x1 transparent GIF so the image renders in the
 * recipient's email client.
 *
 * No auth — this is a public beacon URL. The only thing it reveals is that
 * the invoice was opened, which is non-sensitive on its own (and is the
 * entire point of the beacon).
 */

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
])

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Content-Length': String(TRANSPARENT_GIF.length),
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
} as const

function pixelResponse() {
  return new NextResponse(new Uint8Array(TRANSPARENT_GIF), { status: 200, headers: PIXEL_HEADERS })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params

  // Use service-role client — pixel endpoint has no session cookie.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // Still return the pixel so the email renders; log the misconfiguration.
    console.error('[invoice pixel] Supabase service credentials not configured')
    return pixelResponse()
  }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // Read current status + viewed_at — skip update if already viewed or past viewed state.
  const { data: row } = await admin
    .from('invoices')
    .select('status, viewed_at')
    .eq('id', invoiceId)
    .single()

  const current = row as { status: string; viewed_at: string | null } | null
  if (!current) return pixelResponse()

  // Only mark as viewed on the first hit, and only if status is still 'sent'.
  // This respects the existing transition validator and prevents a 'paid'
  // invoice from getting reverted to 'viewed' by a late email open.
  if (current.viewed_at === null && current.status === 'sent') {
    const now = new Date().toISOString()
    const { error: updateErr } = await admin
      .from('invoices')
      .update({ status: 'viewed', viewed_at: now })
      .eq('id', invoiceId)
      .eq('status', 'sent') // race guard
    if (updateErr) {
      console.error('[invoice pixel] update failed:', updateErr.message)
    }
  }

  return pixelResponse()
}
