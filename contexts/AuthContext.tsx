'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Cache + promise-reuse pour éviter appels concurrents
  const investorDataCache = useRef<Record<string, Investor | null>>({})
  const investorLoadPromise = useRef<Record<string, Promise<Investor | null>>>({})

  const loadInvestorData = useCallback(async (userId: string): Promise<Investor | null> => {
    if (Object.prototype.hasOwnProperty.call(investorDataCache.current, userId)) {
      return investorDataCache.current[userId]
    }

    // Réutilise la requête en vol si déjà en cours
    if (userId in investorLoadPromise.current) {
      return investorLoadPromise.current[userId]
    }

    let timeoutId: NodeJS.Timeout
    const timeoutPromise = new Promise<null>(resolve => {
      timeoutId = setTimeout(() => {
        console.warn('[AUTH] Timeout 5s — investor data')
        resolve(null)
      }, 5000)
    })

    const dataPromise = Promise.resolve(
      supabase.from('investors').select('*').eq('user_id', userId).maybeSingle()
    ).then(({ data, error }) => {
        clearTimeout(timeoutId)
        if (error) {
          console.warn('[AUTH] investor fetch error:', error.message)
          investorDataCache.current[userId] = null
          return null as Investor | null
        }
        const result = (data as Investor) || null
        investorDataCache.current[userId] = result
        return result
      })
      .catch(() => {
        clearTimeout(timeoutId)
        investorDataCache.current[userId] = null
        return null as Investor | null
      })
      .finally(() => { delete investorLoadPromise.current[userId] })

    const promise = Promise.race([dataPromise, timeoutPromise])
    investorLoadPromise.current[userId] = promise
    return promise
  }, [])

  const createUserObject = useCallback(
    (sUser: SupabaseUser, investorData: Investor | null): User => ({
      id: sUser.id,
      email: sUser.email || '',
      firstName: investorData?.first_name || '',
      lastName: investorData?.last_name || '',
      username: investorData?.username || sUser.email || '',
      role: investorData?.access_level || 'investisseur',
      investorData,
    }),
    []
  )

  // Un seul listener — couvre INITIAL_SESSION + SIGNED_IN + SIGNED_OUT
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Vérifier expiration session custom
          const sessionExpires = localStorage.getItem('cerdia_session_expires')
          if (sessionExpires && Date.now() > parseInt(sessionExpires, 10)) {
            localStorage.removeItem('cerdia_session_expires')
            localStorage.removeItem('cerdia_remember_me')
            await supabase.auth.signOut()
            setCurrentUser(null)
            setSupabaseUser(null)
            setLoading(false)
            return
          }

          setSupabaseUser(session.user)

          // Afficher l'UI immédiatement avec les infos de base (sans investorData)
          // puis enrichir en arrière-plan quand la table investors répond
          setCurrentUser(prev => {
            if (prev?.id === session.user.id) return prev
            return createUserObject(session.user, null)
          })
          setLoading(false)

          // Chargement en arrière-plan — ne bloque pas l'UI
          loadInvestorData(session.user.id).then(investorData => {
            setCurrentUser(createUserObject(session.user, investorData))
          })
        } else {
          setSupabaseUser(null)
          setCurrentUser(null)
          setLoading(false)
        }
      }
    )

    return () => { authListener?.subscription?.unsubscribe() }
  }, [loadInvestorData, createUserObject])

  // Connexion — retourne immédiatement après signIn, sans attendre investor data
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        return {
          success: false,
          error: error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : error.message,
        }
      }

      if (data.user) {
        // onAuthStateChange va s'occuper du reste — pas d'attente ici
        return { success: true }
      }

      return { success: false, error: 'Une erreur est survenue' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Une erreur est survenue' }
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('cerdia_session_expires')
    localStorage.removeItem('cerdia_remember_me')
    // Vider le cache investor pour le prochain login
    investorDataCache.current = {}
    investorLoadPromise.current = {}
    setCurrentUser(null)
    setSupabaseUser(null)
  }, [])

  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
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
