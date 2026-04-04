import React, { useState, useMemo, useEffect } from 'react'
import {
  loadRepDocuments, updateOnboardingDocStatus, updateDocFileUrl, updateSalesRep,
  DOC_STATUS_LABELS, DOC_STATUS_BADGE,
} from '@/lib/api'
import type { SalesTeam, SalesRep, OnboardingRequirement, OnboardingDocument, OnboardingDocStatus } from '@/lib/api'
import { fmtDate } from '@/lib/utils'
import { ChevronDown, ChevronUp, X, Pencil, CheckCircle, Mail } from 'lucide-react'

export function OnboardingTab({ reps, teams, requirements, onRefresh }: {
  reps: SalesRep[]
  teams: SalesTeam[]
  requirements: OnboardingRequirement[]
  onRefresh: () => void
}) {
  const [repDocsMap, setRepDocsMap] = useState<Map<string, OnboardingDocument[]>>(new Map())
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null)
  const [urlDraft, setUrlDraft] = useState('')

  const onboardingReps = useMemo(() => reps.filter(r => r.status === 'onboarding'), [reps])
  const teamMap = useMemo(() => {
    const m = new Map<string, SalesTeam>()
    teams.forEach(t => m.set(t.id, t))
    return m
  }, [teams])

  const repIdKey = onboardingReps.map(r => r.id).join(',')
  useEffect(() => {
    async function load() {
      setLoadingDocs(true)
      const map = new Map<string, OnboardingDocument[]>()
      for (const rep of onboardingReps) {
        const docs = await loadRepDocuments(rep.id)
        map.set(rep.id, docs)
      }
      setRepDocsMap(map)
      setLoadingDocs(false)
    }
    if (onboardingReps.length > 0) load()
    else setLoadingDocs(false)
  }, [repIdKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (docId: string, status: OnboardingDocStatus) => {
    setActionInProgress(docId)
    await updateOnboardingDocStatus(docId, status)
    for (const rep of onboardingReps) {
      const docs = repDocsMap.get(rep.id)
      if (docs?.find(d => d.id === docId)) {
        const refreshed = await loadRepDocuments(rep.id)
        setRepDocsMap(prev => new Map(prev).set(rep.id, refreshed))
        break
      }
    }
    setActionInProgress(null)
  }

  const handleSaveUrl = async (docId: string) => {
    setActionInProgress(docId)
    await updateDocFileUrl(docId, urlDraft.trim() || null)
    for (const rep of onboardingReps) {
      const docs = repDocsMap.get(rep.id)
      if (docs?.find(d => d.id === docId)) {
        const refreshed = await loadRepDocuments(rep.id)
        setRepDocsMap(prev => new Map(prev).set(rep.id, refreshed))
        break
      }
    }
    setEditingUrlId(null)
    setUrlDraft('')
    setActionInProgress(null)
  }

  const activateRep = async (repId: string) => {
    if (!confirm('Activate this rep? They will be moved to Active status.')) return
    await updateSalesRep(repId, { status: 'active' })
    onRefresh()
  }

  const requiredReqs = requirements.filter(r => r.active && r.required)

  if (onboardingReps.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-1">No reps currently onboarding</h3>
        <p className="text-xs text-gray-500">All sales reps are either active or inactive.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        {onboardingReps.length} rep{onboardingReps.length !== 1 ? 's' : ''} currently in onboarding.
        {requiredReqs.length > 0 && ` Each must complete ${requiredReqs.length} required document${requiredReqs.length !== 1 ? 's' : ''}.`}
      </p>

      {onboardingReps.map(rep => {
        const docs = repDocsMap.get(rep.id) ?? []
        const team = rep.team_id ? teamMap.get(rep.team_id) : null
        const requiredDocs = docs.filter(d => requiredReqs.some(r => r.id === d.requirement_id))
        const allVerified = requiredDocs.length > 0 && requiredDocs.every(d => d.status === 'verified')
        const verifiedCount = requiredDocs.filter(d => d.status === 'verified').length
        const isExpanded = expandedId === rep.id

        return (
          <div key={rep.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : rep.id)}
              className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-750 transition-colors"
            >
              <div>
                <h3 className="text-sm font-semibold text-white">{rep.first_name} {rep.last_name}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-gray-400">{rep.email}</span>
                  {team && <span className="text-[10px] text-gray-500">{team.name}</span>}
                  {rep.hire_date && <span className="text-[10px] text-gray-500">Hired {fmtDate(rep.hire_date)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${allVerified ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${requiredReqs.length > 0 ? (verifiedCount / requiredReqs.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{verifiedCount}/{requiredReqs.length}</span>
                </div>
                {allVerified && (
                  <button
                    onClick={(e) => { e.stopPropagation(); activateRep(rep.id) }}
                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] font-medium rounded transition-colors"
                  >
                    Ready to Activate
                  </button>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-700 px-5 py-4">
                {loadingDocs ? (
                  <p className="text-xs text-gray-500">Loading documents...</p>
                ) : docs.length === 0 ? (
                  <p className="text-xs text-gray-500">No documents initialized. Re-save the rep to create them.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => {
                      const req = requirements.find(r => r.id === doc.requirement_id)
                      const isRequired = req?.required ?? false
                      return (
                        <div key={doc.id} className="py-2 px-3 bg-gray-900/50 rounded-lg group/doc space-y-1">
                          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${DOC_STATUS_BADGE[doc.status]}`}>
                              {DOC_STATUS_LABELS[doc.status]}
                            </span>
                            <span className="text-xs text-white">{req?.name ?? 'Unknown'}</span>
                            {isRequired && <span className="text-[10px] text-red-400">*</span>}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="hidden group-hover/doc:flex items-center gap-2 text-[10px] text-gray-500">
                              {doc.sent_at && <span>Sent {fmtDate(doc.sent_at)}</span>}
                              {doc.viewed_at && <span>Viewed {fmtDate(doc.viewed_at)}</span>}
                              {doc.signed_at && <span>Signed {fmtDate(doc.signed_at)}</span>}
                              {doc.verified_at && <span>Verified {fmtDate(doc.verified_at)}</span>}
                            </div>

                            {doc.status !== 'verified' && doc.status !== 'rejected' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleStatusChange(doc.id, 'verified')}
                                  disabled={actionInProgress === doc.id}
                                  className="px-2 py-0.5 bg-green-700/50 hover:bg-green-700 text-green-300 text-[10px] rounded transition-colors disabled:opacity-50"
                                  title="Mark as Verified"
                                >
                                  <CheckCircle className="w-3 h-3 inline" /> Verify
                                </button>
                                <button
                                  onClick={() => handleStatusChange(doc.id, 'rejected')}
                                  disabled={actionInProgress === doc.id}
                                  className="px-2 py-0.5 bg-red-700/50 hover:bg-red-700 text-red-300 text-[10px] rounded transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <X className="w-3 h-3 inline" /> Reject
                                </button>
                                {doc.status === 'pending' && (
                                  <button
                                    onClick={() => handleStatusChange(doc.id, 'sent')}
                                    disabled={actionInProgress === doc.id}
                                    className="px-2 py-0.5 bg-blue-700/50 hover:bg-blue-700 text-blue-300 text-[10px] rounded transition-colors disabled:opacity-50"
                                    title="Send Reminder"
                                  >
                                    <Mail className="w-3 h-3 inline" /> Send
                                  </button>
                                )}
                              </div>
                            )}
                            {doc.status === 'verified' && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            {doc.status === 'rejected' && (
                              <button
                                onClick={() => handleStatusChange(doc.id, 'pending')}
                                className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] rounded"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                          </div>
                          <div className="flex items-center gap-2 pl-8">
                            {editingUrlId === doc.id ? (
                              <div className="flex items-center gap-1 flex-1">
                                <input
                                  type="url"
                                  value={urlDraft}
                                  onChange={e => setUrlDraft(e.target.value)}
                                  placeholder="https://drive.google.com/..."
                                  className="flex-1 bg-gray-800 border border-gray-600 text-xs text-white px-2 py-0.5 rounded focus:border-green-500 outline-none"
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveUrl(doc.id); if (e.key === 'Escape') setEditingUrlId(null) }}
                                  autoFocus
                                />
                                <button onClick={() => handleSaveUrl(doc.id)} className="text-[10px] text-green-400 hover:text-green-300">Save</button>
                                <button onClick={() => setEditingUrlId(null)} className="text-[10px] text-gray-500 hover:text-gray-400">Cancel</button>
                              </div>
                            ) : doc.file_url ? (
                              <div className="flex items-center gap-2">
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 truncate max-w-[200px]">
                                  {doc.file_url.replace(/^https?:\/\//, '').slice(0, 40)}...
                                </a>
                                <button onClick={() => { setEditingUrlId(doc.id); setUrlDraft(doc.file_url ?? '') }} className="text-[10px] text-gray-500 hover:text-gray-400">
                                  <Pencil className="w-2.5 h-2.5 inline" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingUrlId(doc.id); setUrlDraft('') }}
                                className="text-[10px] text-gray-500 hover:text-gray-400"
                              >
                                + Add file link
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
