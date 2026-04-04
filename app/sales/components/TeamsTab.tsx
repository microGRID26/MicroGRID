import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  loadCommissionRecords, loadProjects, computeRepScorecards,
  REP_STATUS_LABELS, REP_STATUS_BADGE,
} from '@/lib/api'
import type { SalesTeam, SalesRep, PayScale } from '@/lib/api'
import type { Project } from '@/types/database'
import { fmtDate, fmt$ } from '@/lib/utils'
import { Users, UserPlus, DollarSign, Clock, ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react'
import { StatCard } from './StatCard'
import { AddTeamModal } from './AddTeamModal'

export function TeamsTab({ teams, reps, payScales, users, orgId, onRefresh }: {
  teams: SalesTeam[]
  reps: SalesRep[]
  payScales: PayScale[]
  users: { id: string; name: string }[]
  orgId: string | null
  onRefresh: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTeam, setEditingTeam] = useState<SalesTeam | null>(null)

  const activeTeams = teams.filter(t => t.active)
  const activeReps = reps.filter(r => r.status === 'active')
  const onboardingReps = reps.filter(r => r.status === 'onboarding')
  const avgStack = activeTeams.length > 0
    ? activeTeams.reduce((sum, t) => sum + Number(t.stack_per_watt), 0) / activeTeams.length
    : 0

  const scaleMap = useMemo(() => {
    const m = new Map<string, PayScale>()
    payScales.forEach(s => m.set(s.id, s))
    return m
  }, [payScales])

  const teamReps = useCallback((teamId: string) => reps.filter(r => r.team_id === teamId), [reps])

  const [teamCommissions, setTeamCommissions] = useState<Map<string, { deals: number; total: number; paid: number; avgDaysSinceSale: number | null; avgDaysSinceInstall: number | null }>>(new Map())
  useEffect(() => {
    Promise.all([loadCommissionRecords({ orgId: orgId ?? undefined }), loadProjects({ orgId: orgId ?? undefined })]).then(([records, projResult]) => {
      const projects = (Array.isArray(projResult) ? projResult : (projResult as { data?: unknown[] })?.data ?? []) as Project[]
      const cards = computeRepScorecards(reps, projects, records)
      const byTeam = new Map<string, { deals: number; total: number; paid: number; avgDaysSinceSale: number | null; avgDaysSinceInstall: number | null }>()
      for (const r of records) {
        if (r.status === 'cancelled') continue
        const rep = reps.find(rep => rep.user_id === r.user_id)
        if (!rep?.team_id) continue
        const existing = byTeam.get(rep.team_id) ?? { deals: 0, total: 0, paid: 0, avgDaysSinceSale: null, avgDaysSinceInstall: null }
        existing.deals++
        existing.total += r.total_commission ?? 0
        if (r.status === 'paid') existing.paid += r.total_commission ?? 0
        byTeam.set(rep.team_id, existing)
      }
      for (const team of teams) {
        const teamCards = cards.filter(c => c.teamId === team.id && c.daysSinceLastSale != null)
        const existing = byTeam.get(team.id) ?? { deals: 0, total: 0, paid: 0, avgDaysSinceSale: null, avgDaysSinceInstall: null }
        if (teamCards.length > 0) {
          const saleDays = teamCards.filter(c => c.daysSinceLastSale != null).map(c => c.daysSinceLastSale!)
          const installDays = teamCards.filter(c => c.daysSinceLastInstall != null).map(c => c.daysSinceLastInstall!)
          existing.avgDaysSinceSale = saleDays.length > 0 ? Math.round(saleDays.reduce((s, d) => s + d, 0) / saleDays.length) : null
          existing.avgDaysSinceInstall = installDays.length > 0 ? Math.round(installDays.reduce((s, d) => s + d, 0) / installDays.length) : null
        }
        byTeam.set(team.id, existing)
      }
      setTeamCommissions(byTeam)
    })
  }, [reps, teams, orgId])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Teams" value={activeTeams.length} icon={<Users className="w-5 h-5" />} accent="green" />
        <StatCard label="Active Reps" value={activeReps.length} icon={<UserPlus className="w-5 h-5" />} accent="blue" />
        <StatCard label="Onboarding" value={onboardingReps.length} icon={<Clock className="w-5 h-5" />} accent="amber" />
        <StatCard label="Avg Stack Rate" value={`$${avgStack.toFixed(2)}/W`} icon={<DollarSign className="w-5 h-5" />} accent="purple" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Team
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {activeTeams.map(team => {
          const members = teamReps(team.id)
          const isExpanded = expandedId === team.id
          return (
            <div key={team.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : team.id)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">{team.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    {team.vp_name && <span className="text-[10px] text-gray-400">VP: {team.vp_name}</span>}
                    <span className="text-[10px] text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] text-green-400 font-medium">${Number(team.stack_per_watt).toFixed(2)}/W</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingTeam(team) }}
                    className="text-gray-500 hover:text-white p-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-700 px-5 py-3">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: 'VP', name: team.vp_name },
                      { label: 'Regional', name: team.regional_name },
                      { label: 'Manager', name: team.manager_name },
                      { label: 'Asst. Mgr', name: team.assistant_manager_name },
                    ].filter(l => l.name).map(l => (
                      <div key={l.label} className="text-[10px]">
                        <span className="text-gray-500">{l.label}:</span>{' '}
                        <span className="text-gray-300">{l.name}</span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const tc = teamCommissions.get(team.id)
                    return tc && tc.deals > 0 ? (
                      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
                        <div className="bg-gray-900/50 rounded p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase">Deals</div>
                          <div className="text-sm font-bold text-white">{tc.deals}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase">Total</div>
                          <div className="text-sm font-bold text-green-400">{fmt$(tc.total)}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase">Paid</div>
                          <div className="text-sm font-bold text-emerald-400">{fmt$(tc.paid)}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase">Avg/Deal</div>
                          <div className="text-sm font-bold text-blue-400">{fmt$(tc.total / tc.deals)}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase">Avg Last Sale</div>
                          <div className={`text-sm font-bold ${tc.avgDaysSinceSale != null && tc.avgDaysSinceSale > 30 ? 'text-red-400' : tc.avgDaysSinceSale != null && tc.avgDaysSinceSale > 14 ? 'text-amber-400' : 'text-green-400'}`}>{tc.avgDaysSinceSale != null ? `${tc.avgDaysSinceSale}d` : '\u2014'}</div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2 text-center">
                          <div className="text-[9px] text-gray-500 uppercase">Avg Last Install</div>
                          <div className={`text-sm font-bold ${tc.avgDaysSinceInstall != null && tc.avgDaysSinceInstall > 30 ? 'text-red-400' : tc.avgDaysSinceInstall != null && tc.avgDaysSinceInstall > 14 ? 'text-amber-400' : 'text-green-400'}`}>{tc.avgDaysSinceInstall != null ? `${tc.avgDaysSinceInstall}d` : '\u2014'}</div>
                        </div>
                      </div>
                    ) : null
                  })()}

                  {members.length === 0 ? (
                    <p className="text-xs text-gray-500">No members assigned</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Members</p>
                      {members.map(rep => {
                        const scale = rep.pay_scale_id ? scaleMap.get(rep.pay_scale_id) : null
                        return (
                          <div key={rep.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white">{rep.first_name} {rep.last_name}</span>
                              {scale && <span className="text-[10px] text-gray-400">{scale.name}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${REP_STATUS_BADGE[rep.status]}`}>
                                {REP_STATUS_LABELS[rep.status]}
                              </span>
                              {rep.hire_date && <span className="text-[10px] text-gray-500">{fmtDate(rep.hire_date)}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activeTeams.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">No teams created yet. Click &quot;Add Team&quot; to get started.</div>
      )}

      {(showAdd || editingTeam) && (
        <AddTeamModal
          onClose={() => { setShowAdd(false); setEditingTeam(null) }}
          onSaved={onRefresh}
          orgId={orgId}
          users={users}
          editing={editingTeam}
        />
      )}
    </div>
  )
}
