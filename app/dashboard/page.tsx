'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Dashboard merged into Command Center — redirect for bookmarks/links
export default function DashboardPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/command') }, [router])
  return null
}
