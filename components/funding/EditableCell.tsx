'use client'

import { useState, useRef } from 'react'
import { fmt$, fmtDate } from '@/lib/utils'

interface EditableCellProps {
  value: string | number | null
  onSave: (val: string | null) => Promise<void>
  type?: 'text' | 'number' | 'date' | 'currency'
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

export function EditableCell({ value, onSave, type = 'text', placeholder = '\u2014', className = '', disabled = false, ariaLabel }: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (e: React.MouseEvent) => {
    if (disabled) return
    e.stopPropagation()
    setDraft(value != null ? String(value) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const save = async () => {
    const newVal = draft.trim() || null
    const oldVal = value != null ? String(value) : null
    if (newVal === oldVal) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(newVal)
    } catch (err) {
      console.error('EditableCell save error:', err)
    }
    setSaving(false)
    setEditing(false)
  }

  const cancel = () => { setEditing(false) }

  if (editing) {
    return (
      <div className="relative w-full">
        {type === 'currency' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>}
        <input
          ref={inputRef}
          type={type === 'currency' || type === 'number' ? 'number' : type}
          step={type === 'currency' ? '0.01' : undefined}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          aria-label={ariaLabel ?? `Edit ${type} value`}
          className={`bg-gray-700 text-white text-xs rounded px-2 py-1 border border-green-500 focus:outline-none w-full ${type === 'currency' ? 'pl-5' : ''} ${className}`}
          onClick={e => e.stopPropagation()}
        />
      </div>
    )
  }

  const display = type === 'currency' && value ? fmt$(Number(value))
    : type === 'date' && value ? fmtDate(String(value))
    : value ?? placeholder

  return (
    <div
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      onClick={startEdit}
      onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startEdit(e as unknown as React.MouseEvent) } }}
      aria-label={ariaLabel ?? (disabled ? undefined : `Edit ${type} value`)}
      className={`rounded px-1 py-0.5 -mx-1 -my-1 min-h-[24px] flex items-center transition-colors w-full text-gray-300 ${saving ? 'opacity-50' : ''} ${disabled ? '' : 'cursor-pointer hover:bg-gray-700 hover:text-white'} ${className}`}
      title={disabled ? undefined : 'Click to edit'}
    >
      {display}
    </div>
  )
}
