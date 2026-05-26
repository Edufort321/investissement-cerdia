'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Eye, EyeOff, Mail, Lock, Building2, ArrowRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface OrgResult {
  id: string
  name: string
  slug: string | null
  plan: string | null
  is_demo: boolean | null
}

function ConnexionForm() {
  const { login } = useAuth()
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'
  const fr = language === 'fr'

  // Step 1: org lookup
  const [step, setStep] = useState<1 | 2>(1)
  const [orgInput, setOrgInput] = useState('')
  const [org, setOrg] = useState<OrgResult | null>(null)
  const [orgError, setOrgError] = useState('')
  const [orgLoading, setOrgLoading] = useState(false)

  // Step 2: auth
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [authError, setAuthError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgInput.trim()) return
    setOrgError('')
    setOrgLoading(true)
    try {
      const { data } = await supabase
        .from('organisations')
        .select('id, name, slug, plan, is_demo')
        .or(`name.ilike.%${orgInput.trim()}%,slug.ilike.%${orgInput.trim()}%`)
        .limit(1)
        .maybeSingle()
      if (!data) {
        setOrgError(fr ? 'Organisation introuvable. Vérifiez le nom.' : 'Organization not found. Check the name.')
      } else {
        setOrg(data)
        setStep(2)
      }
    } catch {
      setOrgError(fr ? 'Organisation introuvable. Vérifiez le nom.' : 'Organization not found. Check the name.')
    } finally {
      setOrgLoading(false)
    }
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    if (!email || !password) {
      setAuthError(fr ? 'Veuillez remplir tous les champs' : 'Please fill in all fields')
      return
    }
    setSubmitting(true)
    try {
      const result = await login(email, password)
      if (!result.success) {
        setAuthError(result.error || (fr ? 'Erreur de connexion' : 'Login error'))
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

      <div className="relative w-full max-w-md">

        {/* Logo + marque */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <Image src="/logo-cerdia3.png" alt="CERDIA" width={36} height={36} className="rounded-lg" />
          <span className="text-white font-semibold tracking-wide">CERDIA</span>
        </div>

        {/* Card */}
        <div className="bg-[#111115] border border-white/8 rounded-2xl overflow-hidden">

          {/* Step indicator */}
          <div className="flex border-b border-white/5">
            <div className={`flex-1 py-3 text-center text-xs font-medium tracking-widest uppercase transition-colors ${step === 1 ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-600'}`}>
              {fr ? 'Organisation' : 'Organization'}
            </div>
            <div className={`flex-1 py-3 text-center text-xs font-medium tracking-widest uppercase transition-colors ${step === 2 ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-600'}`}>
              {fr ? 'Authentification' : 'Authentication'}
            </div>
          </div>

          <div className="p-8">

            {/* ── STEP 1 : Nom d'entreprise ───────────────────────────── */}
            {step === 1 && (
              <form onSubmit={handleOrgSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white font-serif mb-1">
                    {fr ? 'Accès à votre espace' : 'Access your workspace'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {fr ? 'Entrez le nom de votre organisation pour continuer.' : 'Enter your organization name to continue.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    {fr ? "Nom de l'organisation" : 'Organization name'}
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="text"
                      value={orgInput}
                      onChange={e => { setOrgInput(e.target.value); setOrgError('') }}
                      placeholder={fr ? 'Ex: Immobilier Dufort Inc.' : 'Ex: Dufort Realty Inc.'}
                      className="w-full pl-10 pr-4 py-3 bg-[#0c0c0e] border border-white/10 rounded-xl text-white placeholder-gray-700 focus:outline-none focus:border-amber-400/50 text-sm transition-colors"
                      autoFocus
                      required
                    />
                  </div>
                  {orgError && <p className="text-red-400 text-xs mt-2">{orgError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={!orgInput.trim() || orgLoading}
                  className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-full text-sm tracking-wide transition-all flex items-center justify-center gap-2"
                >
                  {orgLoading ? (
                    <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      {fr ? 'Continuer' : 'Continue'}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Demo access */}
                <div className="text-center">
                  <a href="/demo" className="text-gray-600 hover:text-amber-400 text-xs transition-colors">
                    {fr ? 'Accès démo sans compte →' : 'Demo access without account →'}
                  </a>
                </div>
              </form>
            )}

            {/* ── STEP 2 : Email + mot de passe ──────────────────────── */}
            {step === 2 && org && (
              <form onSubmit={handleAuthSubmit} className="space-y-6">
                {/* Org badge + back */}
                <div>
                  <button type="button" onClick={() => { setStep(1); setAuthError('') }}
                    className="flex items-center gap-1.5 text-gray-600 hover:text-gray-400 text-xs mb-4 transition-colors">
                    <ChevronLeft size={13} />
                    {fr ? 'Changer d\'organisation' : 'Change organization'}
                  </button>
                  <div className="flex items-center gap-3 p-3 bg-amber-400/5 border border-amber-400/15 rounded-xl mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} className="text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{org.name}</p>
                      {org.is_demo && (
                        <p className="text-amber-400/70 text-[10px] uppercase tracking-widest">Démo</p>
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white font-serif mb-1">
                    {fr ? 'Connectez-vous' : 'Sign in'}
                  </h2>
                  <p className="text-gray-500 text-sm">
                    {fr ? 'Entrez vos identifiants pour accéder à votre espace.' : 'Enter your credentials to access your workspace.'}
                  </p>
                </div>

                {authError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-xs">{authError}</p>
                  </div>
                )}

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

                <div className="flex items-center justify-between">
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
                  className="w-full bg-amber-400 hover:bg-amber-300 disabled:bg-amber-400/30 disabled:cursor-not-allowed text-black font-bold py-3 rounded-full text-sm tracking-wide transition-all flex items-center justify-center gap-2"
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
            )}
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
