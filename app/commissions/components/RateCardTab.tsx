import React, { useState } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { fmt$ } from '@/lib/utils'
import {
  updateCommissionRate,
  addCommissionRate,
  deleteCommissionRate,
} from '@/lib/api'
import { ROLE_LABELS } from './types'
import type { CommissionRate } from '@/types/database'

// ── Rate Card Tab (Admin only) ───────────────────────────────────────────────

export function RateCardTab({ rates, onReload, orgId }: { rates: CommissionRate[]; onReload: () => void; orgId: string | null }) {
  const { user: currentUser } = useCurrentUser()
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false

  const [editing, setEditing] = useState<CommissionRate | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState<Partial<CommissionRate>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const openEdit = (r: CommissionRate) => {
    setEditing(r)
    setDraft({ ...r })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await updateCommissionRate(editing.id, {
        role_key: draft.role_key,
        label: draft.label,
        rate_type: draft.rate_type,
        rate: draft.rate,
        description: draft.description,
        active: draft.active,
        sort_order: draft.sort_order,
      })
      setEditing(null)
      setToast('Rate saved')
      onReload()
    } catch {
      setToast('Save failed')
    }
    setSaving(false)
    setTimeout(() => setToast(''), 2500)
  }

  const createNew = async () => {
    if (!draft.role_key?.trim() || !draft.label?.trim()) return
    setSaving(true)
    try {
      await addCommissionRate({
        role_key: draft.role_key ?? '',
        label: draft.label ?? '',
        rate_type: draft.rate_type ?? 'per_watt',
        rate: draft.rate ?? 0,
        description: draft.description ?? null,
        active: draft.active ?? true,
        sort_order: draft.sort_order ?? 0,
        org_id: orgId,
      })
      setShowNew(false)
      setDraft({})
      setToast('Rate created')
      onReload()
    } catch {
      setToast('Create failed')
    }
    setSaving(false)
    setTimeout(() => setToast(''), 2500)
  }

  const deleteRate = async (r: CommissionRate) => {
    if (!confirm(`Delete rate "${r.label}"?`)) return
    try {
      await deleteCommissionRate(r.id)
      setToast('Rate deleted')
      onReload()
    } catch {
      setToast('Delete failed')
    }
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-5 right-5 bg-green-700 text-white text-xs px-4 py-2 rounded-md shadow-lg z-[200]">{toast}</div>}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{rates.length} rate records</p>
        <button onClick={() => { setShowNew(true); setDraft({ active: true, rate_type: 'per_watt', sort_order: 0 }) }}
          className="px-3 py-1.5 text-xs bg-green-700 text-white rounded-md hover:bg-green-600">+ New Rate</button>
      </div>

      <div className="overflow-auto rounded-lg border border-gray-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
            <tr>
              {['Role', 'Label', 'Type', 'Rate', 'Description', 'Active', 'Order'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium">{h}</th>
              ))}
              <th className="px-3 py-2.5 w-16" />
            </tr>
          </thead>
          <tbody>
            {rates.map((r, i) => (
              <tr key={r.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/20'}`}>
                <td className="px-3 py-2 text-white font-medium">{ROLE_LABELS[r.role_key] ?? r.role_key}</td>
                <td className="px-3 py-2 text-gray-300">{r.label}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                    r.rate_type === 'per_watt' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' :
                    r.rate_type === 'percentage' ? 'bg-amber-900/40 text-amber-400 border border-amber-800' :
                    'bg-green-900/40 text-green-400 border border-green-800'
                  }`}>
                    {r.rate_type === 'per_watt' ? 'Per Watt' : r.rate_type === 'percentage' ? 'Percentage' : 'Flat Fee'}
                  </span>
                </td>
                <td className="px-3 py-2 text-white font-mono">
                  {r.rate_type === 'per_watt' ? `$${r.rate}/W` :
                   r.rate_type === 'percentage' ? `${r.rate}%` :
                   fmt$(r.rate)}
                </td>
                <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{r.description || '\u2014'}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${r.active ? 'bg-green-400' : 'bg-gray-600'}`} />
                </td>
                <td className="px-3 py-2 text-gray-500">{r.sort_order}</td>
                <td className="px-3 py-2 flex gap-1">
                  <button onClick={() => openEdit(r)} className="text-gray-500 hover:text-blue-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => deleteRate(r)} className="text-gray-500 hover:text-red-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-600 text-sm">No rates configured</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / New modal */}
      {(editing || showNew) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setEditing(null); setShowNew(false) }} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">{editing ? `Edit Rate \u2014 ${editing.label}` : 'New Commission Rate'}</h2>
              <button onClick={() => { setEditing(null); setShowNew(false) }} className="text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">Role Key</label>
                  <input value={draft.role_key ?? ''} onChange={e => setDraft(d => ({ ...d, role_key: e.target.value }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">Label</label>
                  <input value={draft.label ?? ''} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">Rate Type</label>
                  <select value={draft.rate_type ?? 'per_watt'} onChange={e => setDraft(d => ({ ...d, rate_type: e.target.value as CommissionRate['rate_type'] }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500">
                    <option value="per_watt">Per Watt</option>
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Fee</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">
                    Rate {draft.rate_type === 'per_watt' ? '($/W)' : draft.rate_type === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input type="number" step="0.01" value={draft.rate ?? ''} onChange={e => setDraft(d => ({ ...d, rate: parseFloat(e.target.value) || 0 }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Description</label>
                <input value={draft.description ?? ''} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                  className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 font-medium">Sort Order</label>
                  <input type="number" value={draft.sort_order ?? 0} onChange={e => setDraft(d => ({ ...d, sort_order: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={draft.active ?? true} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500" />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setEditing(null); setShowNew(false) }} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md">Cancel</button>
                <button onClick={editing ? save : createNew} disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
