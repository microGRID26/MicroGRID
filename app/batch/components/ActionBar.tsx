import { cn } from '@/lib/utils'
import { Play, Download } from 'lucide-react'
import type { ProjectInput } from './types'

// ── ACTION BAR ───────────────────────────────────────────────────────────────

export function ActionBar({ projects, processing, completedCount, processAll, downloadSummary }: {
  projects: ProjectInput[]
  processing: boolean
  completedCount: number
  processAll: () => void
  downloadSummary: () => void
}) {
  if (projects.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      <button
        onClick={processAll}
        disabled={processing || projects.every(p => p.status === 'complete')}
        className={cn(
          'flex items-center gap-2 font-semibold px-8 py-3 rounded-lg text-base transition-colors shadow-lg',
          processing || projects.every(p => p.status === 'complete')
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30'
        )}
      >
        <Play className="w-5 h-5" />
        {processing ? 'Processing...' : 'Process All'}
      </button>

      {completedCount > 0 && (
        <button
          onClick={downloadSummary}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg text-base transition-colors"
        >
          <Download className="w-5 h-5" />
          Download Summary CSV
        </button>
      )}
    </div>
  )
}
