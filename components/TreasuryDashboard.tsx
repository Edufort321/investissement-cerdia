'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  CreditCard,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Types
interface BankAccount {
  id: string
  name: string
  bank_name: string
  currency: string
  current_balance: number
  available_balance: number
  last_reconciliation_date: string | null
  is_active: boolean
}

interface TreasuryPosition {
  bank_account_id: string
  account_name: string
  current_balance: number
  obligations_30_days: number
  overdue_amount: number
  overdue_count: number
  net_available_cash: number
  days_of_cash: number | null
}

interface TreasuryAlert {
  id: string
  alert_type: string
  severity: string
  title: string
  message: string
  threshold_amount: number | null
  current_value: number | null
  triggered_at: string
  is_acknowledged: boolean
}

interface PaymentObligation {
  id: string
  obligation_type: string
  vendor_name: string | null
  description: string
  due_date: string
  amount: number
  currency: string
  status: string
  priority: number
}

interface CashFlowMonth {
  month: string
  total_inflows: number
  total_outflows: number
  net_cash_flow: number
}

export default function TreasuryDashboard() {
  const { t, language } = useLanguage()
  const fr = language === 'fr'

  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [positions, setPositions] = useState<TreasuryPosition[]>([])
  const [alerts, setAlerts] = useState<TreasuryAlert[]>([])
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentObligation[]>([])
  const [cashFlowForecast, setCashFlowForecast] = useState<CashFlowMonth[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<30 | 60 | 90>(30)

  useEffect(() => {
    loadTreasuryData()
  }, [])

  const loadTreasuryData = async () => {
    setLoading(true)
    try {
      // Charger les comptes bancaires
      const { data: accountsData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // Charger positions de trésorerie
      const { data: positionsData } = await supabase
        .from('treasury_position')
        .select('*')

      // Charger alertes actives
      const { data: alertsData } = await supabase
        .from('treasury_alerts')
        .select('*')
        .eq('is_active', true)
        .order('triggered_at', { ascending: false })

      // Charger obligations à venir (30 jours)
      const { data: paymentsData } = await supabase
        .from('payment_obligations')
        .select('*')
        .in('status', ['pending', 'overdue'])
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('due_date')
        .limit(10)

      // Charger prévisions de cash flow
      const { data: cashFlowData } = await supabase
        .from('cash_flow_12_months')
        .select('*')
        .order('month')
        .limit(6)

      setAccounts(accountsData || [])
      setPositions(positionsData || [])
      setAlerts(alertsData || [])
      setUpcomingPayments(paymentsData || [])
      setCashFlowForecast(cashFlowData || [])
    } catch (error) {
      console.error('Error loading treasury data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'CAD') => {
    return new Intl.NumberFormat(fr ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => {
      if (account.currency === 'CAD') {
        return sum + account.current_balance
      }
      // TODO: Conversion devises
      return sum + account.current_balance
    }, 0)
  }

  const getTotalObligations = () => {
    return positions.reduce((sum, pos) => sum + pos.obligations_30_days, 0)
  }

  const getTotalOverdue = () => {
    return positions.reduce((sum, pos) => sum + pos.overdue_amount, 0)
  }

  const getNetAvailable = () => {
    return getTotalBalance() - getTotalObligations()
  }

  const getCriticalAlerts = () => {
    return alerts.filter(a => a.severity === 'critical' && !a.is_acknowledged)
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'paid':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityIcon = (priority: number) => {
    if (priority <= 2) return '🔴'
    if (priority === 3) return '🟡'
    return '🟢'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('treasury.title')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('treasury.subtitle')}</p>
        </div>
        <button
          onClick={loadTreasuryData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {t('treasury.refresh')}
        </button>
      </div>

      {/* Alertes Critiques */}
      {getCriticalAlerts().length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">
                {getCriticalAlerts().length} {t('treasury.critical')}(s)
              </h3>
              <div className="space-y-2">
                {getCriticalAlerts().map(alert => (
                  <div key={alert.id} className="text-sm text-red-800">
                    <strong>{alert.title}:</strong> {alert.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Solde Total */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('treasury.totalBalance')}</span>
            <DollarSign className="text-blue-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(getTotalBalance())}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {accounts.length} {t('treasury.activeAccounts')}
          </div>
        </div>

        {/* Obligations 30 jours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('treasury.obligations30d')}</span>
            <Calendar className="text-orange-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(getTotalObligations())}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {upcomingPayments.length} {t('treasury.payments')}
          </div>
        </div>

        {/* Trésorerie Disponible */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('treasury.netAvailable')}</span>
            <CreditCard className="text-green-600" size={20} />
          </div>
          <div className={`text-2xl font-bold ${getNetAvailable() < 25000 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(getNetAvailable())}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('treasury.afterObligations')}
          </div>
        </div>

        {/* Retards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{t('treasury.overdueKPI')}</span>
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(getTotalOverdue())}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {positions.reduce((sum, pos) => sum + pos.overdue_count, 0)} {t('treasury.payments')}
          </div>
        </div>
      </div>

      {/* Détail par Compte */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('treasury.bankAccountsTitle')}</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {positions.map(position => {
            const account = accounts.find(a => a.id === position.bank_account_id)
            if (!account) return null

            return (
              <div key={position.bank_account_id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{position.account_name}</h3>
                    <p className="text-sm text-gray-600">{account.bank_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(position.current_balance, account.currency)}
                    </div>
                    <div className="text-sm text-gray-500">{account.currency}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('treasury.obligations30j')}:</span>
                    <div className="font-medium text-orange-600">
                      {formatCurrency(position.obligations_30_days, account.currency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('treasury.available')}:</span>
                    <div className={`font-medium ${position.net_available_cash < 10000 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(position.net_available_cash, account.currency)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('treasury.daysOfCashLabel')}:</span>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {position.days_of_cash ? `${position.days_of_cash} ${t('treasury.days')}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('treasury.overdueKPI')}:</span>
                    <div className="font-medium text-red-600">
                      {position.overdue_count > 0 ? (
                        <>{position.overdue_count} ({formatCurrency(position.overdue_amount, account.currency)})</>
                      ) : (
                        '0'
                      )}
                    </div>
                  </div>
                </div>

                {account.last_reconciliation_date && (
                  <div className="mt-3 text-xs text-gray-500">
                    {t('treasury.lastReconciliation')}: {new Date(account.last_reconciliation_date).toLocaleDateString(fr ? 'fr-CA' : 'en-CA')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Paiements à Venir */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('treasury.upcomingTitle')}</h2>
        </div>
        {upcomingPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
            <p>{t('treasury.noUpcoming')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {upcomingPayments.map(payment => {
              const daysUntilDue = Math.ceil((new Date(payment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              const isUrgent = daysUntilDue <= 7
              const isOverdue = daysUntilDue < 0

              return (
                <div key={payment.id} className={`p-4 ${isOverdue ? 'bg-red-50' : isUrgent ? 'bg-yellow-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-xl">{getPriorityIcon(payment.priority)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{payment.vendor_name || t('treasury.unspecified')}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status === 'pending' ? t('treasury.pending') : payment.status === 'overdue' ? t('treasury.overdueStatus') : payment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(payment.due_date).toLocaleDateString(fr ? 'fr-CA' : 'en-CA')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {isOverdue ? (
                              <span className="text-red-600 font-medium">
                                {Math.abs(daysUntilDue)} {fr ? 'jours de retard' : 'days overdue'}
                              </span>
                            ) : (
                              <span className={isUrgent ? 'text-orange-600 font-medium' : ''}>
                                {fr
                                  ? `Dans ${daysUntilDue} jour${daysUntilDue > 1 ? 's' : ''}`
                                  : `In ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(payment.amount, payment.currency)}
                      </div>
                      <div className="text-xs text-gray-500">{payment.currency}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Toutes les Alertes */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('treasury.allAlertsTitle')}</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 border-l-4 ${alert.severity === 'critical' ? 'border-red-500' : alert.severity === 'warning' ? 'border-yellow-500' : 'border-blue-500'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getAlertColor(alert.severity)}`}>
                        {alert.severity === 'critical' ? t('treasury.critical') : alert.severity === 'warning' ? t('treasury.warningAlert') : 'Info'}
                      </span>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">{alert.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(alert.triggered_at).toLocaleString(fr ? 'fr-CA' : 'en-CA')}
                    </div>
                  </div>
                  {!alert.is_acknowledged && (
                    <button className="text-sm text-blue-600 hover:text-blue-700 ml-4">
                      {t('treasury.acknowledgeBtn')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
