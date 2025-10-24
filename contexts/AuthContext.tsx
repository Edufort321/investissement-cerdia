'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Investor {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  username: string
  action_class: string
  total_shares: number
  share_value: number
  total_invested: number
  current_value: number
  percentage_ownership: number
  investment_type: string
  status: string
  access_level: 'admin' | 'investisseur'
  permissions: {
    dashboard: boolean
    projet: boolean
    administration: boolean
  }
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  role: 'admin' | 'investisseur'
  investorData: Investor | null
}

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkSession: () => Promise<boolean>
  supabaseUser: SupabaseUser | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Charger les données de l'investisseur depuis la table investors
  const loadInvestorData = useCallback(async (userId: string): Promise<Investor | null> => {
    console.log('🔵 [AUTH] Chargement des données investisseur pour userId:', userId)
    try {
      // Timeout de 10 secondes pour éviter les blocages infinis
      let timeoutId: NodeJS.Timeout
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          console.warn('⚠️ [AUTH] Timeout lors du chargement des données investisseur')
          resolve(null)
        }, 10000)
      })

      const dataPromise = supabase
        .from('investors')
        .select('*')
        .eq('user_id', userId)
        .single()

      const result = await Promise.race([dataPromise, timeoutPromise])

      // Annuler le timeout si les données ont été chargées
      clearTimeout(timeoutId!)

      if (!result) {
        console.error('🔴 [AUTH] Timeout - données investisseur non chargées')
        return null
      }

      const { data, error } = result as any

      if (error) {
        console.error('🔴 [AUTH] Erreur lors du chargement des données investisseur:', error)
        return null
      }

      console.log('✅ [AUTH] Données investisseur chargées avec succès')
      return data as Investor
    } catch (error) {
      console.error('🔴 [AUTH] Exception lors du chargement des données investisseur:', error)
      return null
    }
  }, [])

  // Convertir SupabaseUser + Investor en User
  const createUserObject = useCallback(
    (supabaseUser: SupabaseUser, investorData: Investor | null): User => {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        firstName: investorData?.first_name || '',
        lastName: investorData?.last_name || '',
        username: investorData?.username || supabaseUser.email || '',
        role: investorData?.access_level || 'investisseur',
        investorData,
      }
    },
    []
  )

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)

        if (session?.user) {
          setSupabaseUser(session.user)
          const investorData = await loadInvestorData(session.user.id)
          const user = createUserObject(session.user, investorData)
          setCurrentUser(user)
        } else {
          setSupabaseUser(null)
          setCurrentUser(null)
        }

        setLoading(false)
      }
    )

    // Charger la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔵 [AUTH] Session initiale:', session ? 'Connecté' : 'Non connecté')
      if (session?.user) {
        // Vérifier l'expiration de session (24h ou 2h selon "Se souvenir de moi")
        const sessionExpires = localStorage.getItem('cerdia_session_expires')
        if (sessionExpires) {
          const expiresAt = parseInt(sessionExpires, 10)
          const now = Date.now()

          if (now > expiresAt) {
            console.log('⏰ [AUTH] Session expirée, déconnexion automatique')
            supabase.auth.signOut()
            localStorage.removeItem('cerdia_session_expires')
            localStorage.removeItem('cerdia_remember_me')
            setLoading(false)
            return
          }

          const remainingHours = Math.round((expiresAt - now) / (1000 * 60 * 60))
          console.log(`✅ [AUTH] Session valide, expire dans ~${remainingHours}h`)
        }

        setSupabaseUser(session.user)
        loadInvestorData(session.user.id)
          .then(investorData => {
            const user = createUserObject(session.user, investorData)
            setCurrentUser(user)
          })
          .catch(error => {
            console.error('🔴 [AUTH] Erreur lors du chargement initial:', error)
          })
          .finally(() => {
            console.log('✅ [AUTH] Chargement initial terminé')
            setLoading(false)
          })
      } else {
        setLoading(false)
      }
    }).catch(error => {
      console.error('🔴 [AUTH] Erreur getSession:', error)
      setLoading(false)
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [loadInvestorData, createUserObject])

  // Connexion
  const login = useCallback(
    async (email: string, password: string) => {
      console.log('🔵 [AUTH] Login démarré pour:', email)
      setLoading(true)

      try {
        console.log('🔵 [AUTH] Appel à Supabase signInWithPassword...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('🔵 [AUTH] Réponse Supabase reçue:', { data: !!data, error: !!error })

        if (error) {
          console.error('🔴 [AUTH] Erreur Supabase:', error)
          setLoading(false)
          return {
            success: false,
            error: error.message === 'Invalid login credentials'
              ? 'Email ou mot de passe incorrect'
              : error.message,
          }
        }

        if (data.user) {
          console.log('🔵 [AUTH] Utilisateur authentifié, chargement des données investisseur...')
          const investorData = await loadInvestorData(data.user.id)
          console.log('🔵 [AUTH] Données investisseur chargées:', !!investorData)
          const user = createUserObject(data.user, investorData)
          setCurrentUser(user)
          setSupabaseUser(data.user)
          setLoading(false)
          console.log('✅ [AUTH] Login réussi')
          return { success: true }
        }

        console.error('🔴 [AUTH] Aucun utilisateur dans la réponse')
        setLoading(false)
        return { success: false, error: 'Une erreur est survenue' }
      } catch (error: any) {
        console.error('🔴 [AUTH] Exception pendant le login:', error)
        setLoading(false)
        return {
          success: false,
          error: error.message || 'Une erreur est survenue',
        }
      }
    },
    [loadInvestorData, createUserObject]
  )

  // Déconnexion
  const logout = useCallback(async () => {
    setLoading(true)
    await supabase.auth.signOut()
    // Nettoyer les timestamps de session
    localStorage.removeItem('cerdia_session_expires')
    localStorage.removeItem('cerdia_remember_me')
    setCurrentUser(null)
    setSupabaseUser(null)
    setLoading(false)
  }, [])

  // Vérifier la session
  const checkSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return !!session
  }, [])

  const value: AuthContextType = {
    currentUser,
    loading,
    isAuthenticated: !!currentUser,
    login,
    logout,
    checkSession,
    supabaseUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
