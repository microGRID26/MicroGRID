import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import type { ProjectInput, TargetSystem } from './types'

// ── PROJECT RESULTS DETAIL ───────────────────────────────────────────────────

export function ProjectResultsDetail({ project, target }: { project: ProjectInput; target: TargetSystem }) {
  const r = project.results
  if (!r) return null

  return (
    <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg">
      {/* Warnings */}
      {r.warnings.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">Warnings</p>
          {r.warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-300 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* String Sizing Summary */}
      <div>
        <p className="text-xs font-semibold text-green-400 mb-2">String Sizing</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <div>
            <p className="text-[10px] text-gray-400">Voc Corrected</p>
            <p className="text-sm font-semibold">{r.vocCorrected} V</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Vmp Hot</p>
            <p className="text-sm font-semibold">{r.vmpHot} V</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Max Mod/Str</p>
            <p className="text-sm font-semibold">{r.maxModulesPerString}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Min Mod/Str</p>
            <p className="text-sm font-semibold">{r.minModulesPerString}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Recommended</p>
            <p className="text-sm font-semibold text-green-400">{r.recommendedStringSize}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">String Inputs</p>
            <p className="text-sm font-semibold">{r.totalStringInputs}</p>
          </div>
        </div>
      </div>

      {/* Panel Fit */}
      <div>
        <p className="text-xs font-semibold text-green-400 mb-2">Panel Fit Estimate</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-1.5">Roof</th>
              <th className="text-right py-1.5">Old</th>
              <th className="text-right py-1.5">New</th>
              <th className="text-right py-1.5">Delta</th>
              <th className="text-left py-1.5 pl-3">Method</th>
            </tr>
          </thead>
          <tbody>
            {r.panelFitEstimates.map(e => (
              <tr key={e.roofIndex} className="border-b border-gray-700/50">
                <td className="py-1.5">Face {e.roofIndex + 1}</td>
                <td className="text-right py-1.5">{e.oldCount}</td>
                <td className="text-right py-1.5 font-semibold">{e.newCount}</td>
                <td className={cn('text-right py-1.5 font-semibold', e.newCount - e.oldCount >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {e.newCount - e.oldCount >= 0 ? '+' : ''}{e.newCount - e.oldCount}
                </td>
                <td className="py-1.5 pl-3 text-gray-400">{e.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* String Configs */}
      <div>
        <p className="text-xs font-semibold text-green-400 mb-2">String Configuration</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-1.5">MPPT</th>
              <th className="text-left py-1.5">String</th>
              <th className="text-right py-1.5">Modules</th>
              <th className="text-right py-1.5">Voc Cold</th>
              <th className="text-right py-1.5">Vmp</th>
              <th className="text-right py-1.5">Current</th>
              <th className="text-left py-1.5 pl-3">Roof</th>
            </tr>
          </thead>
          <tbody>
            {r.stringConfigs.map((sc, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="py-1.5">{sc.mppt}</td>
                <td className="py-1.5">{sc.string}</td>
                <td className="text-right py-1.5 font-semibold">{sc.modules}</td>
                <td className={cn('text-right py-1.5', sc.vocCold > target.maxVoc ? 'text-red-400 font-semibold' : '')}>
                  {sc.vocCold} V
                </td>
                <td className={cn('text-right py-1.5', sc.vmpNominal < target.mpptMin ? 'text-red-400 font-semibold' : '')}>
                  {sc.vmpNominal} V
                </td>
                <td className="text-right py-1.5">{sc.current} A</td>
                <td className="py-1.5 pl-3 text-gray-400">
                  {sc.roofFaceIndex >= 0 ? `Face ${sc.roofFaceIndex + 1}` : 'Overflow'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Engineering Notes */}
      {r.engineeringNotes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-400 mb-2">Engineering Notes</p>
          {r.engineeringNotes.map((note, i) => (
            <p key={i} className="text-xs text-gray-300 mb-0.5">- {note}</p>
          ))}
        </div>
      )}
    </div>
  )
}
