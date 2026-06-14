'use client'

/**
 * Layout client-side de /commerce/admin
 *
 * Utilise le AuthContext existant (memes session/cookies que /dashboard).
 * Une seule connexion Supabase pour toute l'app.
 *
 * Flow :
 *   1. AuthContext encore loading → loader "Vérification..."
 *   2. Pas de supabaseUser (non connecte) → redirect /connexion?redirect=...
 *   3. Connecte mais role insuffisant dans profiles → ecran "Acces refuse"
 *   4. Connecte + role IN (super_admin, org_admin) → render children
 *
 * Securite : le check cote client est cosmetique. La vraie protection
 * vient des RLS Supabase sur les tables sensibles (amazon_*, tenant_isolation)
 * qui exigent profiles.role approprie pour SELECT/INSERT/UPDATE.
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Lock, RefreshCw } from 'lucide-react'

type CheckState = 'checking' | 'allowed' | 'denied' | 'redirecting'

export default function CommerceAdminLayout({ children }: { children: React.ReactNode }) {
  const { supabaseUser, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<CheckState>('checking')

  useEffect(() => {
    let cancelled = false

    async function check() {
      // 1. Attendre que AuthContext finisse son initialisation
      if (loading) return

      // 2. Pas connecté → redirect
      if (!supabaseUser) {
        if (!cancelled) {
          setState('redirecting')
          router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`)
        }
        return
      }

      // 3. Connecté → query profiles.role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', supabaseUser.id)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('[admin layout] profile query error:', error.message)
        setState('denied')
        return
      }

      // Multi-tenant : super_admin (Eric, cross-org) ou org_admin (boss du tenant)
      // Compat : on accepte aussi les anciens noms 'owner'/'admin' au cas où
      // un user n'aurait pas encore été migré (ne devrait pas arriver post-mig 145).
      if (profile && ['super_admin', 'org_admin', 'owner', 'admin', 'org_commerce'].includes(profile.role)) {
        setState('allowed')
      } else {
        setState('denied')
      }
    }

    check()
    return () => { cancelled = true }
  }, [loading, supabaseUser, router, pathname])

  if (state === 'checking' || state === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {state === 'redirecting' ? 'Redirection vers la connexion…' : 'Vérification de l’accès admin…'}
          </p>
        </div>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-red-200 dark:border-red-800">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Accès refusé
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
            Cette zone est réservée aux administrateurs CERDIA. Si tu penses devoir y accéder,
            vérifie ton rôle dans la table <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">profiles</code>.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
