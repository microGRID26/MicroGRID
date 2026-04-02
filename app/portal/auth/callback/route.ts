import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const origin = request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/portal/login?error=no_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // Exchange code for session
  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  if (sessionError || !sessionData.user) {
    console.error('[portal auth callback] session exchange failed:', sessionError)
    return NextResponse.redirect(`${origin}/portal/login?error=auth_failed`)
  }

  const userEmail = sessionData.user.email?.toLowerCase()
  if (!userEmail) {
    return NextResponse.redirect(`${origin}/portal/login?error=no_email`)
  }

  // Look up customer account
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .select('id, auth_user_id, status')
    .eq('email', userEmail)
    .single()

  if (accountError || !account) {
    console.error('[portal auth callback] no customer account for:', userEmail)
    // Sign out — this isn't a registered customer
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/portal/login?error=not_registered`)
  }

  if (account.status === 'suspended') {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/portal/login?error=suspended`)
  }

  // Link auth_user_id if first login
  if (!account.auth_user_id) {
    await supabase
      .from('customer_accounts')
      .update({
        auth_user_id: sessionData.user.id,
        status: 'active',
        last_login_at: new Date().toISOString(),
      })
      .eq('id', account.id)
  } else {
    // Update last login
    await supabase
      .from('customer_accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', account.id)
  }

  // Set portal cookie so proxy knows this is a portal session
  cookieStore.set('mg_portal', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return NextResponse.redirect(`${origin}/portal/dashboard`)
}
