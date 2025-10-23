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
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error loading investor data:', error)
        return null
      }

      return data as Investor
    } catch (error) {
      console.error('Error loading investor data:', error)
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
      if (session?.user) {
        setSupabaseUser(session.user)
        loadInvestorData(session.user.id).then(investorData => {
          const user = createUserObject(session.user, investorData)
          setCurrentUser(user)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
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
