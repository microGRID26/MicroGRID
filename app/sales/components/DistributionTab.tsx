import React, { useState } from 'react'
import { updatePayDistribution, addPayDistribution } from '@/lib/api'
import type { PayDistribution } from '@/lib/api'
import { Plus, Pencil, AlertTriangle, CheckCircle } from 'lucide-react'

export function DistributionTab({ distribution, orgId, isAdmin, onRefresh }: {
  distribution: PayDistribution[]
  orgId: string | null
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPct, setEditPct] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newRoleKey, setNewRoleKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newPct, setNewPct] = useState('')
  const [saving, setSaving] = useState(false)

  const active = distribution.filter(d => d.active)
  const totalPct = active.reduce((sum, d) => sum + Number(d.percentage), 0)
  const isBalanced = Math.abs(totalPct - 100) < 0.01
  const maxPct = Math.max(...active.map(d => Number(d.percentage)), 1)

  const startEdit = (d: PayDistribution) => {
    setEditingId(d.id)
    setEditPct(String(d.percentage))
    setEditLabel(d.label)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    await updatePayDistribution(editingId, {
      label: editLabel.trim(),
      percentage: parseFloat(editPct) || 0,
    })
    setSaving(false)
    setEditingId(null)
    onRefresh()
  }

  const handleAdd = async () => {
    if (!newRoleKey.trim() || !newLabel.trim()) return
    setSaving(true)
    await addPayDistribution({
      role_key: newRoleKey.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newLabel.trim(),
      percentage: parseFloat(newPct) || 0,
      sort_order: distribution.length + 1,
      active: true,
      org_id: orgId || undefined,
    })
    setSaving(false)
    setShowAdd(false)
    setNewRoleKey(''); setNewLabel(''); setNewPct('')
    onRefresh()
  }

  const toggleActive = async (d: PayDistribution) => {
    await updatePayDistribution(d.id, { active: !d.active })
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {!isBalanced && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">
            Distribution percentages total <strong>{totalPct.toFixed(1)}%</strong> -- they must sum to 100%.
          </p>
        </div>
      )}
      {isBalanced && (
        <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-300">Distribution totals <strong>100%</strong>. All good.</p>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-white mb-4">Override Distribution Split</h3>
        <div className="space-y-3">
          {active.map(d => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 w-32 text-right truncate">{d.label}</span>
              <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded-full flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${(Number(d.percentage) / maxPct) * 100}%`, minWidth: Number(d.percentage) > 0 ? '24px' : '0' }}
                >
                  <span className="text-[10px] text-white font-medium">{Number(d.percentage)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 text-[10px] uppercase tracking-wider text-gray-400">
              <th className="px-4 py-2 font-medium">Role Key</th>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Percentage</th>
              <th className="px-4 py-2 font-medium">Active</th>
              {isAdmin && <th className="px-4 py-2 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {distribution.map(d => {
              const isEditing = editingId === d.id
              return (
                <tr key={d.id} className="border-b border-gray-700/50 text-xs">
                  <td className="px-4 py-2 text-gray-400 font-mono text-[10px]">{d.role_key}</td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-32 focus:outline-none focus:border-green-500" />
                    ) : (
                      <span className="text-gray-300">{d.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input type="number" step="0.5" value={editPct} onChange={e => setEditPct(e.target.value)}
                        className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-20 focus:outline-none focus:border-green-500" />
                    ) : (
                      <span className="text-white font-medium">{Number(d.percentage)}%</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isAdmin ? (
                      <button onClick={() => toggleActive(d)}
                        className={`w-3 h-3 rounded-full ${d.active ? 'bg-green-500' : 'bg-gray-600'}`}
                        title={d.active ? 'Active' : 'Inactive'}
                      />
                    ) : (
                      <span className={`w-3 h-3 rounded-full inline-block ${d.active ? 'bg-green-500' : 'bg-gray-600'}`} />
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} disabled={saving}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded">Save</button>
                          <button onClick={() => setEditingId(null)}
                            className="px-2 py-0.5 text-gray-400 hover:text-white text-[10px]">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(d)} className="text-gray-500 hover:text-white">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-600">
              <td className="px-4 py-2" />
              <td className="px-4 py-2 text-xs text-gray-400 font-medium">Total</td>
              <td className="px-4 py-2">
                <span className={`text-xs font-bold ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPct.toFixed(1)}%
                </span>
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {isAdmin && (
        <div>
          {showAdd ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Role Key</label>
                <input value={newRoleKey} onChange={e => setNewRoleKey(e.target.value)} placeholder="e.g. trainer"
                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Label</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Trainer"
                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">%</label>
                <input type="number" step="0.5" value={newPct} onChange={e => setNewPct(e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white w-16 focus:outline-none focus:border-green-500" />
              </div>
              <button onClick={handleAdd} disabled={saving || !newRoleKey.trim() || !newLabel.trim()}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded">Add</button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-1 text-gray-400 hover:text-white text-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-md">
              <Plus className="w-3.5 h-3.5" /> Add Role
            </button>
          )}
        </div>
      )}
    </div>
  )
}
