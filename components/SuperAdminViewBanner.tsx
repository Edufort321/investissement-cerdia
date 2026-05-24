'use client'

/**
 * Bandeau "Mode support" affiche en haut de la page quand un super_admin
 * est en train de voir la plateforme comme une autre organisation (override
 * actif). Cliquer "Quitter le mode support" restaure la vraie organisation.
 *
 * Toujours rendu globalement (root layout) — invisible si pas en mode override.
 */

import { useOrganization } from '@/contexts/OrganizationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Shield, X } from 'lucide-react'

export default function SuperAdminViewBanner() {
  const { isViewingAsOther, organization, realOrganization, clearOverride } = useOrganization()
  const { language } = useLanguage()
  const fr = language === 'fr'

  if (!isViewingAsOther || !organization || !realOrganization) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white shadow-md">
      <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Shield size={16} className="flex-shrink-0" />
          <span className="font-semibold whitespace-nowrap">
            {fr ? 'Mode support actif' : 'Support mode active'}
          </span>
          <span className="opacity-90 truncate hidden sm:inline">
            {fr
              ? <>— Tu regardes <strong>{organization.name}</strong> (vraie org : {realOrganization.name})</>
              : <>— Viewing <strong>{organization.name}</strong> (real org: {realOrganization.name})</>}
          </span>
        </div>
        <button
          onClick={clearOverride}
          className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-800 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0"
        >
          <X size={12} />
          {fr ? 'Quitter' : 'Exit'}
        </button>
      </div>
    </div>
  )
}
