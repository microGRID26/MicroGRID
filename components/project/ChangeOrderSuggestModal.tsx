import React from 'react'

interface ChangeOrderSuggestModalProps {
  changeOrderSuggest: {
    taskName: string
    reason: string
  }
  onSkip: () => void
  onCreateOrder: () => void
  coSaving: boolean
}

export function ChangeOrderSuggestModal({ changeOrderSuggest, onSkip, onCreateOrder, coSaving }: ChangeOrderSuggestModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center" onClick={onSkip}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-blue-400 text-lg">{'\u{1F4CB}'}</span>
          <h3 className="text-sm font-semibold text-white">Create Change Order?</h3>
        </div>
        <p className="text-xs text-gray-300 mb-4">
          <span className="text-white font-medium">{changeOrderSuggest.taskName}</span> was set to Revision Required
          {changeOrderSuggest.reason ? ` for "${changeOrderSuggest.reason}"` : ''}.
          Would you like to create a change order to track this?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md"
          >
            Skip
          </button>
          <button
            disabled={coSaving}
            onClick={onCreateOrder}
            className="px-4 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded-md font-medium"
          >
            {coSaving ? 'Creating...' : 'Create Change Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
