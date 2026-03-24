'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePreferences } from '@/lib/usePreferences'

export default function Home() {
  const router = useRouter()
  const { prefs, loaded } = usePreferences()

  useEffect(() => {
    if (!loaded) return
    router.replace(prefs.homepage || '/command')
  }, [loaded, prefs.homepage, router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-green-400 text-sm animate-pulse">Loading...</div>
    </div>
  )
}
