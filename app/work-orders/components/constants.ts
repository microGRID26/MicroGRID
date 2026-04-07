// Shared constants for work-orders components

export const WO_TYPES = ['install', 'service', 'inspection', 'rnr', 'survey'] as const
export const WO_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const WO_STATUSES = ['draft', 'assigned', 'in_progress', 'complete', 'cancelled'] as const

export const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  assigned: 'bg-blue-900 text-blue-300',
  in_progress: 'bg-amber-900 text-amber-300',
  complete: 'bg-green-900 text-green-300',
  cancelled: 'bg-red-900 text-red-300',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

export const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300',
  normal: 'bg-blue-900 text-blue-300',
  high: 'bg-amber-900 text-amber-300',
  urgent: 'bg-red-900 text-red-300',
}

export const TYPE_LABEL: Record<string, string> = {
  install: 'Installation',
  service: 'Service',
  inspection: 'Inspection',
  rnr: 'Roof Remove & Reinstall',
  survey: 'Survey',
}
