'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/useCurrentUser'

export function SessionTracker() {
  const { user } = useCurrentUser()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPathRef = useRef<string>('')

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'

    // Create session
    ;(supabase as any)
      .from('user_sessions')
      .insert({
        user_id: user.id,
        user_name: user.name,
        user_email: user.email,
        logged_in_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        page: currentPath,
      })
      .select('id')
      .single()
      .then(({ data }: { data: { id: string } | null }) => {
        if (data?.id) {
          setSessionId(data.id)
          lastPathRef.current = currentPath
        }
      })
  }, [user?.id, user?.name, user?.email])

  // Heartbeat: update last_active_at and page every 60s
  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()

    intervalRef.current = setInterval(() => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
      ;(supabase as any)
        .from('user_sessions')
        .update({
          last_active_at: new Date().toISOString(),
          page: currentPath,
        })
        .eq('id', sessionId)
        .then(() => {
          lastPathRef.current = currentPath
        })
    }, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionId])

  return null
}
