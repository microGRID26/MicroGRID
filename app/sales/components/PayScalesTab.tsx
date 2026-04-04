import React, { useState } from 'react'
import { addPayScale, updatePayScale, deletePayScale } from '@/lib/api'
import type { PayScale } from '@/lib/api'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export function PayScalesTab({ payScales, orgId, isAdmin, onRefresh }: {
  payScales: PayScale[]
  orgId: string | null
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', per_watt_rate: '', adder_percentage: '10', referral_bonus: '500' })
  const [saving, setSaving] = useState(false)

  const startEdit = (scale: PayScale) => {
    setEditingId(scale.id)
    setForm({
      name: scale.name,
      description: scale.description ?? '',
      per_watt_rate: String(scale.per_watt_rate),
      adder_percentage: String(scale.adder_percentage),
      referral_bonus: String(scale.referral_bonus),
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    await updatePayScale(editingId, {
      name: form.name.trim(),
      description: form.description.trim() || null,
      per_watt_rate: parseFloat(form.per_watt_rate) || 0,
      adder_percentage: parseFloat(form.adder_percentage) || 0,
      referral_bonus: parseFloat(form.referral_bonus) || 0,
    })
    setSaving(false)
    setEditingId(null)
    onRefresh()
  }

  const saveNew = async () => {
    setSaving(true)
    await addPayScale({
      name: form.name.trim(),
      per_watt_rate: parseFloat(form.per_watt_rate) || 0,
      description: form.description.trim() || undefined,
      adder_percentage: parseFloat(form.adder_percentage) || 0,
      referral_bonus: parseFloat(form.referral_bonus) || 0,
      sort_order: payScales.length + 1,
      org_id: orgId || undefined,
    })
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', description: '', per_watt_rate: '', adder_percentage: '10', referral_bonus: '500' })
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pay scale tier?')) return
    await deletePayScale(id)
    onRefresh()
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
        <p className="text-xs text-blue-300">
          Pay scale tiers define how much a rep earns per watt. The <strong>override</strong> is the difference between
          the team&apos;s stack rate and the rep&apos;s tier rate. For example, if a team stack is $0.40/W and the rep
          is on Consultant ($0.20/W), the override is <strong>$0.20/W</strong> -- which gets distributed to leadership per the Distribution tab.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {payScales.map(scale => {
          const isEditing = editingId === scale.id
          return (
            <div key={scale.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative group">
              {isEditing ? (
                <div className="space-y-2">
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500" />
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-green-500" />
                  <div>
                    <label className="text-[10px] text-gray-500">Rate ($/W)</label>
                    <input type="number" step="0.01" value={form.per_watt_rate} onChange={e => setForm({ ...form, per_watt_rate: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500">Adder %</label>
                      <input type="number" value={form.adder_percentage} onChange={e => setForm({ ...form, adder_percentage: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-green-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Referral $</label>
                      <input type="number" value={form.referral_bonus} onChange={e => setForm({ ...form, referral_bonus: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-green-500" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={saveEdit} disabled={saving}
                      className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] rounded">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-gray-400 hover:text-white text-[10px]">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(scale)} className="text-gray-500 hover:text-white p-1"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(scale.id)} className="text-gray-500 hover:text-red-400 p-1"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-white mb-1">{scale.name}</h3>
                    {scale.description && <p className="text-[10px] text-gray-400 mb-3">{scale.description}</p>}
                    <p className="text-3xl font-bold text-green-400 tracking-tight">${Number(scale.per_watt_rate).toFixed(2)}<span className="text-lg text-green-500">/W</span></p>
                    <div className="mt-3 flex justify-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Adder</p>
                        <p className="text-xs text-gray-300 font-medium">{Number(scale.adder_percentage)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500">Referral</p>
                        <p className="text-xs text-gray-300 font-medium">${Number(scale.referral_bonus)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {isAdmin && !showAdd && (
          <button onClick={() => { setShowAdd(true); setForm({ name: '', description: '', per_watt_rate: '', adder_percentage: '10', referral_bonus: '500' }) }}
            className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-green-600 hover:bg-gray-800 transition-colors min-h-[180px]">
            <Plus className="w-6 h-6 text-gray-500" />
            <span className="text-xs text-gray-500">Add Tier</span>
          </button>
        )}

        {showAdd && (
          <div className="bg-gray-800 border border-green-700/50 rounded-xl p-5">
            <div className="space-y-2">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tier name"
                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500" />
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-gray-300 focus:outline-none focus:border-green-500" />
              <div>
                <label className="text-[10px] text-gray-500">Rate ($/W)</label>
                <input type="number" step="0.01" value={form.per_watt_rate} onChange={e => setForm({ ...form, per_watt_rate: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500">Adder %</label>
                  <input type="number" value={form.adder_percentage} onChange={e => setForm({ ...form, adder_percentage: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500">Referral $</label>
                  <input type="number" value={form.referral_bonus} onChange={e => setForm({ ...form, referral_bonus: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-green-500" />
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={saveNew} disabled={saving || !form.name.trim() || !form.per_watt_rate}
                  className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-[10px] rounded">
                  {saving ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-2 py-1 text-gray-400 hover:text-white text-[10px]">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
