import type { Project } from '@/types/database'

/** Project with computed follow-up fields attached in the followUps memo */
export interface ProjectWithFollowUp extends Project {
  _taskFollowUp: { date: string; taskName: string } | null
  _followUpDate: string | null
}

export const CARD_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Address' },
  { key: 'financier', label: 'Financier' },
  { key: 'contract', label: 'Contract' },
  { key: 'systemkw', label: 'System kW' },
  { key: 'ahj', label: 'AHJ' },
  { key: 'pm', label: 'PM' },
  { key: 'stage', label: 'Stage' },
  { key: 'sale_date', label: 'Sale Date' },
]

// ── Filter types ────────────────────────────────────────────────────────────
export interface QueueFilters {
  stages: Set<string>
  financier: string
  ahj: string
  blockedOnly: boolean
  daysRange: '' | '<7' | '7-30' | '30-90' | '90+'
}

export const EMPTY_FILTERS: QueueFilters = {
  stages: new Set<string>(),
  financier: '',
  ahj: '',
  blockedOnly: false,
  daysRange: '',
}

export type SectionSortKey = 'days' | 'contract' | 'name'

// ── Funding status type ──────────────────────────────────────────────────────
export interface FundingRecord {
  project_id: string
  m1_status: string | null
  m2_status: string | null
  m3_status: string | null
}

// ── Configurable queue sections ──────────────────────────────────────────
export interface QueueSectionConfig { id: string; label: string; task_id: string; match_status: string; color: string; icon: string; sort_order: number }
export const HARDCODED_SECTIONS: QueueSectionConfig[] = [
  { id: 'hc-1', label: 'City Permit Approval — Ready to Start', task_id: 'city_permit', match_status: 'Ready To Start', color: 'blue', icon: '📋', sort_order: 1 },
  { id: 'hc-2', label: 'City Permit — Submitted, Pending Approval', task_id: 'city_permit', match_status: 'In Progress,Scheduled,Pending Resolution,Revision Required', color: 'indigo', icon: '📄', sort_order: 2 },
  { id: 'hc-3', label: 'Utility Permit — Submitted, Pending Approval', task_id: 'util_permit', match_status: 'In Progress,Scheduled,Pending Resolution,Revision Required', color: 'purple', icon: '📄', sort_order: 3 },
  { id: 'hc-4', label: 'Utility Inspection — Ready to Start', task_id: 'util_insp', match_status: 'Ready To Start', color: 'teal', icon: '⚡', sort_order: 4 },
  { id: 'hc-5', label: 'Utility Inspection — Submitted, Pending Approval', task_id: 'util_insp', match_status: 'In Progress,Scheduled,Pending Resolution,Revision Required', color: 'cyan', icon: '⚡', sort_order: 5 },
]

export const STATUS_COLOR: Record<string, string> = {
  crit: 'bg-red-500',
  risk: 'bg-amber-500',
  warn: 'bg-yellow-500',
  ok:   'bg-green-500',
}

export const COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-400', indigo: 'text-indigo-400', purple: 'text-purple-400',
  teal: 'text-teal-400', cyan: 'text-cyan-400', green: 'text-green-400',
  red: 'text-red-400', amber: 'text-amber-400', gray: 'text-gray-400',
  yellow: 'text-yellow-400', pink: 'text-pink-400', orange: 'text-orange-400',
}
export const COLOR_HOVER: Record<string, string> = {
  blue: 'hover:text-blue-300', indigo: 'hover:text-indigo-300', purple: 'hover:text-purple-300',
  teal: 'hover:text-teal-300', cyan: 'hover:text-cyan-300', green: 'hover:text-green-300',
  red: 'hover:text-red-300', amber: 'hover:text-amber-300', gray: 'hover:text-gray-300',
  yellow: 'hover:text-yellow-300', pink: 'hover:text-pink-300', orange: 'hover:text-orange-300',
}
