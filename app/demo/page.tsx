'use client'

/**
 * Page DEMO — Phase 5
 *
 * Auto-login en tant que user demo@cerdia.ai (org_admin du tenant DEMO),
 * puis redirect vers /dashboard. Le visiteur voit la VRAIE plateforme
 * investisseur avec les données fictives du tenant DEMO.
 *
 * Les credentials sont public (c'est le but du démo). Anyone peut se
 * logger avec, mais ils ne voient/touchent que le tenant DEMO (RLS
 * tenant_isolation).
 *
 * Pré-requis :
 *   - Migration 158 appliquée (tenant DEMO existe)
 *   - Script setup-demo-user.ts exécuté (user demo@cerdia.ai créé)
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Sparkles, AlertCircle } from 'lucide-react'

const DEMO_EMAIL    = 'demo@cerdia.ai'
const DEMO_PASSWORD = 'Demo2026!CERDIA'

export default function DemoPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Préparation de la démo…')
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 1. Sign out any existing session (sinon collision avec session Eric/autre tenant)
        setStatus('Initialisation…')
        await supabase.auth.signOut()
        if (cancelled) return

        // 2. Sign in en tant que demo user
        setStatus('Connexion au mode démo…')
        const { error } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        })
        if (error) {
          setErr(`Erreur de connexion démo : ${error.message}`)
          return
        }
        if (cancelled) return

        // 3. Redirect vers dashboard — le user demo verra le tenant DEMO via RLS
        setStatus('Redirection vers la plateforme…')
        // localStorage session expiration courte pour la démo (2h)
        try {
          localStorage.setItem('cerdia_session_expires', String(Date.now() + 2 * 60 * 60 * 1000))
        } catch {}
        router.push('/dashboard')
      } catch (e: any) {
        if (!cancelled) setErr(`Erreur : ${e.message || String(e)}`)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 pt-20">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-4">
          <Sparkles size={28} className="text-purple-600 dark:text-purple-300" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Mode Démo CERDIA
        </h1>
        {!err ? (
          <>
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto my-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400">{status}</p>
          </>
        ) : (
          <div className="mt-5">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2 mb-4">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-semibold">Impossible de charger la démo</p>
                <p className="text-xs mt-1">{err}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Le mode démo nécessite que le user <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">demo@cerdia.ai</code> soit créé côté Supabase.
              Eric, exécute : <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">npx tsx scripts/setup-demo-user.ts</code>
            </p>
            <Link href="/" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">
              Retour à l&apos;accueil
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
