'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

interface InvestorSuggestion {
  email: string
  fullName: string
  username: string
}

export default function ConnexionPage() {
  const { login, loading } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [investors, setInvestors] = useState<InvestorSuggestion[]>([])

  // Charger la liste des investisseurs au montage
  useEffect(() => {
    async function loadInvestors() {
      try {
        const { data, error } = await supabase
          .from('investors')
          .select('email, first_name, last_name, username')
          .eq('status', 'actif')

        if (error) {
          console.error('Error loading investors:', error)
          return
        }

        if (data) {
          const suggestions: InvestorSuggestion[] = data.map((inv: any) => ({
            email: inv.email,
            fullName: `${inv.first_name} ${inv.last_name}`,
            username: inv.username,
          }))
          setInvestors(suggestions)
        }
      } catch (error) {
        console.error('Error loading investors:', error)
      }
    }

    loadInvestors()
  }, [])

  // Filtrer les investisseurs en fonction de l'entrée
  const filteredInvestors = investors.filter(
    inv =>
      inv.fullName.toLowerCase().includes(email.toLowerCase()) ||
      inv.username.toLowerCase().includes(email.toLowerCase()) ||
      inv.email.toLowerCase().includes(email.toLowerCase())
  )

  const handleSelectInvestor = (selectedEmail: string, fullName: string) => {
    setEmail(selectedEmail)
    setShowSuggestions(false)
  }

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
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black pt-16">
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
              {/* Email avec autocomplétion par nom */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email ou Nom
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Commencez à taper votre nom ou email..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent text-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  autoFocus
                  autoComplete="off"
                  required
                />
                {/* Liste déroulante d'autocomplétion */}
                {showSuggestions && filteredInvestors.length > 0 && email && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredInvestors.map((inv, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectInvestor(inv.email, inv.fullName)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{inv.fullName}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{inv.email}</div>
                      </button>
                    ))}
                  </div>
                )}
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
