/**
 * Composant pour afficher les dettes d'un investisseur
 * Utilise la table investor_debts créée dans migration 90
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'

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
  const [debts, setDebts] = useState<InvestorDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDebts()
  }, [investorId])

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
      console.error('Error loading investor debts:', err)
      setError(err instanceof Error ? err.message : 'Error loading debts')
    } finally {
      setLoading(false)
    }
  }

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
          Erreur: {error}
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
            <p className="font-semibold text-green-900">Aucune dette</p>
            <p className="text-sm text-green-700">{investorName} n'a aucune dette à rembourser</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Résumé */}
      {activeDebts.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-orange-600" size={24} />
            <div>
              <p className="font-semibold text-orange-900">Dettes actives</p>
              <p className="text-sm text-orange-700">
                {activeDebts.length} dette{activeDebts.length > 1 ? 's' : ''} à rembourser
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-orange-200">
            <p className="text-lg font-bold text-orange-900">
              Total à rembourser: {totalDebtRemaining.toLocaleString('fr-CA', {
                style: 'currency',
                currency: 'CAD'
              })}
            </p>
          </div>
        </div>
      )}

      {/* Liste des dettes actives */}
      {activeDebts.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} />
            Dettes à rembourser
          </h3>
          <div className="space-y-4">
            {activeDebts.map(debt => (
              <div
                key={debt.id}
                className="border border-orange-200 rounded-lg p-4 bg-orange-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{debt.description}</p>
                    {debt.notes && (
                      <p className="text-sm text-gray-600 mt-1">{debt.notes}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    debt.status === 'active' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {debt.status === 'active' ? 'Actif' : 'Partiel'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <p className="text-gray-600">Montant original</p>
                    <p className="font-semibold text-gray-900">
                      {debt.amount.toLocaleString('fr-CA', {
                        style: 'currency',
                        currency: debt.currency
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Montant payé</p>
                    <p className="font-semibold text-green-600">
                      {debt.amount_paid.toLocaleString('fr-CA', {
                        style: 'currency',
                        currency: debt.currency
                      })}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-orange-200">
                    <p className="text-gray-600 text-xs">Reste à payer</p>
                    <p className="font-bold text-orange-600 text-lg">
                      {debt.amount_remaining.toLocaleString('fr-CA', {
                        style: 'currency',
                        currency: debt.currency
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between text-xs text-gray-500">
                  <span>Créé le {new Date(debt.created_date).toLocaleDateString('fr-CA')}</span>
                  {debt.due_date && (
                    <span>Échéance: {new Date(debt.due_date).toLocaleDateString('fr-CA')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des dettes payées */}
      {paidDebts.length > 0 && (
        <details className="bg-white rounded-lg border border-gray-200">
          <summary className="p-4 cursor-pointer font-semibold text-gray-700 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            Dettes payées ({paidDebts.length})
          </summary>
          <div className="p-4 pt-0 space-y-3">
            {paidDebts.map(debt => (
              <div
                key={debt.id}
                className="border border-green-200 rounded-lg p-3 bg-green-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{debt.description}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {debt.amount.toLocaleString('fr-CA', {
                        style: 'currency',
                        currency: debt.currency
                      })}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-200 text-green-800">
                    Payé
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Payé le {debt.paid_date ? new Date(debt.paid_date).toLocaleDateString('fr-CA') : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
