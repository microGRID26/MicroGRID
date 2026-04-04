import { cn } from '@/lib/utils'
import {
  Clock, CheckCircle2, XCircle, FileText, Settings,
} from 'lucide-react'
import type { ProjectInput } from './types'

export function NumField({ label, value, onChange, unit, step, className }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1">{label}{unit ? ` (${unit})` : ''}</label>
      <input
        type="number"
        step={step ?? 'any'}
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none"
      />
    </div>
  )
}

export function TextField({ label, value, onChange, className }: {
  label: string; value: string; onChange: (v: string) => void; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none"
      />
    </div>
  )
}

export function StatusBadge({ status }: { status: ProjectInput['status'] }) {
  const config = {
    pending: { icon: Clock, text: 'Pending', cls: 'text-gray-400 bg-gray-700' },
    editing: { icon: FileText, text: 'Editing', cls: 'text-blue-400 bg-blue-900/30' },
    processing: { icon: Settings, text: 'Processing', cls: 'text-amber-400 bg-amber-900/30 animate-pulse' },
    complete: { icon: CheckCircle2, text: 'Complete', cls: 'text-green-400 bg-green-900/30' },
    error: { icon: XCircle, text: 'Error', cls: 'text-red-400 bg-red-900/30' },
  }[status]
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', config.cls)}>
      <Icon className="w-3 h-3" />
      {config.text}
    </span>
  )
}
