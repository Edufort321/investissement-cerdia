'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { InvestorInvestment, ShareSettings, InvestorSummary } from '@/types/shares'

// Types
interface Property {
  id: string
  name: string
  location: string
  status: string
  total_cost: number
  paid_amount: number
  reservation_date: string
  expected_roi: number
  // Payment schedule fields
  currency?: string
  payment_schedule_type?: string
  reservation_deposit?: number
  reservation_deposit_cad?: number
  total_paid_cad?: number
  payment_start_date?: string
  payment_end_date?: string
  created_at: string
  updated_at: string
}

interface PaymentSchedule {
  id: string
  property_id: string
  term_number: number
  term_label: string
  percentage: number | null
  amount: number
  currency: string
  amount_paid_cad: number | null
  exchange_rate_used: number | null
  due_date: string
  paid_date: string | null
  status: string
  alert_days_before: number
  alert_sent: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

interface Transaction {
  id: string
  date: string
  type: string
  amount: number
  description: string
  investor_id: string | null
  property_id: string | null
  category: string
  payment_method: string
  reference_number: string | null
  status: string
  created_at: string
  updated_at: string
  // International tax fields
  payment_schedule_id: string | null
  source_currency: string | null
  source_amount: number | null
  exchange_rate: number | null
  source_country: string | null
  foreign_tax_paid: number | null
  foreign_tax_rate: number | null
  tax_credit_claimable: number | null
  fiscal_category: string | null
  vendor_name: string | null
  accountant_notes: string | null
}

interface Investor {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  username: string
  action_class: string
  total_shares: number
  share_value: number
  total_invested: number
  current_value: number
  percentage_ownership: number
  investment_type: string
  status: string
  join_date: string
  can_vote: boolean
  access_level: string
  permissions: {
    dashboard: boolean
    projet: boolean
    administration: boolean
  }
  created_at: string
  updated_at: string
}

interface CapexAccount {
  id: string
  year: number
  investment_capex: number
  operation_capex: number
  total_reserve: number
  created_at: string
  updated_at: string
}

interface CurrentAccount {
  id: string
  year: number
  balance: number
  total_deposits: number
  total_withdrawals: number
  created_at: string
  updated_at: string
}

interface RnDAccount {
  id: string
  year: number
  investment_capex: number
  operation_capex: number
  dividend_total: number
  created_at: string
  updated_at: string
}

interface InvestmentContextType {
  // Data
  investors: Investor[]
  properties: Property[]
  transactions: Transaction[]
  capexAccounts: CapexAccount[]
  currentAccounts: CurrentAccount[]
  rndAccounts: RnDAccount[]
  paymentSchedules: PaymentSchedule[]
  investorInvestments: InvestorInvestment[]
  shareSettings: ShareSettings | null
  investorSummaries: InvestorSummary[]

  // Loading states
  loading: boolean

  // CRUD operations - Investors
  fetchInvestors: () => Promise<void>
  addInvestor: (investor: Partial<Investor>) => Promise<{ success: boolean; error?: string }>
  updateInvestor: (id: string, updates: Partial<Investor>) => Promise<{ success: boolean; error?: string }>
  deleteInvestor: (id: string) => Promise<{ success: boolean; error?: string }>

  // CRUD operations - Properties
  fetchProperties: () => Promise<void>
  addProperty: (property: Partial<Property>) => Promise<{ success: boolean; error?: string }>
  updateProperty: (id: string, updates: Partial<Property>) => Promise<{ success: boolean; error?: string }>
  deleteProperty: (id: string) => Promise<{ success: boolean; error?: string }>

  // CRUD operations - Transactions
  fetchTransactions: () => Promise<void>
  addTransaction: (transaction: Partial<Transaction>) => Promise<{ success: boolean; error?: string }>
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ success: boolean; error?: string }>
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>

  // Accounts operations
  fetchAccounts: () => Promise<void>

  // Payment schedules operations
  fetchPaymentSchedules: (propertyId?: string) => Promise<void>
  addPaymentSchedule: (schedule: Partial<PaymentSchedule>) => Promise<{ success: boolean; error?: string }>
  updatePaymentSchedule: (id: string, updates: Partial<PaymentSchedule>) => Promise<{ success: boolean; error?: string }>
  deletePaymentSchedule: (id: string) => Promise<{ success: boolean; error?: string }>
  markPaymentAsPaid: (id: string, paidDate: string, amountPaidCad: number, exchangeRate: number) => Promise<{ success: boolean; error?: string }>

