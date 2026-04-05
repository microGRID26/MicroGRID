import type { FundingRecord } from './types'

export function FundingBadge({ funding }: { funding?: FundingRecord }) {
  if (!funding) return null
  const milestones: { label: string; status: string | null }[] = [
    { label: 'M3', status: funding.m3_status },
    { label: 'M2', status: funding.m2_status },
    { label: 'M1', status: funding.m1_status },
  ]
  const active = milestones.find(m => m.status && m.status !== 'Not Eligible')
  if (!active || !active.status) return null

  const statusShort: Record<string, string> = {
    Eligible: 'Elig', Submitted: 'Sub', Funded: 'Fun', Rejected: 'Rej',
  }
  const statusColor: Record<string, string> = {
    Eligible: 'text-green-400', Submitted: 'text-blue-400', Funded: 'text-emerald-300', Rejected: 'text-red-400',
  }
  return (
    <span className={`text-[10px] font-medium ${statusColor[active.status] ?? 'text-gray-400'}`}>
      {active.label}:{statusShort[active.status] ?? active.status}
    </span>
  )
}
