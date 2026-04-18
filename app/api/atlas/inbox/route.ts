import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type InboxRow = {
  question_id: number
  question: string
  asked_at: string
  action_id: number
  answer: string
  answered_at: string
}

export async function GET() {
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

  const { data, error } = await supabase.rpc('atlas_inbox_answers', { p_limit: 20 })
  if (error) {
    console.error('[atlas/inbox] rpc failed:', error.message)
    return NextResponse.json({ error: 'Failed to load inbox' }, { status: 500 })
  }

  return NextResponse.json({ items: (data ?? []) as InboxRow[] })
}
