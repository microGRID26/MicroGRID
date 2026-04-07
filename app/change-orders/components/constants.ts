import { fmt$ } from '@/lib/utils'

// ── CONSTANTS ────────────────────────────────────────────────────────────────
export const STATUSES = ['Open', 'In Progress', 'Waiting On Signature', 'Complete', 'Cancelled'] as const
export const PRIORITIES = ['Low', 'Medium', 'High'] as const
export const TYPES = ['HCO Change Order', 'Addendum', 'Cancellation', 'Other'] as const
export const REASONS = ['Production Adjustment', 'Customer Request', 'Engineering Audit', 'Panel Upgrade', 'Battery Add', 'System Downsize', 'Financier Change', 'Other'] as const
export const ORIGINS = ['Internal Audit', 'Customer Request', 'EC Request', 'Engineering', 'Finance', 'Other'] as const

export const WORKFLOW_STEPS = [
  { key: 'design_request_submitted', label: 'Design Request Submitted (HCO)' },
  { key: 'design_in_progress', label: 'Design In Progress' },
  { key: 'design_pending_approval', label: 'Design Pending Approval (HCO)' },
  { key: 'design_approved', label: 'Design Approved (HCO)' },
  { key: 'design_complete', label: 'Design Complete' },
  { key: 'design_signed', label: 'Design Complete and Signed (HCO)' },
] as const

export const STATUS_STYLE: Record<string, string> = {
  'Open': 'bg-red-900 text-red-300',
  'In Progress': 'bg-blue-900 text-blue-300',
  'Waiting On Signature': 'bg-amber-900 text-amber-300',
  'Complete': 'bg-green-900 text-green-300',
  'Cancelled': 'bg-gray-700 text-gray-400',
}

export const PRIORITY_STYLE: Record<string, string> = {
  'High': 'bg-red-900 text-red-300',
  'Medium': 'bg-amber-900 text-amber-300',
  'Low': 'bg-gray-700 text-gray-300',
}

export const COMPARISON_FIELDS: { label: string; origKey: string; newKey: string; format?: 'number' | 'currency' | 'percent' | 'text' }[] = [
  { label: 'KWH/YR', origKey: 'original_kwh_yr', newKey: 'new_kwh_yr', format: 'number' },
  { label: 'Panel Count', origKey: 'original_panel_count', newKey: 'new_panel_count', format: 'number' },
  { label: 'Panel Size', origKey: 'original_panel_size', newKey: 'new_panel_size', format: 'text' },
  { label: 'Panel Type', origKey: 'original_panel_type', newKey: 'new_panel_type', format: 'text' },
  { label: 'System Size (kW)', origKey: 'original_system_size', newKey: 'new_system_size', format: 'number' },
]

export function formatField(value: unknown, format?: string): string {
  if (value == null || value === '') return '-'
  if (format === 'currency') return fmt$(Number(value))
  if (format === 'percent') return `${value}%`
  if (format === 'number') return Number(value).toLocaleString()
  return String(value)
}

export function workflowProgress(co: Record<string, any>): { done: number; total: number } {
  let done = 0
  for (const step of WORKFLOW_STEPS) {
    if (co[step.key as string]) done++
  }
  return { done, total: WORKFLOW_STEPS.length }
}
