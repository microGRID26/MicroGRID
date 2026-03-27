'use client'

import type { MilestoneKey, MsData } from './types'
import { EditableCell } from './EditableCell'
import { StatusSelect } from './StatusSelect'
import { MsBadge } from './MsBadge'
import { daysAgo } from '@/lib/utils'

interface MsCellsProps {
  ms: MilestoneKey
  data: MsData
  pid: string
  saveFundingField: (projectId: string, field: string, value: string | number | null) => Promise<void>
  disabled?: boolean
}

/** Get stale submission indicator for the badge cell */
export function getSubmissionAge(status: string | null, submittedDate: string | null): { days: number; color: string } | null {
  if (status !== 'Submitted' || !submittedDate) return null
  const days = daysAgo(submittedDate)
  if (days > 60) return { days, color: 'text-red-400' }
  if (days > 30) return { days, color: 'text-amber-400' }
  return { days, color: 'text-gray-500' }
}

export function MsCells({ ms, data, pid, saveFundingField, disabled = false }: MsCellsProps) {
  const field = (f: string) => `${ms}_${f}`
  const stale = getSubmissionAge(data.status, data.funded_date)

  return (
    <>
      <td className="px-1 py-1.5 font-mono text-center">
        <div className="flex flex-col items-center">
          <MsBadge ms={ms} data={data} />
          {stale && <span className={`text-[9px] ${stale.color} mt-0.5`}>{stale.days}d</span>}
        </div>
      </td>
      <td className="px-1 py-1.5 font-mono">
        <EditableCell value={data.amount} type="currency" disabled={disabled}
          onSave={async val => saveFundingField(pid, field('amount'), val ? Number(val) : null)} />
      </td>
      <td className="px-1 py-1.5">
        <EditableCell value={data.funded_date} type="date" disabled={disabled}
          onSave={async val => saveFundingField(pid, field('funded_date'), val)} />
      </td>
      <td className="px-1 py-1.5">
        <StatusSelect value={data.status} disabled={disabled}
          onSave={async val => saveFundingField(pid, field('status'), val)} compact />
      </td>
    </>
  )
}
