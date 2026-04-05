import { TICKET_CATEGORY_COLORS } from '@/lib/api/tickets'
import type { Ticket } from '@/lib/api/tickets'

interface AnalyticsPanelProps {
  tickets: Ticket[]
}

export function AnalyticsPanel({ tickets }: AnalyticsPanelProps) {
  const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed')
  const avgResponseHrs = resolved.filter(t => t.first_response_at).length > 0
    ? resolved.filter(t => t.first_response_at).reduce((sum, t) => sum + (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()) / 3600000, 0) / resolved.filter(t => t.first_response_at).length
    : 0
  const avgResolutionHrs = resolved.filter(t => t.resolved_at).length > 0
    ? resolved.filter(t => t.resolved_at).reduce((sum, t) => sum + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()) / 3600000, 0) / resolved.filter(t => t.resolved_at).length
    : 0

  // By category
  const byCat = new Map<string, { total: number; open: number; resolved: number }>()
  for (const t of tickets) {
    const c = byCat.get(t.category) ?? { total: 0, open: 0, resolved: 0 }
    c.total++
    if (['resolved', 'closed'].includes(t.status)) c.resolved++
    else c.open++
    byCat.set(t.category, c)
  }

  // By resolution
  const byRes = new Map<string, number>()
  for (const t of resolved) {
    if (t.resolution_category) byRes.set(t.resolution_category, (byRes.get(t.resolution_category) ?? 0) + 1)
  }

  // By assignee
  const byAssignee = new Map<string, { total: number; open: number }>()
  for (const t of tickets) {
    const name = t.assigned_to ?? 'Unassigned'
    const a = byAssignee.get(name) ?? { total: 0, open: 0 }
    a.total++
    if (!['resolved', 'closed'].includes(t.status)) a.open++
    byAssignee.set(name, a)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ticket Analytics</h3>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Avg Response Time</div>
          <div className="text-lg font-bold text-blue-400">{avgResponseHrs > 0 ? (avgResponseHrs >= 24 ? `${(avgResponseHrs / 24).toFixed(1)}d` : `${Math.round(avgResponseHrs)}h`) : '\u2014'}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Avg Resolution Time</div>
          <div className="text-lg font-bold text-green-400">{avgResolutionHrs > 0 ? (avgResolutionHrs >= 24 ? `${(avgResolutionHrs / 24).toFixed(1)}d` : `${Math.round(avgResolutionHrs)}h`) : '\u2014'}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase">Resolution Rate</div>
          <div className="text-lg font-bold text-emerald-400">{tickets.length > 0 ? `${Math.round(resolved.length / tickets.length * 100)}%` : '\u2014'}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 text-center">
          <div className="text-[10px] text-gray-500 uppercase">SLA Compliance</div>
          <div className="text-lg font-bold text-amber-400">
            {(() => {
              const checked = tickets.filter(t => t.first_response_at)
              if (checked.length === 0) return '\u2014'
              const compliant = checked.filter(t => {
                const hrs = (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()) / 3600000
                return hrs <= t.sla_response_hours
              })
              return `${Math.round(compliant.length / checked.length * 100)}%`
            })()}
          </div>
        </div>
      </div>

      {/* By Category + By Resolution + By Assignee */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-medium mb-2">By Category</div>
          <div className="space-y-1">
            {[...byCat.entries()].sort((a, b) => b[1].total - a[1].total).map(([cat, v]) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TICKET_CATEGORY_COLORS[cat] ?? 'bg-gray-700 text-gray-400'}`}>{cat}</span>
                <span className="text-gray-300">{v.open} open / {v.resolved} resolved</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-medium mb-2">Top Resolutions</div>
          <div className="space-y-1">
            {[...byRes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([code, count]) => (
              <div key={code} className="flex items-center justify-between text-xs">
                <span className="text-gray-300 capitalize">{code.replace(/_/g, ' ')}</span>
                <span className="text-gray-400">{count}</span>
              </div>
            ))}
            {byRes.size === 0 && <span className="text-gray-500 text-[10px]">No resolutions yet</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase font-medium mb-2">By Assignee</div>
          <div className="space-y-1">
            {[...byAssignee.entries()].sort((a, b) => b[1].open - a[1].open).slice(0, 6).map(([name, v]) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{name}</span>
                <span className={v.open > 0 ? 'text-amber-400' : 'text-gray-400'}>{v.open} open</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
