'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { InvestmentProvider } from '@/contexts/InvestmentContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <InvestmentProvider>{children}</InvestmentProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
