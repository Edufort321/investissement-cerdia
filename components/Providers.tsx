'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { InvestmentProvider } from '@/contexts/InvestmentContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ExchangeRateProvider } from '@/contexts/ExchangeRateContext'
import { CommerceRoleGuard } from '@/components/CommerceRoleGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ExchangeRateProvider>
          <AuthProvider>
            <OrganizationProvider>
              <InvestmentProvider><CommerceRoleGuard>{children}</CommerceRoleGuard></InvestmentProvider>
            </OrganizationProvider>
          </AuthProvider>
        </ExchangeRateProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
