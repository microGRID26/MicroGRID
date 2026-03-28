'use client'

import { OrgProvider } from '@/lib/hooks/useOrg'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      {children}
    </OrgProvider>
  )
}
