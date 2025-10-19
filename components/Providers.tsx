'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { InvestmentProvider } from '@/contexts/InvestmentContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <InvestmentProvider>{children}</InvestmentProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
