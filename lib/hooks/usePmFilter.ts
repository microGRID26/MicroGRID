'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'

const LS_KEY = 'mg_pm'

interface PmOption {
  id: string
  name: string
}

interface UsePmFilterReturn {
  /** Currently selected PM ID, or '' for all PMs */
  pmFilter: string
  /** Set the PM filter (persists to localStorage) */
  setPmFilter: (pmId: string) => void
  /** Dropdown options derived from loaded data */
  pmOptions: PmOption[]
  /** True when a specific PM is selected (not 'all') */
  isMyProjects: boolean
}

/**
 * Shared PM filter hook used by Command and Queue pages.
 *
 * Reads from localStorage (`mg_pm`) on mount. Auto-selects the current
 * user on first mount if no saved value exists.
 *
 * @param users - array of { id, name } objects extracted from loaded projects
 * @param mode  - 'queue' uses '' for "all", 'command' uses 'all' for "all"
 */
export function usePmFilter(
  users: { id: string; name: string }[],
  mode: 'command' | 'queue' = 'queue',
): UsePmFilterReturn {
  const { user: currentUser } = useCurrentUser()
  const allValue = mode === 'command' ? 'all' : ''

  const [pmFilter, setPmFilterRaw] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) return stored
    }
    return allValue
  })

  // Auto-select current user on first mount if no saved value
  const autoSet = useRef(false)
  useEffect(() => {
    if (currentUser?.id && !autoSet.current) {
      autoSet.current = true
      // Only auto-set if no valid stored value
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LS_KEY)
        if (!stored) {
          setPmFilterRaw(currentUser.id)
          localStorage.setItem(LS_KEY, currentUser.id)
        }
      }
    }
  }, [currentUser])

  const setPmFilter = useCallback((pmId: string) => {
    setPmFilterRaw(pmId)
    if (pmId && pmId !== 'all') {
      localStorage.setItem(LS_KEY, pmId)
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }, [])

  const pmOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) {
      if (u.id && u.name) map.set(u.id, u.name)
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users])

  const isMyProjects = pmFilter !== allValue && pmFilter !== ''

  return { pmFilter, setPmFilter, pmOptions, isMyProjects }
}
