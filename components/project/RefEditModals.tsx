import React from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- values flow into form input value props with varying types
type RefEditRecord = { id: string; [key: string]: any }

// ── AHJ Edit Modal ───────────────────────────────────────────────────────────

interface AhjEditModalProps {
  ahjEdit: RefEditRecord
  setAhjEdit: React.Dispatch<React.SetStateAction<RefEditRecord | null>>
  onSave: () => void
  refSaving: boolean
}

export function AhjEditModal({ ahjEdit, setAhjEdit, onSave, refSaving }: AhjEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center" onClick={() => setAhjEdit(null)}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Edit AHJ — {ahjEdit.name}</h3>
          <button onClick={() => setAhjEdit(null)} className="text-gray-500 hover:text-white text-lg">×</button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
            <label className="text-xs text-gray-400">Permit Required</label>
            <button onClick={() => setAhjEdit(d => ({ ...d!, permit_required: !d!.permit_required }))}
              className={`w-10 h-5 rounded-full transition-colors relative ${ahjEdit.permit_required !== false ? 'bg-green-500' : 'bg-red-500'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${ahjEdit.permit_required !== false ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className={`text-xs font-medium ${ahjEdit.permit_required !== false ? 'text-green-400' : 'text-red-400'}`}>
              {ahjEdit.permit_required !== false ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Permit Phone</label>
            <input value={ahjEdit.permit_phone ?? ''} onChange={e => setAhjEdit(d => ({ ...d!, permit_phone: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Permit Website</label>
            <input value={ahjEdit.permit_website ?? ''} onChange={e => setAhjEdit(d => ({ ...d!, permit_website: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Max Duration (days)</label>
              <input type="number" value={ahjEdit.max_duration ?? ''} onChange={e => setAhjEdit(d => ({ ...d!, max_duration: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Electric Code</label>
              <input value={ahjEdit.electric_code ?? ''} onChange={e => setAhjEdit(d => ({ ...d!, electric_code: e.target.value || null }))}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Permit Notes</label>
            <textarea rows={3} value={ahjEdit.permit_notes ?? ''} onChange={e => setAhjEdit(d => ({ ...d!, permit_notes: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setAhjEdit(null)} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md">Cancel</button>
          <button onClick={onSave} disabled={refSaving}
            className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md font-medium disabled:opacity-50">
            {refSaving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Utility Edit Modal ───────────────────────────────────────────────────────

interface UtilEditModalProps {
  utilEdit: RefEditRecord
  setUtilEdit: React.Dispatch<React.SetStateAction<RefEditRecord | null>>
  onSave: () => void
  refSaving: boolean
}

export function UtilEditModal({ utilEdit, setUtilEdit, onSave, refSaving }: UtilEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center" onClick={() => setUtilEdit(null)}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Edit Utility — {utilEdit.name}</h3>
          <button onClick={() => setUtilEdit(null)} className="text-gray-500 hover:text-white text-lg">×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Phone</label>
            <input value={utilEdit.phone ?? ''} onChange={e => setUtilEdit(d => ({ ...d!, phone: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Website</label>
            <input value={utilEdit.website ?? ''} onChange={e => setUtilEdit(d => ({ ...d!, website: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea rows={3} value={utilEdit.notes ?? ''} onChange={e => setUtilEdit(d => ({ ...d!, notes: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setUtilEdit(null)} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md">Cancel</button>
          <button onClick={onSave} disabled={refSaving}
            className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md font-medium disabled:opacity-50">
            {refSaving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── HOA Edit Modal ───────────────────────────────────────────────────────────

interface HoaEditModalProps {
  hoaEdit: RefEditRecord
  setHoaEdit: React.Dispatch<React.SetStateAction<RefEditRecord | null>>
  onSave: () => void
  refSaving: boolean
}

export function HoaEditModal({ hoaEdit, setHoaEdit, onSave, refSaving }: HoaEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center" onClick={() => setHoaEdit(null)}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Edit HOA — {hoaEdit.name}</h3>
          <button onClick={() => setHoaEdit(null)} className="text-gray-500 hover:text-white text-lg">×</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Contact Name</label>
              <input value={hoaEdit.contact_name ?? ''} onChange={e => setHoaEdit(d => ({ ...d!, contact_name: e.target.value || null }))}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Phone</label>
              <input value={hoaEdit.phone ?? ''} onChange={e => setHoaEdit(d => ({ ...d!, phone: e.target.value || null }))}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Contact Email</label>
            <input value={hoaEdit.contact_email ?? ''} onChange={e => setHoaEdit(d => ({ ...d!, contact_email: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Website</label>
            <input value={hoaEdit.website ?? ''} onChange={e => setHoaEdit(d => ({ ...d!, website: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea rows={3} value={hoaEdit.notes ?? ''} onChange={e => setHoaEdit(d => ({ ...d!, notes: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setHoaEdit(null)} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md">Cancel</button>
          <button onClick={onSave} disabled={refSaving}
            className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md font-medium disabled:opacity-50">
            {refSaving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Financier Edit Modal ─────────────────────────────────────────────────────

interface FinancierEditModalProps {
  financierEdit: RefEditRecord
  setFinancierEdit: React.Dispatch<React.SetStateAction<RefEditRecord | null>>
  onSave: () => void
  refSaving: boolean
}

export function FinancierEditModal({ financierEdit, setFinancierEdit, onSave, refSaving }: FinancierEditModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center" onClick={() => setFinancierEdit(null)}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Edit Financier — {financierEdit.name}</h3>
          <button onClick={() => setFinancierEdit(null)} className="text-gray-500 hover:text-white text-lg">x</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Contact Name</label>
              <input value={financierEdit.contact_name ?? ''} onChange={e => setFinancierEdit(d => ({ ...d!, contact_name: e.target.value || null }))}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Phone</label>
              <input value={financierEdit.phone ?? ''} onChange={e => setFinancierEdit(d => ({ ...d!, phone: e.target.value || null }))}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Contact Email</label>
            <input value={financierEdit.contact_email ?? ''} onChange={e => setFinancierEdit(d => ({ ...d!, contact_email: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Website</label>
            <input value={financierEdit.website ?? ''} onChange={e => setFinancierEdit(d => ({ ...d!, website: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes</label>
            <textarea rows={3} value={financierEdit.notes ?? ''} onChange={e => setFinancierEdit(d => ({ ...d!, notes: e.target.value || null }))}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setFinancierEdit(null)} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md">Cancel</button>
          <button onClick={onSave} disabled={refSaving}
            className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md font-medium disabled:opacity-50">
            {refSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
