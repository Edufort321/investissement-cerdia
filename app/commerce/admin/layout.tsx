'use client'

/**
 * Layout client-side de /commerce/admin
 *
 * Vérifie que l'utilisateur est connecté Supabase ET a un role 'owner' ou 'admin'
 * dans la table profiles (migration 139). Sinon → redirect vers /connexion.
 *
 * Pourquoi client-side et pas server-side ?
 * Le projet utilise un client Supabase standard (lib/supabase.ts) avec session
 * stockée en localStorage. Les cookies de session ne sont donc pas disponibles
 * côté server pour @supabase/auth-helpers-nextjs. Faire le check côté client
 * matche le pattern existant (AuthContext).
 *
 * Sécurité : ce check est cosmétique (un utilisateur malveillant peut le bypasser
 * via DevTools). La vraie protection vient des RLS Supabase sur les tables
 * sensibles (amazon_*, profiles, etc.) qui exigent profiles.role IN ('owner','admin').
 */

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, RefreshCw } from 'lucide-react'

type CheckState = 'checking' | 'allowed' | 'denied'

export default function CommerceAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<CheckState>('checking')

  useEffect(() => {
    let cancelled = false

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (!session?.user) {
        setState('denied')
        router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return

      if (profile && ['owner', 'admin'].includes(profile.role)) {
        setState('allowed')
      } else {
        setState('denied')
        // Ne pas rediriger : afficher un message clair
      }
    }

    check()
    return () => { cancelled = true }
  }, [router, pathname])

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 pt-20">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Vérification de l&apos;accès admin…</p>
        </div>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 pt-20 px-4">
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
