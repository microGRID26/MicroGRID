import React from 'react'
import { fmt$, cn } from '@/lib/utils'
import { getWeekLabel, getMonday } from '@/lib/api/ramp-planner'
import type { RampProject, RampScheduleEntry, RampConfig } from './types'

interface TimelineTabProps {
  weeks: string[]
  schedule: RampScheduleEntry[]
  projects: RampProject[]
  config: RampConfig | null
  selectedWeek: string
  setSelectedWeek: (week: string) => void
  setTab: (tab: 'planner' | 'queue' | 'timeline') => void
  getActiveCrewCount: (week: string) => number
}

export function TimelineTab({
  weeks, schedule, projects, config,
  selectedWeek, setSelectedWeek, setTab,
  getActiveCrewCount,
}: TimelineTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Rolling 16-week view. Auto-updates as projects complete.</p>
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 gap-1">
          {weeks.map((week, i) => {
            const weekJobs = schedule.filter(s => s.scheduled_week === week && s.status !== 'cancelled')
            const completed = weekJobs.filter(s => s.status === 'completed').length
            const planned = weekJobs.length
            const weekCrewCount = getActiveCrewCount(week)
            const target = weekCrewCount * (config?.installs_per_crew_per_week ?? 2)
            const revenue = weekJobs.reduce((sum, s) => {
              const p = projects.find(pr => pr.id === s.project_id)
              return sum + (Number(p?.contract) || 0)
            }, 0)
            const isCurrentWeek = week === getMonday(new Date())
            const isPast = new Date(week) < new Date(getMonday(new Date()))

            return (
              <div key={week}
                onClick={() => { setSelectedWeek(week); setTab('planner') }}
                className={cn('flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors',
                  isCurrentWeek ? 'bg-green-900/20 border border-green-700/50' : 'hover:bg-gray-700/30',
                  selectedWeek === week && 'ring-1 ring-green-500/50')}>
                <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">Wk {i + 1}</span>
                <span className="text-xs text-gray-300 w-32 flex-shrink-0">{getWeekLabel(week)}</span>
                {/* Progress bar */}
                <div className="flex-1 h-4 bg-gray-900 rounded-full overflow-hidden flex">
                  {completed > 0 && <div className="bg-green-600 h-full" style={{ width: `${completed / target * 100}%` }} />}
                  {planned > completed && <div className="bg-blue-600/50 h-full" style={{ width: `${(planned - completed) / target * 100}%` }} />}
                </div>
                <span className="text-[10px] text-gray-400 w-20 text-right">{planned}/{target} jobs ({weekCrewCount}c)</span>
                <span className="text-[10px] text-green-400 w-20 text-right">{revenue > 0 ? fmt$(revenue) : '—'}</span>
                {isCurrentWeek && <span className="text-[9px] text-green-400 font-medium">THIS WEEK</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue forecast */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '30-Day Forecast', weeks: 4 },
          { label: '60-Day Forecast', weeks: 8 },
          { label: '90-Day Forecast', weeks: 12 },
        ].map(period => {
          const periodWeeks = weeks.slice(0, period.weeks)
          const periodJobs = schedule.filter(s => periodWeeks.includes(s.scheduled_week) && s.status !== 'cancelled')
          const periodRevenue = periodJobs.reduce((sum, s) => {
            const p = projects.find(pr => pr.id === s.project_id)
            return sum + (Number(p?.contract) || 0)
          }, 0)
          return (
            <div key={period.label} className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-[10px] text-gray-500 uppercase">{period.label}</div>
              <div className="text-lg font-bold text-green-400 mt-1">{periodJobs.length} installs</div>
              <div className="text-xs text-gray-300">{fmt$(periodRevenue)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
