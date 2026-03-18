import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], preload: false })

export const metadata: Metadata = {
  title: 'MicroGRID CRM',
  description: 'MicroGRID CRM',
}

// ── CONSTRUCTION BANNER ───────────────────────────────────────────────────────
// Set to false when the CRM is ready for full use
const SHOW_BANNER = true

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {SHOW_BANNER && (
          <div className="w-full bg-amber-500 text-amber-950 text-xs font-medium text-center py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-[9999]">
            <span>🚧</span>
            <span>MicroGRID CRM is under active development — features are being added daily. Some things may change.</span>
            <span>🚧</span>
          </div>
        )}
        {children}
      </body>
    </html>
  )
}
