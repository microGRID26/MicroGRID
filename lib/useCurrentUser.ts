'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CurrentUser {
  email: string
  name: string
  admin: boolean
  superAdmin: boolean
}

let cached: CurrentUser | null = null

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data.user?.email
      if (!email) { setLoading(false); return }
      const { data: u } = await (supabase as any)
        .from('users').select('name, admin, super_admin, email')
        .eq('email', email).single()
      const resolved: CurrentUser = u
        ? { email: u.email, name: u.name, admin: u.admin, superAdmin: u.super_admin === true }
        : { email, name: email.split('@')[0], admin: false, superAdmin: false }
      cached = resolved
      setUser(resolved)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
