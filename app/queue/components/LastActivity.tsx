import { daysAgo } from '@/lib/utils'
import type { Project } from '@/types/database'

export function LastActivity({ p }: { p: Project }) {
  const days = daysAgo(p.stage_date) // Best available proxy
  if (days > 5) {
    return <span className="text-[10px] text-amber-400 font-medium">Stale {days}d</span>
  }
  return <span className="text-[10px] text-gray-600">{days}d ago</span>
}
