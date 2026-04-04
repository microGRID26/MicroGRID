import { useState } from 'react'
import { CARD_FIELD_OPTIONS } from './types'

export function CardFieldsModal({ selected, onSave, onClose }: {
  selected: string[]
  onSave: (fields: string[]) => void
  onClose: () => void
}) {
  const [fields, setFields] = useState<Set<string>>(new Set(selected))

  function toggle(key: string) {
    setFields(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xs mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-white">Card Fields</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-4 py-3 space-y-2">
          {CARD_FIELD_OPTIONS.map(opt => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fields.has(opt.key)} onChange={() => toggle(opt.key)}
                className="rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900" />
              <span className={`text-xs ${fields.has(opt.key) ? 'text-gray-200' : 'text-gray-500'}`}>{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-800">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md px-3 py-1.5">Cancel</button>
          <button onClick={() => onSave([...fields])} className="text-xs bg-green-600 hover:bg-green-500 text-white font-medium rounded-md px-3 py-1.5">Save</button>
        </div>
      </div>
    </div>
  )
}
