'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface InvestorDebt {
  id: string
  amount: number
  currency: string
  description: string
  notes: string | null
  status: 'active' | 'partial' | 'paid'
  amount_paid: number
  amount_remaining: number
  created_date: string
  due_date: string | null
  paid_date: string | null
  transaction_id: string | null
}

interface InvestorDebtsProps {
  investorId: string
  investorName: string
}

export default function InvestorDebts({ investorId, investorName }: InvestorDebtsProps) {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  const [debts, setDebts] = useState<InvestorDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadDebts() }, [investorId])

  async function loadDebts() {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('investor_debts')
        .select('*')
        .eq('investor_id', investorId)
        .order('created_date', { ascending: false })
      if (fetchError) throw fetchError
      setDebts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : (fr ? 'Erreur de chargement' : 'Loading error'))
    } finally {
      setLoading(false)
    }
  }

  const fmt = (amount: number, currency: string) =>
    amount.toLocaleString(locale, { style: 'currency', currency })

  const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'partial')
  const paidDebts = debts.filter(d => d.status === 'paid')
  const totalDebtRemaining = activeDebts.reduce((sum, d) => sum + d.amount_remaining, 0)

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {fr ? 'Erreur :' : 'Error:'} {error}
        </p>
      </div>
    )
  }

  if (debts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600" size={24} />
          <div>
            <p className="font-semibold text-green-900">{fr ? 'Aucune dette' : 'No debt'}</p>
            <p className="text-sm text-green-700">
              {fr ? `${investorName} n'a aucune dette à rembourser` : `${investorName} has no outstanding debt`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const statusLabel = (s: 'active' | 'partial' | 'paid') => {
    if (s === 'active') return fr ? 'Actif' : 'Active'
    if (s === 'partial') return fr ? 'Partiel' : 'Partial'
    return fr ? 'Payé' : 'Paid'
  }

  return (
    <div className="space-y-4">
      {activeDebts.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-orange-600" size={24} />
            <div>
              <p className="font-semibold text-orange-900">{fr ? 'Dettes actives' : 'Active debts'}</p>
              <p className="text-sm text-orange-700">
                {activeDebts.length} {fr
                  ? `dette${activeDebts.length > 1 ? 's' : ''} à rembourser`
                  : `outstanding debt${activeDebts.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-orange-200">
            <p className="text-lg font-bold text-orange-900">
              {fr ? 'Total à rembourser :' : 'Total outstanding:'} {totalDebtRemaining.toLocaleString(locale, { style: 'currency', currency: 'CAD' })}
            </p>
          </div>
        </div>
      )}

      {activeDebts.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            {fr ? 'Dettes à rembourser' : 'Outstanding debts'}
          </h3>
          <div className="space-y-4">
            {activeDebts.map(debt => (
              <div key={debt.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{debt.description}</p>
                    {debt.notes && <p className="text-sm text-gray-600 mt-1">{debt.notes}</p>}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    debt.status === 'active' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {statusLabel(debt.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-600">{fr ? 'Montant original' : 'Original amount'}</p>
                    <p className="font-semibold text-gray-900">{fmt(debt.amount, debt.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{fr ? 'Montant payé' : 'Amount paid'}</p>
                    <p className="font-semibold text-green-600">{fmt(debt.amount_paid, debt.currency)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-orange-200">
                    <p className="text-gray-600 text-xs">{fr ? 'Reste à payer' : 'Remaining balance'}</p>
                    <p className="font-bold text-orange-600 text-lg">{fmt(debt.amount_remaining, debt.currency)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between text-xs text-gray-500">
                  <span>{fr ? 'Créé le' : 'Created'} {new Date(debt.created_date).toLocaleDateString(locale)}</span>
                  {debt.due_date && (
                    <span>{fr ? 'Échéance :' : 'Due:'} {new Date(debt.due_date).toLocaleDateString(locale)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paidDebts.length > 0 && (
        <details className="bg-white rounded-lg border border-gray-200">
          <summary className="p-4 cursor-pointer font-semibold text-gray-700 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            {fr ? `Dettes payées (${paidDebts.length})` : `Paid debts (${paidDebts.length})`}
          </summary>
          <div className="p-4 pt-0 space-y-3">
            {paidDebts.map(debt => (
              <div key={debt.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{debt.description}</p>
                    <p className="text-xs text-gray-600 mt-1">{fmt(debt.amount, debt.currency)}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-200 text-green-800">
                    {fr ? 'Payé' : 'Paid'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {fr ? 'Payé le' : 'Paid on'} {debt.paid_date ? new Date(debt.paid_date).toLocaleDateString(locale) : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
