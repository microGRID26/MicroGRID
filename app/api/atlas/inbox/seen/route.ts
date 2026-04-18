import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    },
  )

  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { question_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const qid = Number(body.question_id)
  if (!Number.isFinite(qid) || qid <= 0) {
    return NextResponse.json({ error: 'Invalid question_id' }, { status: 400 })
  }

  const { error } = await supabase.rpc('atlas_mark_inbox_seen', { p_question_id: qid })
  if (error) {
    console.error('[atlas/inbox/seen] rpc failed:', error.message)
    return NextResponse.json({ error: 'Failed to mark seen' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
