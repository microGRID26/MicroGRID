import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ProjectInput } from './types'

// ── RESULTS TABLE ────────────────────────────────────────────────────────────

export function ResultsTable({ projects, completedCount, totalWarnings, expandedProject, setExpandedProject }: {
  projects: ProjectInput[]
  completedCount: number
  totalWarnings: number
  expandedProject: string | null
  setExpandedProject: (id: string | null) => void
}) {
  if (completedCount === 0) return null

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          Results Summary
          <span className="text-xs text-gray-400 font-normal ml-2">
            {completedCount} of {projects.length} processed
            {totalWarnings > 0 && (
              <span className="text-amber-400 ml-2">{totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}</span>
            )}
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-700">
              <th className="text-left py-2 pr-3">Project</th>
              <th className="text-right py-2 px-3">Old DC (kW)</th>
              <th className="text-right py-2 px-3">New DC (kW)</th>
              <th className="text-right py-2 px-3">Delta</th>
              <th className="text-right py-2 px-3">Old Panels</th>
              <th className="text-right py-2 px-3">New Panels</th>
              <th className="text-left py-2 px-3">String Config</th>
              <th className="text-center py-2 px-3">Status</th>
              <th className="text-right py-2 pl-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.filter(p => p.status === 'complete' && p.results).map(project => {
              const r = project.results!
              const dcDelta = r.newSystemDc - r.oldSystemDc
              const panelDelta = r.newTotalPanels - project.panelCount
              const hasWarnings = r.warnings.length > 0
              const stringSummary = r.stringConfigs.map(sc => sc.modules).join('/')

              return (
                <tr key={project.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-sm">{project.projectName}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{project.address}</p>
                  </td>
                  <td className="text-right py-2.5 px-3 text-gray-400">{r.oldSystemDc}</td>
                  <td className="text-right py-2.5 px-3 font-semibold text-green-400">{r.newSystemDc}</td>
                  <td className={cn(
                    'text-right py-2.5 px-3 font-semibold',
                    dcDelta >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {dcDelta >= 0 ? '+' : ''}{dcDelta.toFixed(2)}
                  </td>
                  <td className="text-right py-2.5 px-3 text-gray-400">{project.panelCount}</td>
                  <td className={cn(
                    'text-right py-2.5 px-3 font-semibold',
                    panelDelta >= 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {r.newTotalPanels}
                    <span className="text-xs ml-1">({panelDelta >= 0 ? '+' : ''}{panelDelta})</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs font-mono text-gray-300">
                      {r.stringConfigs.length}s: {stringSummary}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-3">
                    {hasWarnings ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        {r.warnings.length}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="text-right py-2.5 pl-3">
                    <button
                      onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                      className="text-xs text-green-400 hover:text-green-300 transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Totals row */}
          <tfoot>
            <tr className="border-t border-gray-600 font-semibold text-sm">
              <td className="py-2.5 pr-3 text-gray-400">Totals ({completedCount} projects)</td>
              <td className="text-right py-2.5 px-3 text-gray-400">
                {projects.filter(p => p.results).reduce((s, p) => s + p.results!.oldSystemDc, 0).toFixed(2)}
              </td>
              <td className="text-right py-2.5 px-3 text-green-400">
                {projects.filter(p => p.results).reduce((s, p) => s + p.results!.newSystemDc, 0).toFixed(2)}
              </td>
              <td className="text-right py-2.5 px-3 text-green-400">
                {(() => {
                  const delta = projects.filter(p => p.results).reduce((s, p) => s + p.results!.newSystemDc - p.results!.oldSystemDc, 0)
                  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`
                })()}
              </td>
              <td className="text-right py-2.5 px-3 text-gray-400">
                {projects.filter(p => p.results).reduce((s, p) => s + p.panelCount, 0)}
              </td>
              <td className="text-right py-2.5 px-3 text-green-400">
                {projects.filter(p => p.results).reduce((s, p) => s + p.results!.newTotalPanels, 0)}
              </td>
              <td className="py-2.5 px-3 text-gray-400 text-xs">
                {projects.filter(p => p.results).reduce((s, p) => s + p.results!.stringConfigs.length, 0)} total strings
              </td>
              <td className="text-center py-2.5 px-3">
                {totalWarnings > 0 ? (
                  <span className="text-xs text-amber-400">{totalWarnings} warnings</span>
                ) : (
                  <span className="text-xs text-green-400">All clear</span>
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
