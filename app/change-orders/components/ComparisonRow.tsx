'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ChangeOrder } from '@/types/database'
import { COMPARISON_FIELDS, formatField } from './constants'

export function ComparisonRow({ field: f, co, updateField }: {
  field: typeof COMPARISON_FIELDS[number]
  co: ChangeOrder
  updateField: (field: string, value: string | number | null) => void
}) {
  const origVal = co[f.origKey as keyof ChangeOrder]
  const newVal = co[f.newKey as keyof ChangeOrder]
  const [localVal, setLocalVal] = useState(String(newVal ?? ''))

  useEffect(() => { setLocalVal(String(newVal ?? '')) }, [newVal])

  const changed = localVal != null && localVal !== '' && String(origVal) !== String(localVal)

  async function handleBlur() {
    const parsed = f.format === 'text' ? (localVal || null) : (localVal !== '' ? Number(localVal) : null)
    if (String(parsed ?? '') !== String(newVal ?? '')) {
      try {
        await updateField(f.newKey, parsed)
      } catch {
        // Revert local state on save failure
        setLocalVal(String(newVal ?? ''))
      }
    }
  }

  return (
    <div className="grid grid-cols-3 gap-0 px-3 py-1.5 border-b border-gray-800/50 last:border-0 items-center">
      <span className="text-xs text-gray-400">{f.label}</span>
      <span className="text-xs text-gray-300 text-center">{formatField(origVal, f.format)}</span>
      <div className="flex justify-center">
        <input
          type={f.format === 'text' ? 'text' : 'number'}
          value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          placeholder="-"
          className={cn(
            'text-xs text-center bg-transparent border-b border-gray-700 focus:border-green-500 focus:outline-none w-20 py-0.5',
            changed ? 'text-green-400 font-medium border-green-800' : 'text-gray-400'
          )}
        />
      </div>
    </div>
  )
}
