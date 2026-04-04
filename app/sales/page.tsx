'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Nav } from '@/components/Nav'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useOrg, useRealtimeSubscription } from '@/lib/hooks'
import {
  loadPayScales, loadPayDistribution, loadSalesTeams, loadSalesReps,
  loadOnboardingRequirements, loadUsers,
} from '@/lib/api'
import type { PayScale, PayDistribution, SalesTeam, SalesRep, OnboardingRequirement } from '@/lib/api'
import {
  Users, UserPlus, DollarSign, PieChart, ClipboardCheck, Shield,
} from 'lucide-react'

import { TeamsTab } from './components/TeamsTab'
import { PersonnelTab } from './components/PersonnelTab'
import { PayScalesTab } from './components/PayScalesTab'
import { DistributionTab } from './components/DistributionTab'
import { OnboardingTab } from './components/OnboardingTab'
import { ComplianceTab } from './components/ComplianceTab'

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'teams' | 'personnel' | 'pay_scales' | 'distribution' | 'onboarding' | 'compliance'

const TAB_ITEMS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'teams', label: 'Teams', icon: <Users className="w-4 h-4" /> },
  { key: 'personnel', label: 'Personnel', icon: <UserPlus className="w-4 h-4" /> },
  { key: 'pay_scales', label: 'Pay Scales', icon: <DollarSign className="w-4 h-4" /> },
  { key: 'distribution', label: 'Distribution', icon: <PieChart className="w-4 h-4" /> },
  { key: 'onboarding', label: 'Onboarding', icon: <ClipboardCheck className="w-4 h-4" /> },
  { key: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" /> },
]

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const { user: currentUser, loading: authLoading } = useCurrentUser()
  const { orgId } = useOrg()
  const [tab, setTab] = useState<Tab>('teams')
  const [loading, setLoading] = useState(true)

  const [payScales, setPayScales] = useState<PayScale[]>([])
  const [distribution, setDistribution] = useState<PayDistribution[]>([])
  const [teams, setTeams] = useState<SalesTeam[]>([])
  const [reps, setReps] = useState<SalesRep[]>([])
  const [requirements, setRequirements] = useState<OnboardingRequirement[]>([])
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  const isAdmin = !authLoading && !!currentUser?.isAdmin

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [ps, dist, t, r, reqs, u] = await Promise.all([
      loadPayScales(orgId),
      loadPayDistribution(orgId),
      loadSalesTeams(orgId),
      loadSalesReps({ orgId }),
      loadOnboardingRequirements(orgId),
      loadUsers(),
    ])
    setPayScales(ps)
    setDistribution(dist)
    setTeams(t)
    setReps(r)
    setRequirements(reqs)
    setUsers((u?.data ?? []).map((usr: { id: string; name: string }) => ({ id: usr.id, name: usr.name })))
    setLoading(false)
  }, [orgId])

  useEffect(() => { loadAll() }, [loadAll])

  useRealtimeSubscription('sales_reps' as unknown as Parameters<typeof useRealtimeSubscription>[0], { onChange: loadAll, debounceMs: 500 })
  useRealtimeSubscription('onboarding_documents' as unknown as Parameters<typeof useRealtimeSubscription>[0], { onChange: loadAll, debounceMs: 500 })

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Nav active="Sales Teams" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-600" />
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">Admin Access Required</h1>
            <p className="text-sm text-gray-500">Sales team management requires Admin role.</p>
            <a href="/command" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300">Back to Command Center</a>
          </div>
        </div>
      </div>
    )
  }

  const onboardingCount = reps.filter(r => r.status === 'onboarding').length

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav active="Sales Teams" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Sales Teams</h1>
          <p className="text-xs text-gray-500 mt-1">Manage teams, personnel, pay scale stacks, and rep onboarding</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-gray-800 mb-6 overflow-x-auto">
          {TAB_ITEMS.map(t => {
            if (t.key === 'onboarding' && onboardingCount === 0) return null
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.key
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                {t.icon}
                {t.label}
                {t.key === 'onboarding' && onboardingCount > 0 && (
                  <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {onboardingCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-gray-500 text-sm">Loading sales data...</div>
          </div>
        ) : (
          <>
            {tab === 'teams' && <TeamsTab teams={teams} reps={reps} payScales={payScales} users={users} orgId={orgId} onRefresh={loadAll} />}
            {tab === 'personnel' && <PersonnelTab reps={reps} teams={teams} payScales={payScales} requirements={requirements} orgId={orgId} isAdmin={isAdmin} onRefresh={loadAll} />}
            {tab === 'pay_scales' && <PayScalesTab payScales={payScales} orgId={orgId} isAdmin={isAdmin} onRefresh={loadAll} />}
            {tab === 'distribution' && <DistributionTab distribution={distribution} orgId={orgId} isAdmin={isAdmin} onRefresh={loadAll} />}
            {tab === 'onboarding' && <OnboardingTab reps={reps} teams={teams} requirements={requirements} onRefresh={loadAll} />}
            {tab === 'compliance' && <ComplianceTab reps={reps} isAdmin={isAdmin} />}
          </>
        )}
      </div>
    </div>
  )
}
