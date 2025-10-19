'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

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
  const addInvestor = useCallback(async (investor: Partial<Investor>) => {
    try {
      const { error } = await supabase
        .from('investors')
        .insert([investor])

      if (error) throw error
      await fetchInvestors()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }, [fetchInvestors])

  // Update Investor
  const updateInvestor = useCallback(async (id: string, updates: Partial<Investor>) => {
    try {
      const { error } = await supabase
        .from('investors')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchInvestors()
      return { success: true }
    } catch (error: any) {
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
      ]).finally(() => setLoading(false))
    }
  }, [isAuthenticated, fetchInvestors, fetchProperties, fetchTransactions, fetchAccounts, fetchPaymentSchedules])

  const value: InvestmentContextType = {
    investors,
    properties,
    transactions,
    capexAccounts,
    currentAccounts,
    rndAccounts,
    paymentSchedules,
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
  }

  return <InvestmentContext.Provider value={value}>{children}</InvestmentContext.Provider>
}

export default InvestmentContext
