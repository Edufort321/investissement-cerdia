'use client'

import React from 'react'
import UsageStatsPanel from '@/components/admin/UsageStatsPanel'
import { Shield } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminPage() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {fr ? 'Administration CERDIA' : 'CERDIA Administration'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fr ? 'Tableau de bord des couts API et pricing' : 'API cost and pricing dashboard'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6">
        <UsageStatsPanel />
      </main>
    </div>
  )
}
