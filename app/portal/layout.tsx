'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './portal.css'
import { Home, MessageSquare, HelpCircle, User } from 'lucide-react'
import { CustomerAuthProvider } from '@/lib/hooks/useCustomerAuth'

const NAV_ITEMS = [
  { href: '/portal/dashboard', label: 'Home', icon: Home },
  { href: '/portal/tickets', label: 'Support', icon: MessageSquare },
  { href: '/portal/chat', label: 'Atlas', icon: HelpCircle },
  { href: '/portal/account', label: 'Account', icon: User },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/portal/login' || pathname?.startsWith('/portal/auth')

  return (
    <div data-theme="portal" className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--portal-bg)', color: 'var(--portal-text)' }}>
      {/* PWA meta tags */}
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MicroGRID" />
        <link rel="apple-touch-icon" href="/portal-icons/icon-192.png" />
        <meta name="theme-color" content="#1D7A5F" />
      </head>

      {/* Status bar spacer for PWA standalone mode */}
      <div className="h-[env(safe-area-inset-top)]" style={{ backgroundColor: 'var(--portal-surface)' }} />

      {/* Header — hidden on login */}
      {!isLoginPage && (
        <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b"
          style={{ backgroundColor: 'var(--portal-surface)', borderColor: 'var(--portal-border-light)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: 'var(--portal-accent)', color: 'var(--portal-accent-text)' }}>
              M
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>MicroGRID</div>
              <div className="text-[9px]" style={{ color: 'var(--portal-text-muted)' }}>powered by EDGE</div>
            </div>
          </div>
        </header>
      )}

      {/* Main content — auth provider wraps all portal pages except login */}
      <main className="flex-1 overflow-y-auto">
        {isLoginPage ? children : <CustomerAuthProvider>{children}</CustomerAuthProvider>}
      </main>

      {/* Bottom navigation — hidden on login */}
      {!isLoginPage && (
        <nav className="sticky bottom-0 z-50 border-t flex"
          style={{
            backgroundColor: 'var(--portal-surface)',
            borderColor: 'var(--portal-border-light)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center py-2 transition-colors min-h-[52px] justify-center"
                style={{ color: active ? 'var(--portal-accent)' : 'var(--portal-text-muted)' }}>
                <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] mt-0.5 ${active ? 'font-semibold' : ''}`}>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
