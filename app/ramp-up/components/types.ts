import type { Tier, RampConfig, ProjectReadiness, RampScheduleEntry, RoutePoint } from '@/lib/api/ramp-planner'
import type { Project } from '@/types/database'

// ── Proximity Tiers ─────────────────────────────────────────────────────────
export const PROXIMITY_TIERS = [
  { key: 'A' as const, label: '0–3 mi', max: 3, color: '#22c55e', ring: '#22c55e40' },
  { key: 'B' as const, label: '3–6 mi', max: 6, color: '#3b82f6', ring: '#3b82f640' },
  { key: 'C' as const, label: '6–12 mi', max: 12, color: '#f59e0b', ring: '#f59e0b30' },
  { key: 'D' as const, label: '12–24 mi', max: 24, color: '#6b7280', ring: '#6b728020' },
]
export type TierKey = 'A' | 'B' | 'C' | 'D'
export function getTierKey(miles: number): TierKey | null {
  if (miles <= 3) return 'A'
  if (miles <= 6) return 'B'
  if (miles <= 12) return 'C'
  if (miles <= 24) return 'D'
  return null
}

// Map stages to field activity types (Mark's language)
export const FIELD_ACTIVITIES = [
  { key: 'all', label: 'All' },
  { key: 'survey', label: 'Surveys', stages: ['evaluation', 'survey'] },
  { key: 'install', label: 'Installs', stages: ['install'] },
  { key: 'inspection', label: 'Inspections', stages: ['inspection'] },
  { key: 'permit', label: 'Permitting', stages: ['permit'] },
  { key: 'design', label: 'Design', stages: ['design'] },
]
export function stageMatchesActivity(stage: string, activityKey: string): boolean {
  if (activityKey === 'all') return true
  const activity = FIELD_ACTIVITIES.find(a => a.key === activityKey)
  return activity?.stages?.includes(stage) ?? false
}
export const TIER_COLOR_MAP: Record<TierKey, string> = { A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#6b7280' }

export const CREW_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'] // green, blue, amber, pink

// ── Tier display constants ──────────────────────────────────────────────────
export const TIER_COLORS = { 1: 'border-green-500', 2: 'border-amber-500', 3: 'border-blue-500', 4: 'border-red-500' } as const
export const TIER_BG = { 1: 'bg-green-900/20', 2: 'bg-amber-900/20', 3: 'bg-blue-900/20', 4: 'bg-red-900/20' } as const
export const TIER_TEXT = { 1: 'text-green-400', 2: 'text-amber-400', 3: 'text-blue-400', 4: 'text-red-400' } as const

// ── Project with computed fields ─────────────────────────────────────────────
export interface RampProject {
  id: string; name: string; city: string | null; address: string | null; zip: string | null
  ahj: string | null; stage: string; module: string | null; inverter: string | null; battery: string | null
  systemkw: number | null; contract: number | null; pm: string | null; blocker: string | null
  financier: string | null
  tier: Tier; lat: number; lng: number
  distanceMiles: number; driveMinutes: number
  readiness: ProjectReadiness | null; readinessScore: number
  priorityScore: number
}

// Cluster nearby projects have extra distance and proximity tier fields
// The tier field is overridden from readiness tier (1-4) to proximity tier (A/B/C/D)
export type ClusterNearbyProject = Omit<RampProject, 'tier'> & {
  distance: number
  tier: TierKey
}

export type { Tier, RampConfig, ProjectReadiness, RampScheduleEntry, RoutePoint, Project }
