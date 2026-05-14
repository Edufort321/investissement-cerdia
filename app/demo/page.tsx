'use client'

/**
 * Page DEMO — Phase 5
 *
 * Si pas de session active : auto-login en tant que demo@cerdia.ai →
 *   redirect /dashboard.
 * Si session active (Eric, ou autre user) : NE TOUCHE PAS à la session.
 *   Affiche un prompt pour démarrer le mode démo (qui déconnectera) ou
 *   continuer avec la session actuelle.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Sparkles, AlertCircle, LogIn, ArrowRight, Edit2 } from 'lucide-react'

const DEMO_EMAIL    = 'demo@cerdia.ai'
const DEMO_PASSWORD = 'Demo2026!CERDIA'
const DEMO_ORG_ID   = 'd0000000-0000-0000-0000-000000000001'

type Phase = 'checking' | 'auto_login' | 'ask_confirm' | 'logging_in' | 'error'

export default function DemoPage() {
  const router = useRouter()
  const { isSuperAdmin, switchOrg } = useOrganization()
  const { language } = useLanguage()
  const fr = language === 'fr'
  const [phase, setPhase] = useState<Phase>('checking')
  const [status, setStatus] = useState(fr ? 'Préparation de la démo…' : 'Preparing demo…')
  const [err, setErr] = useState('')
  const [existingEmail, setExistingEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user) {
        if (session.user.email?.toLowerCase() === DEMO_EMAIL.toLowerCase()) {
          // Déjà connecté en demo → direct au dashboard
          router.push('/dashboard')
          return
        }
        // Autre session (Eric, etc.) → on ne touche pas, on demande
        setExistingEmail(session.user.email || null)
        setPhase('ask_confirm')
        return
      }
      // Pas de session → auto-login démo
      setPhase('auto_login')
      void doDemoLogin()
    })()
    return () => { cancelled = true }
  }, [router])

  const doDemoLogin = async () => {
    setPhase('logging_in')
    setStatus(fr ? 'Connexion au mode démo…' : 'Logging into demo mode…')
    try {
      await supabase.auth.signOut()
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      })
      if (error) {
        setErr((fr ? 'Erreur de connexion démo : ' : 'Demo login error: ') + error.message)
        setPhase('error')
        return
      }
      try {
        localStorage.setItem('cerdia_session_expires', String(Date.now() + 2 * 60 * 60 * 1000))
      } catch {}
      setStatus(fr ? 'Redirection vers la plateforme…' : 'Redirecting to the platform…')
      router.push('/dashboard')
    } catch (e: any) {
      setErr((fr ? 'Erreur : ' : 'Error: ') + (e.message || String(e)))
      setPhase('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 pt-20">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-4">
          <Sparkles size={28} className="text-purple-600 dark:text-purple-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {fr ? 'Mode Démo CERDIA' : 'CERDIA Demo Mode'}
        </h1>

        {phase === 'ask_confirm' && (
          <div className="mt-5 text-left">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm mb-4">
              <p className="font-semibold mb-1">⚠️ {fr ? 'Tu es déjà connecté' : 'You are already logged in'}</p>
              <p className="text-xs">
                {fr ? 'Tu es actuellement connecté en tant que ' : 'You are currently logged in as '}<strong>{existingEmail}</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {isSuperAdmin && (
                <button
                  onClick={async () => {
                    await switchOrg(DEMO_ORG_ID)
                    router.push('/dashboard')
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium"
                >
                  <Edit2 size={14} /> {fr ? 'Éditer le démo en super_admin' : 'Edit demo as super_admin'}
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-xl text-sm font-medium"
              >
                <ArrowRight size={14} /> {fr ? 'Retourner à mon dashboard' : 'Back to my dashboard'}
              </button>
              <button
                onClick={doDemoLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium"
              >
                <LogIn size={14} /> {fr ? 'Voir comme visiteur (lecture seule, déconnexion)' : 'View as visitor (read-only, logs out)'}
              </button>
              <Link href="/" className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 text-sm">
                {fr ? '← Retour à l\'accueil' : '← Back to home'}
              </Link>
            </div>
          </div>
        )}

        {(phase === 'checking' || phase === 'auto_login' || phase === 'logging_in') && (
          <>
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto my-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">{status}</p>
          </>
        )}

        {phase === 'error' && (
          <div className="mt-5">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2 mb-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-semibold">{fr ? 'Impossible de charger la démo' : 'Unable to load the demo'}</p>
                <p className="text-xs mt-1">{err}</p>
              </div>
            </div>
            <Link href="/" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              {fr ? 'Retour à l\'accueil' : 'Back to home'}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
