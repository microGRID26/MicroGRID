import { ArrowUpDown } from 'lucide-react'
import type { SectionSortKey } from './types'

export function SortToggle({ sectionKey, current, onCycle }: { sectionKey: string; current: SectionSortKey; onCycle: (key: string) => void }) {
  const labels: Record<SectionSortKey, string> = { days: 'Days', contract: 'Value', name: 'Name' }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCycle(sectionKey) }}
      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors px-1.5 py-0.5 rounded border border-gray-700/50 hover:border-gray-600"
      title={`Sort by: ${labels[current]}`}
    >
      <ArrowUpDown className="w-3 h-3" />
      {labels[current]}
    </button>
  )
}
