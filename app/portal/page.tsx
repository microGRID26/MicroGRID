'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalRoot() {
  const router = useRouter()
  useEffect(() => { router.replace('/portal/dashboard') }, [router])
  return null
}
