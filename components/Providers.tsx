'use client'

import { OrgProvider } from '@/lib/hooks/useOrg'
import { ErrorToastProvider } from '@/components/ErrorToastProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorToastProvider>
      <OrgProvider>
        {children}
      </OrgProvider>
    </ErrorToastProvider>
  )
}
