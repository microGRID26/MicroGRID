'use client'

import { useEffect, useState, useCallback } from 'react'
import { loadInvoiceRules, addInvoiceRule, updateInvoiceRule, deleteInvoiceRule, MILESTONE_LABELS } from '@/lib/api/invoices'
import type { InvoiceRule } from '@/lib/api/invoices'
import { Modal, SaveBtn, SearchBar, Badge } from './shared'
import { Plus, Trash2, Edit3, X, ChevronDown, ChevronUp } from 'lucide-react'

const ORG_TYPE_LABELS: Record<string, string> = {
  platform: 'Platform (EDGE)',
  epc: 'EPC',
  sales: 'Sales & Marketing',
  engineering: 'Engineering',
  supply: 'Supply',
  customer: 'Customer',
}

const ORG_TYPES = ['platform', 'epc', 'sales', 'engineering', 'supply', 'customer'] as const

const MILESTONES = [
  'contract_signed', 'ntp', 'design_complete', 'permit_approved',
  'installation', 'install_complete', 'inspection_passed', 'pto', 'monthly',
] as const

interface LineItemTemplate {
  description: string
  quantity?: number
  unit_price?: number
  category?: string
}

interface RuleDraft {
  name: string
  milestone: string
  from_org_type: string
  to_org_type: string
  line_items: LineItemTemplate[]
  active: boolean
}

const EMPTY_DRAFT: RuleDraft = {
  name: '',
  milestone: '',
  from_org_type: '',
  to_org_type: '',
  line_items: [{ description: '', category: '' }],
  active: true,
}

