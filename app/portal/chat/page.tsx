'use client'

import { useState, useRef, useEffect } from 'react'
import { useCustomerAuth } from '@/lib/hooks/useCustomerAuth'
import { Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'What stage is my project in?',
  'When is my installation scheduled?',
  'What equipment is being installed?',
  'How does battery backup work?',
  'What happens after installation?',
  'Tell me about the 60-day guarantee',
]

export default function PortalChat() {
  const { account, loading: authLoading } = useCustomerAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/portal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment, or use the Support tab to create a ticket.',
      }])
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--portal-border)', borderTopColor: 'var(--portal-accent)' }} />
      </div>
    )
  }

  const firstName = account?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="flex flex-col h-[calc(100dvh-env(safe-area-inset-top)-52px-52px)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          /* Welcome state */
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--portal-accent-light)' }}>
              <Sparkles className="w-7 h-7" style={{ color: 'var(--portal-accent)' }} />
            </div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--portal-text)' }}>
              Hi {firstName}, I&apos;m Atlas
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--portal-text-muted)' }}>
              Your energy assistant. Ask me anything about your project.
            </p>

            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-2 rounded-xl text-xs font-medium border transition-colors active:opacity-70"
                  style={{
                    backgroundColor: 'var(--portal-surface)',
                    borderColor: 'var(--portal-border)',
                    color: 'var(--portal-text-secondary)',
                  }}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message thread */
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--portal-accent)' : 'var(--portal-surface)',
                    color: msg.role === 'user' ? 'var(--portal-accent-text)' : 'var(--portal-text)',
                    border: msg.role === 'assistant' ? '1px solid var(--portal-border-light)' : 'none',
                  }}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3" style={{ color: 'var(--portal-accent)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--portal-accent)' }}>Atlas</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-4 py-3 border"
                  style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--portal-accent)' }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--portal-accent)' }}>Atlas</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--portal-text-muted)', animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--portal-text-muted)', animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--portal-text-muted)', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t px-4 py-3" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Atlas anything..."
            className="flex-1 rounded-xl px-4 py-3 text-base border outline-none"
            style={{
              backgroundColor: 'var(--portal-bg)',
              borderColor: 'var(--portal-border)',
              color: 'var(--portal-text)',
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            disabled={sending}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="rounded-xl px-4 py-3 transition-opacity disabled:opacity-30"
            style={{ backgroundColor: 'var(--portal-accent)', color: 'var(--portal-accent-text)' }}>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
