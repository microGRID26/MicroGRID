'use client'

import { useMemo } from 'react'
import { fmt$ } from '@/lib/utils'
import type { AnalyticsData } from './shared'

interface CrewScore {
  crew: string
  installs: number
  kwInstalled: number
  revenue: number
  avgTimeOnSite: number
  completionRate: number
  points: number
  streak: number
  badges: string[]
  rank: number
}

const BADGE_DEFS = [
  { id: 'speed_demon', label: 'Speed Demon', icon: '⚡', desc: 'Avg time on site < 4 hours', check: (s: CrewScore) => s.avgTimeOnSite > 0 && s.avgTimeOnSite < 240 },
  { id: 'heavy_hitter', label: 'Heavy Hitter', icon: '💪', desc: '10+ installs this month', check: (s: CrewScore) => s.installs >= 10 },
  { id: 'power_plant', label: 'Power Plant', icon: '🔋', desc: '100+ kW installed', check: (s: CrewScore) => s.kwInstalled >= 100 },
  { id: 'perfect_record', label: 'Perfect Record', icon: '✨', desc: '100% completion rate', check: (s: CrewScore) => s.completionRate >= 100 },
  { id: 'revenue_king', label: 'Revenue King', icon: '👑', desc: '$500K+ in revenue', check: (s: CrewScore) => s.revenue >= 500000 },
  { id: 'streak_5', label: '5-Day Streak', icon: '🔥', desc: '5+ consecutive work days', check: (s: CrewScore) => s.streak >= 5 },
]

export function CrewLeaderboard({ data }: { data: AnalyticsData }) {
  const scores = useMemo(() => {
    const projects = data.projects
    const workOrders = data.workOrders
    const rampSchedule = data.rampSchedule

    // Get unique crews from ramp schedule
    const crewNames = [...new Set(rampSchedule.map(r => r.crew_name).filter(Boolean))] as string[]

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const crewScores: CrewScore[] = crewNames.map(crew => {
      // Installs this month
      const crewSchedule = rampSchedule.filter(r => r.crew_name === crew && r.status === 'completed' && r.scheduled_week >= monthStart)
      const installs = crewSchedule.length

      // kW installed
      const crewProjectIds = new Set(crewSchedule.map(r => r.project_id))
      const crewProjects = projects.filter(p => crewProjectIds.has(p.id))
      const kwInstalled = Math.round(crewProjects.reduce((s, p) => s + (Number(p.systemkw) || 0), 0) * 10) / 10

      // Revenue
      const revenue = crewProjects.reduce((s, p) => s + (Number(p.contract) || 0), 0)

      // Avg time on site
      const crewWOs = workOrders.filter(wo => wo.assigned_crew === crew && wo.time_on_site_minutes && wo.time_on_site_minutes > 0)
      const avgTimeOnSite = crewWOs.length > 0 ? Math.round(crewWOs.reduce((s, wo) => s + (wo.time_on_site_minutes ?? 0), 0) / crewWOs.length) : 0

      // Completion rate
      const totalScheduled = rampSchedule.filter(r => r.crew_name === crew && r.scheduled_week >= monthStart).length
      const completionRate = totalScheduled > 0 ? Math.round((installs / totalScheduled) * 100) : 0

      // Streak: consecutive days with completed work (simplified)
      const completedDates = [...new Set(crewSchedule.map(r => r.scheduled_week))].sort().reverse()
      let streak = 0
      for (let i = 0; i < completedDates.length; i++) {
        if (i === 0 || daysBetween(completedDates[i], completedDates[i - 1]) <= 3) { // Allow weekends
          streak++
        } else break
      }

      // Points: weighted score
      const points = installs * 100 + Math.round(kwInstalled) * 10 + Math.round(revenue / 1000) + (completionRate >= 100 ? 500 : 0) + streak * 50

      // Badges
      const score: CrewScore = { crew, installs, kwInstalled, revenue, avgTimeOnSite, completionRate, points, streak, badges: [], rank: 0 }
      score.badges = BADGE_DEFS.filter(b => b.check(score)).map(b => b.id)

      return score
    })

    // Rank by points
    crewScores.sort((a, b) => b.points - a.points)
    crewScores.forEach((s, i) => { s.rank = i + 1 })

    return crewScores
  }, [data.projects, data.workOrders, data.rampSchedule])

  if (scores.length === 0) {
    return <div className="text-center text-gray-500 text-sm py-8">No crew data available for leaderboard</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Crew Leaderboard</h3>
        <span className="text-[10px] text-gray-500">Points = installs×100 + kW×10 + revenue/1K + streaks + bonuses</span>
      </div>

      {/* Top 3 podium */}
      {scores.length >= 1 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[scores[1], scores[0], scores[2]].filter(Boolean).map((s, podiumIdx) => {
            const position = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3
            const colors = { 1: 'from-amber-600 to-amber-800', 2: 'from-gray-500 to-gray-700', 3: 'from-orange-700 to-orange-900' }
            const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
            const icons = { 1: '🥇', 2: '🥈', 3: '🥉' }
            return (
              <div key={s.crew} className="text-center">
                <div className="text-sm font-bold text-white mb-1 truncate">{s.crew}</div>
                <div className={`bg-gradient-to-b ${colors[position as 1|2|3]} rounded-t-xl ${heights[position as 1|2|3]} flex flex-col items-center justify-center`}>
                  <span className="text-2xl">{icons[position as 1|2|3]}</span>
                  <span className="text-lg font-black text-white">{s.points.toLocaleString()}</span>
                  <span className="text-[9px] text-white/70">points</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full leaderboard table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 text-left border-b border-gray-700">
              <th className="px-3 py-2 w-8">#</th>
              <th className="px-3 py-2">Crew</th>
              <th className="px-3 py-2 text-right">Installs</th>
              <th className="px-3 py-2 text-right">kW</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">Streak</th>
              <th className="px-3 py-2 text-center">Badges</th>
              <th className="px-3 py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {scores.map(s => (
              <tr key={s.crew} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="px-3 py-2 font-bold text-gray-400">{s.rank}</td>
                <td className="px-3 py-2 font-medium text-white">{s.crew}</td>
                <td className="px-3 py-2 text-right text-gray-300">{s.installs}</td>
                <td className="px-3 py-2 text-right text-green-400">{s.kwInstalled}</td>
                <td className="px-3 py-2 text-right text-gray-300">{fmt$(s.revenue)}</td>
                <td className="px-3 py-2 text-right">
                  {s.streak > 0 && <span className="text-amber-400">{s.streak}🔥</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  {s.badges.map(bId => {
                    const badge = BADGE_DEFS.find(b => b.id === bId)
                    return badge ? <span key={bId} title={`${badge.label}: ${badge.desc}`} className="cursor-help">{badge.icon}</span> : null
                  })}
                </td>
                <td className="px-3 py-2 text-right font-bold text-white">{s.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Badge legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        {BADGE_DEFS.map(b => (
          <span key={b.id} className="text-gray-500">{b.icon} {b.label} — {b.desc}</span>
        ))}
      </div>
    </div>
  )
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000))
}