export function InvoiceRulesManager({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [rules, setRules] = useState<InvoiceRule[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<InvoiceRule | null>(null)
  const [draft, setDraft] = useState<RuleDraft>({ ...EMPTY_DRAFT })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await loadInvoiceRules()
    setRules(data)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = rules.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return r.name.toLowerCase().includes(q)
      || r.milestone.toLowerCase().includes(q)
      || r.from_org_type.toLowerCase().includes(q)
      || r.to_org_type.toLowerCase().includes(q)
  })

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function openEdit(rule: InvoiceRule) {
    setEditing(rule)
    setDraft({
      name: rule.name,
      milestone: rule.milestone,
      from_org_type: rule.from_org_type,
      to_org_type: rule.to_org_type,
      line_items: (rule.line_items as unknown as LineItemTemplate[]).length > 0
        ? (rule.line_items as unknown as LineItemTemplate[])
        : [{ description: '', category: '' }],
      active: rule.active,
    })
  }

  function openNew() {
    setShowNew(true)
    setDraft({ ...EMPTY_DRAFT, line_items: [{ description: '', category: '' }] })
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.milestone || !draft.from_org_type || !draft.to_org_type) return
    setSaving(true)
    const items = draft.line_items.filter(i => i.description.trim())
    if (editing) {
      const result = await updateInvoiceRule(editing.id, {
        name: draft.name,
        milestone: draft.milestone,
        from_org_type: draft.from_org_type,
        to_org_type: draft.to_org_type,
        line_items: items as unknown as Record<string, unknown>[],
        active: draft.active,
      })
      setSaving(false)
      if (result) {
        setEditing(null)
        flash('Rule updated')
        load()
      } else {
        flash('Update failed')
      }
    } else {
      const result = await addInvoiceRule({
        name: draft.name,
        milestone: draft.milestone,
        from_org_type: draft.from_org_type,
        to_org_type: draft.to_org_type,
        line_items: items as unknown as Record<string, unknown>[],
        active: draft.active,
      })
      setSaving(false)
      if (result) {
        setShowNew(false)
        setDraft({ ...EMPTY_DRAFT })
        flash('Rule created')
        load()
      } else {
        flash('Create failed')
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this invoice rule? This cannot be undone.')) return
    const ok = await deleteInvoiceRule(id)
    if (ok) {
      flash('Rule deleted')
      load()
    } else {
      flash('Delete failed')
    }
  }

  async function handleToggleActive(rule: InvoiceRule) {
    const result = await updateInvoiceRule(rule.id, { active: !rule.active })
    if (result) {
      flash(result.active ? 'Rule activated' : 'Rule deactivated')
      load()
    }
  }

  // Line item helpers
  function addLineItemRow() {
    setDraft(prev => ({ ...prev, line_items: [...prev.line_items, { description: '', category: '' }] }))
  }

  function removeLineItemRow(index: number) {
    setDraft(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== index) }))
  }

  function updateLineItemField(index: number, field: keyof LineItemTemplate, value: string | number | undefined) {
    setDraft(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }))
  }

  // Shared form for add/edit
  function renderForm() {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Rule Name *</label>
          <input
            value={draft.name}
            onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Engineering Design Services"
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">From Org Type *</label>
            <select
              value={draft.from_org_type}
              onChange={e => setDraft(prev => ({ ...prev, from_org_type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white"
            >
              <option value="">-- Select --</option>
              {ORG_TYPES.map(t => <option key={t} value={t}>{ORG_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">To Org Type *</label>
            <select
              value={draft.to_org_type}
              onChange={e => setDraft(prev => ({ ...prev, to_org_type: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white"
            >
              <option value="">-- Select --</option>
              {ORG_TYPES.map(t => <option key={t} value={t}>{ORG_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Milestone *</label>
            <select
              value={draft.milestone}
              onChange={e => setDraft(prev => ({ ...prev, milestone: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white"
            >
              <option value="">-- Select --</option>
              {MILESTONES.map(m => <option key={m} value={m}>{MILESTONE_LABELS[m] ?? m}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Active</label>
          <button
            type="button"
            onClick={() => setDraft(prev => ({ ...prev, active: !prev.active }))}
            className={`relative w-8 h-4 rounded-full transition-colors ${draft.active ? 'bg-green-600' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${draft.active ? 'left-4' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Line Items Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">Line Item Templates</label>
            <button onClick={addLineItemRow} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          <div className="space-y-2">
            {draft.line_items.map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={item.description}
                    onChange={e => updateLineItemField(i, 'description', e.target.value)}
                    placeholder="Description *"
                    className="flex-1 bg-gray-700 text-white border border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-green-500"
                  />
                  {draft.line_items.length > 1 && (
                    <button onClick={() => removeLineItemRow(i)} className="text-gray-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Category</label>
                    <input
                      value={item.category ?? ''}
                      onChange={e => updateLineItemField(i, 'category', e.target.value)}
                      placeholder="e.g. equipment"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Default Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity ?? ''}
                      onChange={e => updateLineItemField(i, 'quantity', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="—"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Default Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price ?? ''}
                      onChange={e => updateLineItemField(i, 'unit_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="—"
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {toast && <div className="fixed bottom-5 right-5 bg-green-700 text-white text-xs px-4 py-2 rounded-md shadow-lg z-[200]">{toast}</div>}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Invoice Rules</h2>
          <p className="text-xs text-gray-500 mt-0.5">{rules.length} billing relationship templates</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64"><SearchBar value={search} onChange={setSearch} placeholder="Search rules..." /></div>
          <button onClick={openNew} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-500">Total Rules</div>
          <div className="text-lg font-bold text-white">{rules.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-500">Active</div>
          <div className="text-lg font-bold text-green-400">{rules.filter(r => r.active).length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-500">Inactive</div>
          <div className="text-lg font-bold text-gray-400">{rules.filter(r => !r.active).length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="text-xs text-gray-500">Milestones</div>
          <div className="text-lg font-bold text-blue-400">{new Set(rules.map(r => r.milestone)).size}</div>
        </div>
      </div>

      {/* Rules table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr className="border-b border-gray-800">
              <th className="px-3 py-2 text-left text-gray-500 font-medium">Name</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">From</th>
              <th className="px-3 py-2 text-center text-gray-500 font-medium"></th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">To</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">Milestone</th>
              <th className="px-3 py-2 text-center text-gray-500 font-medium">Items</th>
              <th className="px-3 py-2 text-center text-gray-500 font-medium">Status</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(rule => {
              const items = rule.line_items as unknown as LineItemTemplate[]
              const isExpanded = expandedId === rule.id
              return (
                <tr key={rule.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                      className="flex items-center gap-1 text-white hover:text-green-400 font-medium text-left"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
                      {rule.name}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 ml-4 space-y-1">
                        {items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span className="text-gray-600">{i + 1}.</span>
                            <span>{item.description}</span>
                            {item.category && <span className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-500">{item.category}</span>}
                            {item.unit_price != null && item.unit_price > 0 && (
                              <span className="text-green-400">${item.unit_price.toLocaleString()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-300">{ORG_TYPE_LABELS[rule.from_org_type] ?? rule.from_org_type}</td>
                  <td className="px-3 py-2 text-center text-gray-600">→</td>
                  <td className="px-3 py-2 text-gray-300">{ORG_TYPE_LABELS[rule.to_org_type] ?? rule.to_org_type}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded text-[10px]">
                      {MILESTONE_LABELS[rule.milestone] ?? rule.milestone}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-400">{items.length}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => handleToggleActive(rule)}>
                      <Badge active={rule.active} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(rule)} className="p-1 text-gray-500 hover:text-blue-400" title="Edit">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => handleDelete(rule.id)} className="p-1 text-gray-500 hover:text-red-400" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                  {search ? 'No rules match your search' : 'No invoice rules configured'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <Modal title={`Edit Rule: ${editing.name}`} onClose={() => setEditing(null)}>
          {renderForm()}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
            <SaveBtn onClick={handleSave} saving={saving} />
          </div>
        </Modal>
      )}

      {/* New Modal */}
      {showNew && (
        <Modal title="New Invoice Rule" onClose={() => setShowNew(false)}>
          {renderForm()}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
            <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
            <SaveBtn onClick={handleSave} saving={saving} />
          </div>
        </Modal>
      )}
    </div>
  )
}
