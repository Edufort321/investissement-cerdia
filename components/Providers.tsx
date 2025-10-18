'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { InvestmentProvider } from '@/contexts/InvestmentContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <InvestmentProvider>{children}</InvestmentProvider>
    </AuthProvider>
  )
}
