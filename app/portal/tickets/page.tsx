'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCustomerAuth } from '@/lib/hooks/useCustomerAuth'
import { loadCustomerTickets, createCustomerTicket, loadTicketComments, addTicketComment } from '@/lib/api/customer-portal'
import type { CustomerTicket, TicketComment } from '@/lib/api/customer-portal'
import { Plus, ChevronDown, ChevronUp, Send, MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  { value: 'service', label: 'Service Issue' },
  { value: 'billing', label: 'Billing Question' },
  { value: 'installation', label: 'Installation Question' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other' },
]

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  open: { label: 'Open', color: 'var(--portal-info)', icon: AlertCircle },
  assigned: { label: 'Assigned', color: 'var(--portal-info)', icon: Clock },
  in_progress: { label: 'In Progress', color: 'var(--portal-warm)', icon: Clock },
  waiting_on_customer: { label: 'Waiting on You', color: 'var(--portal-warm)', icon: AlertCircle },
  waiting_on_vendor: { label: 'In Progress', color: 'var(--portal-warm)', icon: Clock },
  escalated: { label: 'Escalated', color: 'var(--portal-error)', icon: AlertCircle },
  resolved: { label: 'Resolved', color: 'var(--portal-accent)', icon: CheckCircle },
  closed: { label: 'Closed', color: 'var(--portal-text-muted)', icon: CheckCircle },
}

export default function PortalTickets() {
  const { account, project, loading: authLoading } = useCustomerAuth()
  const [tickets, setTickets] = useState<CustomerTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [creating, setCreating] = useState(false)

  // Create form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('service')

  const loadAll = useCallback(async () => {
    if (!project) return
    setLoading(true)
    const tix = await loadCustomerTickets(project.id)
    setTickets(tix)
    setLoading(false)
  }, [project])

  useEffect(() => { loadAll() }, [loadAll])

  const handleCreate = async () => {
    if (!project || !account || !title.trim()) return
    setCreating(true)
    const ticket = await createCustomerTicket(project.id, title.trim(), description.trim(), category, account.name)
    setCreating(false)
    if (ticket) {
      setTickets(prev => [ticket, ...prev])
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setCategory('service')
    }
  }

  const toggleExpand = async (ticketId: string) => {
    if (expandedId === ticketId) {
      setExpandedId(null)
      return
    }
    setExpandedId(ticketId)
    const c = await loadTicketComments(ticketId)
    setComments(c)
  }

  const handleComment = async () => {
    if (!expandedId || !newComment.trim() || !account) return
    await addTicketComment(expandedId, newComment.trim(), account.name)
    setNewComment('')
    const c = await loadTicketComments(expandedId)
    setComments(c)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--portal-border)', borderTopColor: 'var(--portal-accent)' }} />
      </div>
    )
  }

  const openCount = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--portal-text)' }}>Support</h1>
          <p className="text-xs" style={{ color: 'var(--portal-text-muted)' }}>
            {openCount > 0 ? `${openCount} open request${openCount > 1 ? 's' : ''}` : 'No open requests'}
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity active:opacity-80"
          style={{ backgroundColor: 'var(--portal-accent)', color: 'var(--portal-accent-text)' }}>
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl p-5 border space-y-3" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What do you need help with?"
            className="w-full rounded-xl px-4 py-3 text-base border outline-none"
            style={{ backgroundColor: 'var(--portal-bg)', borderColor: 'var(--portal-border)', color: 'var(--portal-text)' }}
            autoFocus
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue (optional)"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm border outline-none resize-none"
            style={{ backgroundColor: 'var(--portal-bg)', borderColor: 'var(--portal-border)', color: 'var(--portal-text)' }}
          />
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
            style={{ backgroundColor: 'var(--portal-bg)', borderColor: 'var(--portal-border)', color: 'var(--portal-text)' }}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium border"
              style={{ borderColor: 'var(--portal-border)', color: 'var(--portal-text-secondary)' }}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={creating || !title.trim()}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'var(--portal-accent)', color: 'var(--portal-accent-text)' }}>
              {creating ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Ticket List */}
      {tickets.length === 0 && !showCreate ? (
        <div className="rounded-2xl p-8 border text-center" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
          <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--portal-border)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>No support requests yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--portal-text-muted)' }}>
            Tap &quot;New Request&quot; if you need help with anything.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => {
            const statusInfo = STATUS_DISPLAY[ticket.status] ?? STATUS_DISPLAY.open
            const isExpanded = expandedId === ticket.id
            const StatusIcon = statusInfo.icon

            return (
              <div key={ticket.id}>
                <button onClick={() => toggleExpand(ticket.id)}
                  className="w-full rounded-2xl p-4 border text-left transition-colors active:opacity-90"
                  style={{ backgroundColor: 'var(--portal-surface)', borderColor: isExpanded ? 'var(--portal-accent)' : 'var(--portal-border-light)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--portal-text)' }}>
                        {ticket.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}>
                          <StatusIcon className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                          {statusInfo.label}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--portal-text-muted)' }}>
                          {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--portal-text-muted)' }} /> : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--portal-text-muted)' }} />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mx-2 rounded-b-2xl border border-t-0 p-4 space-y-3"
                    style={{ backgroundColor: 'var(--portal-surface-alt)', borderColor: 'var(--portal-accent)' }}>
                    {ticket.description && (
                      <p className="text-sm" style={{ color: 'var(--portal-text-secondary)' }}>{ticket.description}</p>
                    )}

                    {/* Comments */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'var(--portal-text-muted)' }}>
                        Conversation
                      </div>
                      {comments.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--portal-text-muted)' }}>No messages yet</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {comments.map(c => (
                            <div key={c.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--portal-surface)' }}>
                              <div className="flex justify-between">
                                <span className="text-[10px] font-medium" style={{ color: 'var(--portal-accent)' }}>{c.author}</span>
                                <span className="text-[10px]" style={{ color: 'var(--portal-text-muted)' }}>
                                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm mt-1" style={{ color: 'var(--portal-text)' }}>{c.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply input */}
                      {!['resolved', 'closed'].includes(ticket.status) && (
                        <div className="flex gap-2 mt-2">
                          <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder="Type a reply..."
                            className="flex-1 rounded-xl px-3 py-2.5 text-sm border outline-none"
                            style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border)', color: 'var(--portal-text)' }}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() } }}
                          />
                          <button onClick={handleComment} disabled={!newComment.trim()}
                            className="rounded-xl px-3 py-2.5 transition-opacity disabled:opacity-30"
                            style={{ backgroundColor: 'var(--portal-accent)', color: 'var(--portal-accent-text)' }}>
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
