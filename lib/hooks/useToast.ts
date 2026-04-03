'use client'

import { useState, useCallback, useRef } from 'react'

export interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
}

const TOAST_DURATION = 3000

/**
 * Shared toast hook — replaces ad-hoc setTimeout(() => setToast(null), N) patterns.
 * Usage: const { toast, showToast } = useToast()
 */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, type })
    timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION)
  }, [])

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return { toast, showToast, dismissToast }
}
