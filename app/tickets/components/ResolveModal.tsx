import type { TicketResolutionCode } from '@/lib/api/tickets'
import { X } from 'lucide-react'

interface ResolveModalProps {
  resolveCategory: string
  setResolveCategory: (v: string) => void
  resolveNotes: string
  setResolveNotes: (v: string) => void
  resolutionCodes: TicketResolutionCode[]
  onClose: () => void
  onResolve: () => void
}

export function ResolveModal({ resolveCategory, setResolveCategory, resolveNotes, setResolveNotes, resolutionCodes, onClose, onResolve }: ResolveModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Resolve Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Resolution Category *</label>
            <select value={resolveCategory} onChange={e => setResolveCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
              <option value="">Select resolution...</option>
              {resolutionCodes.map(r => <option key={r.id} value={r.code}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Resolution Notes</label>
            <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
              rows={3} placeholder="Describe what was done to resolve this ticket..."
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-green-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
          <button onClick={onResolve} disabled={!resolveCategory}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium rounded-md">
            Resolve Ticket
          </button>
        </div>
      </div>
    </div>
  )
}
