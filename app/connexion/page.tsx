'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import Image from 'next/image'

function ConnexionForm() {
  const { login } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'
  const fr = language === 'fr'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError(fr ? 'Veuillez remplir tous les champs.' : 'Please fill in all fields.')
      return
    }
    setSubmitting(true)
    try {
      const result = await login(email, password)
      if (!result.success) {
        setError(result.error || (fr ? 'Identifiants incorrects.' : 'Invalid credentials.'))
        return
      }
      const sessionDuration = rememberMe ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000
      localStorage.setItem('cerdia_session_expires', (Date.now() + sessionDuration).toString())
      localStorage.setItem('cerdia_remember_me', rememberMe.toString())
      router.push(redirectUrl)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0c0e] pt-16 px-4">

      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-400/3 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <Image src="/logo-cerdia3.png" alt="CERDIA" width={36} height={36} className="rounded-lg" />
          <span className="text-white font-semibold tracking-wide">CERDIA</span>
        </div>

        {/* Card */}
        <div className="bg-[#111115] border border-white/8 rounded-2xl p-8">

          <div className="mb-7">
            <h2 className="text-xl font-bold text-white font-serif mb-1">
              {fr ? 'Connexion' : 'Sign in'}
            </h2>
            <p className="text-gray-500 text-sm">
              {fr ? 'Accédez à votre espace investisseur.' : 'Access your investor workspace.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                {fr ? 'Courriel' : 'Email'}
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#0c0c0e] border border-white/10 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-amber-400/50 text-sm transition-colors"
                  autoFocus
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                {fr ? 'Mot de passe' : 'Password'}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-[#0c0c0e] border border-white/10 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-amber-400/50 text-sm transition-colors"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-amber-400" />
                <span className="text-gray-500 text-xs">{fr ? 'Se souvenir 24h' : 'Remember 24h'}</span>
              </label>
              <a href="/reset-password" className="text-gray-600 hover:text-amber-400 text-xs transition-colors">
                {fr ? 'Mot de passe oublié ?' : 'Forgot password?'}
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-full text-sm tracking-wide transition-all flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={15} />
                  {fr ? 'Se connecter' : 'Sign in'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/demo" className="text-gray-600 hover:text-amber-400 text-xs transition-colors">
              {fr ? 'Accès démo sans compte →' : 'Demo access without account →'}
            </a>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-gray-700 hover:text-gray-400 text-xs transition-colors">
            ← {fr ? "Retour à l'accueil" : 'Back to home'}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0c0c0e]">
        <div className="text-gray-600 text-sm">Chargement...</div>
      </div>
    }>
      <ConnexionForm />
    </Suspense>
  )
}
