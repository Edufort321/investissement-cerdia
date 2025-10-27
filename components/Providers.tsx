'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { InvestmentProvider } from '@/contexts/InvestmentContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ExchangeRateProvider } from '@/contexts/ExchangeRateContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ExchangeRateProvider>
          <AuthProvider>
            <InvestmentProvider>{children}</InvestmentProvider>
          </AuthProvider>
        </ExchangeRateProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
