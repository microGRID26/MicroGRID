'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCustomerAccount, loadCustomerProject, loadProjectTimeline, loadProjectSchedule } from '@/lib/api/customer-portal'
import type { CustomerAccount, CustomerProject, StageHistoryEntry, CustomerScheduleEntry } from '@/lib/api/customer-portal'

interface CustomerAuthContext {
  account: CustomerAccount | null
  project: CustomerProject | null
  timeline: StageHistoryEntry[]
  schedule: CustomerScheduleEntry[]
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const CustomerCtx = createContext<CustomerAuthContext>({
  account: null,
  project: null,
  timeline: [],
  schedule: [],
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
})

export function useCustomerAuth() {
  return useContext(CustomerCtx)
}

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<CustomerAccount | null>(null)
  const [project, setProject] = useState<CustomerProject | null>(null)
  const [timeline, setTimeline] = useState<StageHistoryEntry[]>([])
  const [schedule, setSchedule] = useState<CustomerScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const acct = await getCustomerAccount()
    if (!acct) {
      setLoading(false)
      // Not authenticated or not a customer — redirect to login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/portal/login')) {
        window.location.href = '/portal/login'
      }
      return
    }
    setAccount(acct)

    // Load project data in parallel
    const [proj, tl, sched] = await Promise.all([
      loadCustomerProject(acct.project_id),
      loadProjectTimeline(acct.project_id),
      loadProjectSchedule(acct.project_id),
    ])
    setProject(proj)
    setTimeline(tl)
    setSchedule(sched)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear portal cookie
    document.cookie = 'mg_portal=; path=/; max-age=0'
    window.location.href = '/portal/login'
  }, [])

  return (
    <CustomerCtx.Provider value={{ account, project, timeline, schedule, loading, signOut, refresh: load }}>
      {children}
    </CustomerCtx.Provider>
  )
}
