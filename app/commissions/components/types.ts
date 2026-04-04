import { DEFAULT_ROLES } from '@/lib/api'

// Build a lookup map from the DEFAULT_ROLES array
export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_ROLES.map(r => [r.key, r.label])
)

// ── Types ────────────────────────────────────────────────────────────────────

export type Tab = 'calculator' | 'earnings' | 'advances' | 'leaderboard' | 'rates'
export type Period = 'month' | 'quarter' | 'year' | 'all'
export type LeaderboardMetric = 'commission' | 'deals' | 'kw'
export type SortCol = 'project_id' | 'user_name' | 'system_watts' | 'role_key' | 'solar_commission' | 'adder_commission' | 'referral_commission' | 'total_commission' | 'status' | 'created_at' | 'days_since_sale'

export const PERIOD_LABELS: Record<Period, string> = {
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
  all: 'All Time',
}

export function getPeriodStart(period: Period): string | null {
  if (period === 'all') return null
  const now = new Date()
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3
    return new Date(now.getFullYear(), q, 1).toISOString()
  }
  return new Date(now.getFullYear(), 0, 1).toISOString()
}

// ── Leaderboard entry type ──────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string | null
  userName: string
  deals: number
  totalKw: number
  totalCommission: number
  avgPerDeal: number
}
