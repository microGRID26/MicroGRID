'use client'

import { useCustomerAuth } from '@/lib/hooks/useCustomerAuth'
import { LogOut, Phone, Mail, MapPin, Shield } from 'lucide-react'

export default function PortalAccount() {
  const { account, project, loading, signOut } = useCustomerAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--portal-border)', borderTopColor: 'var(--portal-accent)' }} />
      </div>
    )
  }

  if (!account) return null

  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-8">
      <h1 className="text-xl font-bold" style={{ color: 'var(--portal-text)' }}>Account</h1>

      {/* Profile */}
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: 'var(--portal-accent-light)', color: 'var(--portal-accent)' }}>
            {account.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-base font-semibold" style={{ color: 'var(--portal-text)' }}>{account.name}</div>
            <div className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>{account.email}</div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="rounded-2xl p-5 border space-y-3" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--portal-text-muted)' }}>Contact</div>

        {account.phone && (
          <a href={`tel:${account.phone}`} className="flex items-center gap-3 py-2 active:opacity-70">
            <Phone className="w-4 h-4" style={{ color: 'var(--portal-accent)' }} />
            <span className="text-sm" style={{ color: 'var(--portal-text)' }}>{account.phone}</span>
          </a>
        )}

        <div className="flex items-center gap-3 py-2">
          <Mail className="w-4 h-4" style={{ color: 'var(--portal-accent)' }} />
          <span className="text-sm" style={{ color: 'var(--portal-text)' }}>{account.email}</span>
        </div>

        {project?.address && (
          <div className="flex items-center gap-3 py-2">
            <MapPin className="w-4 h-4" style={{ color: 'var(--portal-accent)' }} />
            <span className="text-sm" style={{ color: 'var(--portal-text)' }}>
              {project.address}{project.city ? `, ${project.city}` : ''} {project.zip ?? ''}
            </span>
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="rounded-2xl p-5 border space-y-2" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
        <div className="text-xs font-semibold uppercase" style={{ color: 'var(--portal-text-muted)' }}>Project</div>
        <div className="flex justify-between py-1">
          <span className="text-sm" style={{ color: 'var(--portal-text-secondary)' }}>Project ID</span>
          <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{account.project_id}</span>
        </div>
        {project?.financier && (
          <div className="flex justify-between py-1">
            <span className="text-sm" style={{ color: 'var(--portal-text-secondary)' }}>Financing</span>
            <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{project.financier}</span>
          </div>
        )}
        {project?.systemkw && (
          <div className="flex justify-between py-1">
            <span className="text-sm" style={{ color: 'var(--portal-text-secondary)' }}>System Size</span>
            <span className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{project.systemkw} kW</span>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4" style={{ color: 'var(--portal-accent)' }} />
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--portal-text-muted)' }}>Security</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--portal-text-muted)' }}>
          Signed in via secure email link. Your data is encrypted and protected.
        </p>
        {account.last_login_at && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--portal-text-muted)' }}>
            Last login: {new Date(account.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Sign Out */}
      <button onClick={signOut}
        className="w-full rounded-2xl p-4 border flex items-center justify-center gap-2 transition-colors active:opacity-70"
        style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
        <LogOut className="w-4 h-4" style={{ color: 'var(--portal-error)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--portal-error)' }}>Sign Out</span>
      </button>

      {/* Branding */}
      <div className="text-center pt-4">
        <p className="text-xs font-medium" style={{ color: 'var(--portal-text-muted)' }}>MicroGRID</p>
        <p className="text-[10px]" style={{ color: 'var(--portal-text-muted)' }}>powered by EDGE</p>
        <p className="text-[9px] mt-1" style={{ color: 'var(--portal-text-muted)' }}>
          Dependable Power. Predictable Cost.
        </p>
      </div>
    </div>
  )
}
