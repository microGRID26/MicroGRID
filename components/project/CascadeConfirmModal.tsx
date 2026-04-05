import React from 'react'

interface CascadeReset {
  id: string
  name: string
  currentStatus: string
}

interface CascadeConfirmModalProps {
  cascadeConfirm: {
    taskId: string
    taskName: string
    resets: CascadeReset[]
  }
  onCancel: () => void
  onConfirm: (taskId: string, resetIds: string[]) => void
}

export function CascadeConfirmModal({ cascadeConfirm, onCancel, onConfirm }: CascadeConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center" onClick={onCancel}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-400 text-lg">{'\u21A9'}</span>
          <h3 className="text-sm font-semibold text-white">Revision Required</h3>
        </div>
        <p className="text-xs text-gray-300 mb-3">
          Setting <span className="text-white font-medium">{cascadeConfirm.taskName}</span> to Revision Required
          will reset {cascadeConfirm.resets.length} downstream task{cascadeConfirm.resets.length > 1 ? 's' : ''} to Not Ready:
        </p>
        <div className="bg-gray-800 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto space-y-1.5">
          {cascadeConfirm.resets.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-200">{r.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                r.currentStatus === 'Complete' ? 'bg-green-900 text-green-300' :
                r.currentStatus === 'In Progress' ? 'bg-blue-900 text-blue-300' :
                r.currentStatus === 'Scheduled' ? 'bg-indigo-900 text-indigo-300' :
                'bg-gray-700 text-gray-300'
              }`}>{r.currentStatus} {'\u2192'} Not Ready</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cascadeConfirm.taskId, cascadeConfirm.resets.map(r => r.id))}
            className="px-4 py-1.5 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded-md font-medium"
          >
            Reset {cascadeConfirm.resets.length} task{cascadeConfirm.resets.length > 1 ? 's' : ''} & continue
          </button>
        </div>
      </div>
    </div>
  )
}
