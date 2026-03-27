'use client'

import { useState } from 'react'

export type FundingStatus = 'Ready To Start' | 'Submitted' | 'Pending Resolution' | 'Revision Required' | 'Funded'

export const FUNDING_STATUSES: FundingStatus[] = ['Ready To Start', 'Submitted', 'Pending Resolution', 'Revision Required', 'Funded']

export const FUNDING_STATUS_COMPACT: Record<string, string> = {
  'Ready To Start': 'RTS',
  'Submitted': 'Sub',
  'Pending Resolution': 'Pnd',
  'Revision Required': 'Rev',
  'Funded': 'Fun',
}

/** Standardized status colors used across the funding page */
export function getStatusColor(status: string | null): string {
  switch (status) {
    case 'Funded':
    case 'Complete':
      return 'text-green-400'
    case 'Submitted':
      return 'text-blue-400'
    case 'Ready To Start':
      return 'text-amber-400'
    case 'Pending Resolution':
      return 'text-red-400'
    case 'Revision Required':
      return 'text-orange-400'
    default:
      return 'text-gray-500'
  }
}

interface StatusSelectProps {
  value: string | null
  onSave: (val: string | null) => Promise<void>
  compact?: boolean
  disabled?: boolean
  ariaLabel?: string
}

export function StatusSelect({ value, onSave, compact, disabled = false, ariaLabel }: StatusSelectProps) {
  const [saving, setSaving] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const val = e.target.value || null
    setSaving(true)
    await onSave(val)
    setSaving(false)
  }

  const color = getStatusColor(value)

  return (
    <select
      value={value ?? ''}
      onChange={handleChange}
      onClick={e => e.stopPropagation()}
      disabled={saving || disabled}
      aria-label={ariaLabel ?? 'Funding status'}
      className={`bg-transparent border-0 text-[10px] focus:outline-none w-full ${color} ${saving ? 'opacity-50' : ''} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <option value="">{'\u2014'}</option>
      {FUNDING_STATUSES.map(s => <option key={s} value={s}>{compact ? FUNDING_STATUS_COMPACT[s] : s}</option>)}
    </select>
  )
}