  // Share system operations
  fetchShareSettings: () => Promise<void>
  updateNominalShareValue: (newValue: number) => Promise<{ success: boolean; error?: string }>
  updateEstimatedShareValue: (newValue: number) => Promise<{ success: boolean; error?: string }>
  fetchInvestorInvestments: (investorId?: string) => Promise<void>
  addInvestment: (investment: Partial<InvestorInvestment>) => Promise<{ success: boolean; error?: string }>
  fetchInvestorSummaries: () => Promise<void>
  calculateEstimatedShareValue: () => Promise<number>
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined)

export const useInvestment = () => {
  const context = useContext(InvestmentContext)
  if (!context) {
    throw new Error('useInvestment must be used within an InvestmentProvider')
  }
  return context
}

export function InvestmentProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  const [investors, setInvestors] = useState<Investor[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [capexAccounts, setCapexAccounts] = useState<CapexAccount[]>([])
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([])
  const [rndAccounts, setRnDAccounts] = useState<RnDAccount[]>([])
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([])
  const [investorInvestments, setInvestorInvestments] = useState<InvestorInvestment[]>([])
  const [shareSettings, setShareSettings] = useState<ShareSettings | null>(null)
  const [investorSummaries, setInvestorSummaries] = useState<InvestorSummary[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch Investors
  const fetchInvestors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestors(data || [])
    } catch (error) {
      console.error('Error fetching investors:', error)
    }
  }, [])

  // Fetch Properties
  const fetchProperties = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    }
  }, [])

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }, [])

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const [capexResult, currentResult, rndResult] = await Promise.all([
        supabase.from('capex_accounts').select('*').order('year', { ascending: false }),
        supabase.from('current_accounts').select('*').order('year', { ascending: false }),
        supabase.from('rnd_accounts').select('*').order('year', { ascending: false }),
      ])

      if (capexResult.data) setCapexAccounts(capexResult.data)
      if (currentResult.data) setCurrentAccounts(currentResult.data)
      if (rndResult.data) setRnDAccounts(rndResult.data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }, [])

  // Add Investor
  const addInvestor = useCallback(async (investor: Partial<Investor> & { password?: string }) => {
    try {
      console.log('🟢 [addInvestor] Début de création investisseur')
      console.log('🟢 [addInvestor] Données:', {
        email: investor.email,
        first_name: investor.first_name,
        last_name: investor.last_name,
        hasPassword: !!investor.password
      })

      let authUserId = investor.user_id || null

      // Si un mot de passe est fourni, créer ou mettre à jour le compte Supabase Auth via l'API
      if (investor.password && investor.email) {
        console.log('🟡 [addInvestor] Appel API upsert-auth (création ou mise à jour)...')

        const apiPayload = {
          email: investor.email,
          password: investor.password,
          firstName: investor.first_name,
          lastName: investor.last_name
        }
        console.log('🟡 [addInvestor] Payload API:', { ...apiPayload, password: '***' })

        const response = await fetch('/api/investors/upsert-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        })

        console.log('🟡 [addInvestor] Status HTTP de la réponse:', response.status, response.statusText)

        const result = await response.json()
        console.log('🟡 [addInvestor] Réponse API complète:', result)

        if (!response.ok) {
          console.error('❌ [addInvestor] Erreur HTTP de l\'API:', response.status, result)
          throw new Error(result.error || `Erreur HTTP ${response.status}: ${response.statusText}`)
        }

        if (!result.success) {
          console.error('❌ [addInvestor] L\'API a retourné success=false:', result)
          throw new Error(result.error || 'L\'API a indiqué un échec sans message d\'erreur')
        }

        if (!result.user_id) {
          console.error('❌ [addInvestor] Aucun user_id retourné par l\'API:', result)
          throw new Error('L\'API n\'a pas retourné de user_id. Le compte Auth n\'a peut-être pas été créé.')
        }

        authUserId = result.user_id

        if (result.existed) {
          console.log('✅ [addInvestor] Compte Auth existant trouvé et mis à jour! user_id:', authUserId)
        } else {
          console.log('✅ [addInvestor] Nouveau compte Auth créé avec succès! user_id:', authUserId)
        }
      } else {
        console.log('⚪ [addInvestor] Pas de mot de passe fourni, pas de création/mise à jour de compte Auth')
      }

      // Retirer le password avant d'insérer dans la table investors
      const { password, ...investorData } = investor

      console.log('🔵 [addInvestor] Insertion dans la table investors avec user_id:', authUserId)

      // Insérer dans la table investors avec le user_id du compte Auth
      const { error, data } = await supabase
        .from('investors')
        .insert([{
          ...investorData,
          user_id: authUserId
        }])
        .select()

      if (error) {
        console.error('❌ [addInvestor] Erreur lors de l\'insertion dans investors:', error)
        throw error
      }

      console.log('✅ [addInvestor] Investisseur inséré avec succès dans la DB:', data)

      await fetchInvestors()
      console.log('✅ [addInvestor] Liste des investisseurs rafraîchie')

      return { success: true }
    } catch (error: any) {
      console.error('❌ [addInvestor] ERREUR FINALE:', error)
      console.error('❌ [addInvestor] Message d\'erreur:', error.message)
      console.error('❌ [addInvestor] Stack trace:', error.stack)
      return { success: false, error: error.message }
    }
  }, [fetchInvestors])

  // Update Investor
  const updateInvestor = useCallback(async (id: string, updates: Partial<Investor> & { password?: string }) => {
    try {
      console.log('🟢 [updateInvestor] Début de mise à jour investisseur:', id)
      console.log('🟢 [updateInvestor] Données:', {
        email: updates.email,
        first_name: updates.first_name,
        last_name: updates.last_name,
        hasPassword: !!updates.password,
        hasUserId: !!updates.user_id
      })

      // Si un mot de passe ou email est modifié, utiliser l'API upsert-auth
      if ((updates.password || updates.email) && updates.user_id) {
        console.log('🟡 [updateInvestor] Appel API upsert-auth pour mise à jour du compte Auth...')

        const apiPayload = {
          user_id: updates.user_id,
          email: updates.email,
          password: updates.password,
          firstName: updates.first_name,
          lastName: updates.last_name
        }
        console.log('🟡 [updateInvestor] Payload API:', {
          ...apiPayload,
          password: apiPayload.password ? '***' : undefined
        })

        const response = await fetch('/api/investors/upsert-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        })

        const result = await response.json()
        console.log('🟡 [updateInvestor] Réponse API:', result)

        if (!response.ok || !result.success) {
          console.error('❌ [updateInvestor] Erreur API:', result)
          throw new Error(result.error || 'Erreur lors de la mise à jour du compte Auth')
        }

        console.log('✅ [updateInvestor] Compte Auth mis à jour (email et/ou password)')
      } else if ((updates.password || updates.email) && !updates.user_id) {
        console.log('⚠️ [updateInvestor] Pas de user_id pour mettre à jour le compte Auth')
        console.log('⚠️ [updateInvestor] Tentative de création/liaison du compte Auth...')

        // Si pas de user_id mais qu'on veut mettre à jour l'auth, essayer de créer/lier
        const apiPayload = {
          email: updates.email,
          password: updates.password,
          firstName: updates.first_name,
          lastName: updates.last_name
        }

        const response = await fetch('/api/investors/upsert-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayload)
        })

        const result = await response.json()

        if (response.ok && result.success && result.user_id) {
          console.log('✅ [updateInvestor] Compte Auth trouvé/créé, user_id:', result.user_id)
          updates.user_id = result.user_id
        } else {
          console.error('❌ [updateInvestor] Impossible de créer/lier le compte Auth:', result)
        }
      }

      // Retirer le password avant de mettre à jour la table investors
      const { password, ...investorData } = updates

      console.log('🔵 [updateInvestor] Mise à jour de la table investors')

      const { error } = await supabase
        .from('investors')
        .update(investorData)
        .eq('id', id)

      if (error) {
        console.error('❌ [updateInvestor] Erreur lors de la mise à jour dans investors:', error)
        throw error
      }

      console.log('✅ [updateInvestor] Investisseur mis à jour avec succès dans la DB')

      await fetchInvestors()
      console.log('✅ [updateInvestor] Liste des investisseurs rafraîchie')

      return { success: true }
    } catch (error: any) {
      console.error('❌ [updateInvestor] ERREUR FINALE:', error)
      console.error('❌ [updateInvestor] Message d\'erreur:', error.message)
      return { success: false, error: error.message }
    }
  }, [fetchInvestors])

  // Delete Investor
  const deleteInvestor = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('investors')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchInvestors()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchInvestors])

  // Add Property
  const addProperty = useCallback(async (property: Partial<Property>) => {
    try {
      const { error } = await supabase
        .from('properties')
        .insert([property])

      if (error) throw error
      await fetchProperties()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchProperties])

  // Update Property
  const updateProperty = useCallback(async (id: string, updates: Partial<Property>) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchProperties()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchProperties])

  // Delete Property
  const deleteProperty = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchProperties()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchProperties])

  // Add Transaction
  const addTransaction = useCallback(async (transaction: Partial<Transaction>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([transaction])

      if (error) throw error
      await fetchTransactions()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchTransactions])

  // Update Transaction
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchTransactions()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchTransactions])

  // Delete Transaction
  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchTransactions()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchTransactions])

  // Fetch Payment Schedules
  const fetchPaymentSchedules = useCallback(async (propertyId?: string) => {
    try {
      let query = supabase
        .from('payment_schedules')
        .select('*')
        .order('due_date', { ascending: true })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query

      if (error) throw error
      setPaymentSchedules(data || [])
    } catch (error) {
      console.error('Error fetching payment schedules:', error)
    }
  }, [])

  // Add Payment Schedule
  const addPaymentSchedule = useCallback(async (schedule: Partial<PaymentSchedule>) => {
    try {
      const { error } = await supabase
        .from('payment_schedules')
        .insert([schedule])

      if (error) throw error
      await fetchPaymentSchedules()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchPaymentSchedules])

  // Update Payment Schedule
  const updatePaymentSchedule = useCallback(async (id: string, updates: Partial<PaymentSchedule>) => {
    try {
      const { error } = await supabase
        .from('payment_schedules')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchPaymentSchedules()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchPaymentSchedules])

  // Delete Payment Schedule
  const deletePaymentSchedule = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('payment_schedules')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchPaymentSchedules()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchPaymentSchedules])

  // Mark Payment as Paid
  const markPaymentAsPaid = useCallback(async (
    id: string,
    paidDate: string,
    amountPaidCad: number,
    exchangeRate: number
  ) => {
    try {
      const { error } = await supabase
        .from('payment_schedules')
        .update({
          status: 'paid',
          paid_date: paidDate,
          amount_paid_cad: amountPaidCad,
          exchange_rate_used: exchangeRate
        })
        .eq('id', id)

      if (error) throw error
      await fetchPaymentSchedules()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchPaymentSchedules])

  // ==========================================
  // SHARE SYSTEM FUNCTIONS
  // ==========================================

  // Fetch Share Settings (valeurs nominale et estimée des parts)
  const fetchShareSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('share_settings')
        .select('*')
        .single()

      if (error) {
        // Si la vue n'existe pas encore, retourner des valeurs par défaut
        console.warn('Share settings not found, using defaults:', error)
        setShareSettings({
          nominal_share_value: 1.00,
          estimated_share_value: 1.00,
          company_name: 'CERDIA Investment Platform',
          calculation_method: 'weighted_roi',
        })
        return
      }

      setShareSettings(data)
    } catch (error) {
      console.error('Error fetching share settings:', error)
      setShareSettings({
        nominal_share_value: 1.00,
        estimated_share_value: 1.00,
        company_name: 'CERDIA Investment Platform',
        calculation_method: 'weighted_roi',
      })
    }
  }, [])

  // Update Nominal Share Value (prix de vente actuel)
  const updateNominalShareValue = useCallback(async (newValue: number) => {
    try {
      // Utiliser la fonction helper update_setting
      const { error } = await supabase.rpc('update_setting', {
        key_name: 'nominal_share_value',
        new_value: newValue.toString()
      })

      if (error) throw error

      // Rafraîchir les settings
      await fetchShareSettings()
      return { success: true }
    } catch (error: any) {
      console.error('Error updating nominal share value:', error)
      return { success: false, error: error.message }
    }
  }, [fetchShareSettings])

  // Update Estimated Share Value (valeur calculée selon ROI)
  const updateEstimatedShareValue = useCallback(async (newValue: number) => {
    try {
      const { error } = await supabase.rpc('update_setting', {
        key_name: 'estimated_share_value',
        new_value: newValue.toString()
      })

      if (error) throw error

      await fetchShareSettings()
      return { success: true }
    } catch (error: any) {
      console.error('Error updating estimated share value:', error)
      return { success: false, error: error.message }
    }
  }, [fetchShareSettings])

  // Fetch Investor Investments (historique achats de parts)
  const fetchInvestorInvestments = useCallback(async (investorId?: string) => {
    try {
      let query = supabase
        .from('investor_investments')
        .select('*')
        .order('investment_date', { ascending: false })

      if (investorId) {
        query = query.eq('investor_id', investorId)
      }

      const { data, error } = await query

      if (error) throw error
      setInvestorInvestments(data || [])
    } catch (error) {
      console.error('Error fetching investor investments:', error)
      setInvestorInvestments([])
    }
  }, [])

  // Add Investment (nouvel achat de parts)
  const addInvestment = useCallback(async (investment: Partial<InvestorInvestment>) => {
    try {
      if (!shareSettings) {
        throw new Error('Share settings not loaded')
      }

      // Calculer le nombre de parts selon le prix nominal actuel
      const amount = investment.amount_invested || 0
      const sharePrice = shareSettings.nominal_share_value
      const numberOfShares = amount / sharePrice

      const newInvestment = {
        ...investment,
        share_price_at_purchase: sharePrice,
        number_of_shares: numberOfShares,
        currency: investment.currency || 'CAD',
      }

      const { error } = await supabase
        .from('investor_investments')
        .insert([newInvestment])

      if (error) throw error

      // Rafraîchir les données
      await fetchInvestorInvestments()
      await fetchInvestorSummaries()
      return { success: true }
    } catch (error: any) {
      console.error('Error adding investment:', error)
      return { success: false, error: error.message }
    }
  }, [shareSettings, fetchInvestorInvestments])

  // Fetch Investor Summaries (résumés avec calculs)
  const fetchInvestorSummaries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('investor_summary')
        .select('*')

      if (error) throw error

      // Ajouter les calculs de valeur actuelle si on a les settings
      const enrichedData = (data || []).map((summary: any) => {
        const currentValue = shareSettings
          ? summary.total_shares * shareSettings.estimated_share_value
          : 0
        const gainLoss = currentValue - summary.total_amount_invested
        const roiPercentage = summary.total_amount_invested > 0
          ? (gainLoss / summary.total_amount_invested) * 100
          : 0

        return {
          ...summary,
          current_value: currentValue,
          gain_loss: gainLoss,
          roi_percentage: roiPercentage,
        }
      })

      setInvestorSummaries(enrichedData)
    } catch (error) {
      console.error('Error fetching investor summaries:', error)
      setInvestorSummaries([])
    }
  }, [shareSettings])

  // Calculate Estimated Share Value (basé sur ROI des propriétés)
  const calculateEstimatedShareValue = useCallback(async () => {
    try {
      // Récupérer la performance globale des propriétés
      const { data: perfData, error: perfError } = await supabase
        .from('property_performance')
        .select('*')

      if (perfError) throw perfError

      if (!perfData || perfData.length === 0) {
        return 1.00 // Valeur par défaut si pas de données
      }

      // Calculer la moyenne pondérée du ROI
      let totalInvestment = 0
      let weightedROI = 0

      perfData.forEach((perf: any) => {
        const investment = perf.total_cost || 0
        const roi = perf.annualized_roi || 0
        totalInvestment += investment
        weightedROI += investment * (roi / 100)
      })

      const averageROI = totalInvestment > 0 ? weightedROI / totalInvestment : 0

      // Appliquer le ROI à la valeur nominale
      // Formule simple: valeur_estimée = valeur_nominale × (1 + ROI_moyen)
      const nominalValue = shareSettings?.nominal_share_value || 1.00
      const estimatedValue = nominalValue * (1 + averageROI)

      return estimatedValue
    } catch (error) {
      console.error('Error calculating estimated share value:', error)
      return 1.00
    }
  }, [shareSettings])

  // Load all data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      Promise.all([
        fetchInvestors(),
        fetchProperties(),
        fetchTransactions(),
        fetchAccounts(),
        fetchPaymentSchedules(),
        fetchShareSettings(),
        fetchInvestorInvestments(),
        fetchInvestorSummaries(),
      ]).finally(() => setLoading(false))
    }
  }, [isAuthenticated, fetchInvestors, fetchProperties, fetchTransactions, fetchAccounts, fetchPaymentSchedules, fetchShareSettings, fetchInvestorInvestments, fetchInvestorSummaries])

  const value: InvestmentContextType = {
    investors,
    properties,
    transactions,
    capexAccounts,
    currentAccounts,
    rndAccounts,
    paymentSchedules,
    investorInvestments,
    shareSettings,
    investorSummaries,
    loading,
    fetchInvestors,
    addInvestor,
    updateInvestor,
    deleteInvestor,
    fetchProperties,
    addProperty,
    updateProperty,
    deleteProperty,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    fetchAccounts,
    fetchPaymentSchedules,
    addPaymentSchedule,
    updatePaymentSchedule,
    deletePaymentSchedule,
    markPaymentAsPaid,
    fetchShareSettings,
    updateNominalShareValue,
    updateEstimatedShareValue,
    fetchInvestorInvestments,
    addInvestment,
    fetchInvestorSummaries,
    calculateEstimatedShareValue,
  }

  return <InvestmentContext.Provider value={value}>{children}</InvestmentContext.Provider>
}

export default InvestmentContext
