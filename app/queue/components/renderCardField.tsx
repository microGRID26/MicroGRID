import { fmt$, fmtDate, STAGE_LABELS } from '@/lib/utils'
import type { Project } from '@/types/database'

export function renderCardField(key: string, p: Project) {
  switch (key) {
    case 'name': return null
    case 'city': return p.city ? <span key={key}>{p.city}</span> : null
    case 'address': return p.address ? <span key={key}>{p.address}</span> : null
    case 'financier': return p.financier ? <span key={key}>{p.financier}</span> : null
    case 'contract': return p.contract ? <span key={key}>{fmt$(p.contract)}</span> : null
    case 'systemkw': return p.systemkw ? <span key={key}>{p.systemkw} kW</span> : null
    case 'ahj': return p.ahj ? <span key={key}>{p.ahj}</span> : null
    case 'pm': return p.pm ? <span key={key}>{p.pm}</span> : null
    case 'stage': return <span key={key} className="text-green-400">{STAGE_LABELS[p.stage]}</span>
    case 'sale_date': return p.sale_date ? <span key={key}>{fmtDate(p.sale_date)}</span> : null
    default: return null
  }
}
