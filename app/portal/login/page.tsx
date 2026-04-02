'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PortalLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
      },
    })

    setLoading(false)
    if (authError) {
      setError('Unable to send login link. Please try again.')
      console.error('[portal login]', authError)
    } else {
      setSent(true)
    }
  }

  return (
    <div data-theme="portal" className="min-h-dvh flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--portal-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-2xl font-bold mb-4"
            style={{ backgroundColor: 'var(--portal-accent)', color: 'var(--portal-accent-text)' }}>
            M
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>MicroGRID</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--portal-text-muted)' }}>powered by EDGE</p>
        </div>

        {sent ? (
          /* Success state */
          <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--portal-accent-light)' }}>
            <div className="text-4xl mb-3">&#9993;</div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--portal-accent-dark)' }}>Check your email</h2>
            <p className="text-sm" style={{ color: 'var(--portal-text-secondary)' }}>
              We sent a login link to <strong>{email}</strong>. Click the link in your email to sign in.
            </p>
            <button onClick={() => { setSent(false); setEmail('') }}
              className="mt-4 text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
              Use a different email
            </button>
          </div>
        ) : (
          /* Login form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--portal-text-secondary)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className="w-full rounded-xl px-4 py-3.5 text-base border outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--portal-surface)',
                  borderColor: 'var(--portal-border)',
                  color: 'var(--portal-text)',
                }}
              />
            </div>

            {error && (
              <p className="text-sm px-1" style={{ color: 'var(--portal-error)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl px-4 py-3.5 text-base font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--portal-accent)',
                color: 'var(--portal-accent-text)',
              }}>
              {loading ? 'Sending...' : 'Continue with Email'}
            </button>

            <p className="text-center text-xs px-4" style={{ color: 'var(--portal-text-muted)' }}>
              We&apos;ll send you a secure link to sign in. No password needed.
            </p>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-[10px]" style={{ color: 'var(--portal-text-muted)' }}>
            The Future of Residential Energy
          </p>
        </div>
      </div>
    </div>
  )
}
