import { useState } from 'react'
import type { FundingRecord } from './types'

export function FundingBadge({ funding, onUpdate }: { funding?: FundingRecord; onUpdate?: (milestone: string, status: string) => void }) {
  const [showDropdown, setShowDropdown] = useState(false)

  if (!funding) return null

  const milestones: { label: string; key: string; status: string | null }[] = [
    { label: 'M3', key: 'm3_status', status: funding.m3_status },
    { label: 'M2', key: 'm2_status', status: funding.m2_status },
    { label: 'M1', key: 'm1_status', status: funding.m1_status },
  ]

  const active = milestones.find(m => m.status && m.status !== 'Not Eligible')
  if (!active || !active.status) return null

  const statusShort: Record<string, string> = { Eligible: 'Eligible', Submitted: 'Sub', Funded: 'Funded', Rejected: 'Rej' }
  const statusColor: Record<string, string> = { Eligible: 'text-green-400', Submitted: 'text-blue-400', Funded: 'text-emerald-300', Rejected: 'text-red-400' }
  const display = statusShort[active.status] ?? active.status
  const color = statusColor[active.status] ?? 'text-gray-400'

  return (
    <span className="relative ml-1">
      <button onClick={e => { e.stopPropagation(); if (onUpdate) setShowDropdown(!showDropdown) }}
        className={`text-[10px] font-medium ${color} ${onUpdate ? 'hover:underline cursor-pointer' : ''}`}>
        {active.label}: {display}
      </button>
      {showDropdown && onUpdate && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-xl z-50 py-1 min-w-[120px]"
          onClick={e => e.stopPropagation()}>
          {['Submitted', 'Funded', 'Rejected'].map(s => (
            <button key={s} onClick={() => { onUpdate(active.key, s); setShowDropdown(false) }}
              className={`block w-full text-left px-3 py-1 text-[10px] hover:bg-gray-700 ${statusColor[s] ?? 'text-gray-400'}`}>
              {active.label}: {s}
            </button>
          ))}
          <button onClick={() => setShowDropdown(false)} className="block w-full text-left px-3 py-1 text-[10px] text-gray-500 hover:bg-gray-700">Cancel</button>
        </div>
      )}
    </span>
  )
}
