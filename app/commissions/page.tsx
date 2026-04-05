'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Nav } from '@/components/Nav'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useOrg } from '@/lib/hooks'
import { handleApiError } from '@/lib/errors'
import { Calculator, DollarSign, TrendingUp, Trophy, Banknote } from 'lucide-react'
import { loadCommissionRates } from '@/lib/api'
import type { CommissionRate } from '@/types/database'
import {
  CalculatorTab,
  EarningsTab,
  AdvancesTab,
  LeaderboardTab,
  RateCardTab,
} from './components'
import type { Tab } from './components'

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const { orgId } = useOrg()
  const isAdmin = currentUser?.isAdmin ?? false
  const isSales = currentUser?.isSales ?? false

  const [tab, setTab] = useState<Tab>('calculator')
  const [rates, setRates] = useState<CommissionRate[]>([])
  const [ratesLoading, setRatesLoading] = useState(true)

  const loadRates = useCallback(async () => {
    setRatesLoading(true)
    try {
      const data = await loadCommissionRates(orgId)
      setRates(data)
    } catch (err) {
      handleApiError(err, '[commissions] loadRates')
    }
    setRatesLoading(false)
  }, [orgId])

  useEffect(() => { loadRates() }, [loadRates])

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Checking permissions...</div>
      </div>
    )
  }

  // Auth gate: Admin sees everything. Sales sees only their own data. Others blocked.
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Please sign in to view commissions.</div>
      </div>
    )
  }

  if (!isAdmin && !isSales) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">You don&apos;t have permission to view this page.</div>
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'calculator', label: 'Calculator', icon: <Calculator className="w-3.5 h-3.5" /> },
    { key: 'earnings', label: 'My Earnings', icon: <DollarSign className="w-3.5 h-3.5" /> },
    ...(isAdmin ? [{ key: 'advances' as Tab, label: 'Advances', icon: <Banknote className="w-3.5 h-3.5" /> }] : []),
    { key: 'leaderboard' as Tab, label: 'Leaderboard', icon: <Trophy className="w-3.5 h-3.5" /> },
    ...(isAdmin ? [{ key: 'rates' as Tab, label: 'Rate Card', icon: <TrendingUp className="w-3.5 h-3.5" /> }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav active="Commissions" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Commissions</h1>
            <p className="text-xs text-gray-500 mt-0.5">Calculate, track, and manage commission earnings</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-800 pb-px">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-green-500 text-white bg-gray-900'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-900/50'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'calculator' && <CalculatorTab rates={rates} />}
        {tab === 'earnings' && <EarningsTab orgId={orgId} rates={rates} />}
        {tab === 'advances' && isAdmin && <AdvancesTab orgId={orgId} />}
        {tab === 'leaderboard' && <LeaderboardTab orgId={orgId} currentUserId={currentUser.id} />}
        {tab === 'rates' && isAdmin && <RateCardTab rates={rates} onReload={loadRates} orgId={orgId} />}
      </div>
    </div>
  )
}
