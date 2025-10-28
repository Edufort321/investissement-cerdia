'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

function ConnexionForm() {
  const { login, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    const result = await login(email, password)

    if (!result.success) {
      setError(result.error || 'Erreur de connexion')
    } else {
      // Stocker la durée de session selon "Se souvenir de moi"
      const sessionDuration = rememberMe ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000 // 24h ou 2h
      const expiresAt = Date.now() + sessionDuration
      localStorage.setItem('cerdia_session_expires', expiresAt.toString())
      localStorage.setItem('cerdia_remember_me', rememberMe.toString())

      // Rediriger vers l'URL demandée ou le dashboard par défaut
      router.push(redirectUrl)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black pt-20">
      {/* Arrière-plan noir simple */}
      <div className="absolute inset-0 bg-black"></div>

      {/* Conteneur principal */}
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Carte de login */}
        <div className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-300">
          {/* Header - Même couleur que le navbar principal */}
          <div className="flex items-center justify-between p-6 bg-[#c7c7c7]">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <Image
                  src="/logo-cerdia3.png"
                  alt="CERDIA"
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black">Connexion CERDIA</h2>
                <p className="text-sm text-gray-700">Espace Investisseurs</p>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email - ⚠️ SÉCURITÉ: Pas d'autocomplete pour éviter énumération users */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  autoFocus
                  autoComplete="email"
                  required
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Lock size={16} className="inline mr-2" />
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Checkbox Se souvenir de moi */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#5e5e5e] bg-white border-gray-300 rounded focus:ring-[#5e5e5e] focus:ring-2"
                />
                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Se souvenir de moi pendant 24 heures
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(sinon 2h)</span>
                </label>
              </div>

              {/* Bouton de connexion - Même style que le header */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full py-3 px-4 bg-[#5e5e5e] hover:bg-[#3e3e3e] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors text-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <LogIn size={20} />
                  </>
                )}
              </button>

              {/* Lien mot de passe oublié */}
              <div className="text-center">
                <a
                  href="/reset-password"
                  className="text-sm text-[#5e5e5e] hover:text-[#3e3e3e] hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </a>
              </div>
            </form>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
              Investissement CERDIA • {new Date().getFullYear()} • Authentification sécurisée Supabase
            </div>
          </div>
        </div>

        {/* Lien retour vers l'accueil */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-white hover:text-gray-300 transition-colors font-medium"
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black pt-20">
        <div className="text-white">Chargement...</div>
      </div>
    }>
      <ConnexionForm />
    </Suspense>
  )
}
