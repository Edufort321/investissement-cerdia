'use client'

/**
 * Page DEMO publique — Phase 5
 *
 * Accessible via cerdia.ai/demo sans authentification. Affiche le tenant
 * "DEMO — Plateforme CERDIA" en lecture seule grace a la policy RLS
 * demo_public_read (mig 158) qui autorise les anon a SELECT les rows
 * dont organization_id appartient au tenant avec is_demo=true.
 *
 * Toi (super_admin) peux editer le contenu via "View as..." depuis
 * /commerce/admin → Organisations.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Building2, TrendingUp, DollarSign, Users, BarChart3, ArrowRight, Sparkles, Eye,
} from 'lucide-react'

const DEMO_ORG_ID = 'd0000000-0000-0000-0000-000000000001'

interface DemoOrg {
  id: string
  name: string
  logo_url: string | null
  settings: any
}

interface Property {
  id: string
  name: string
  location: string
  status: string
  total_cost: number
  paid_amount: number
  expected_roi: number | null
  currency: string | null
}

interface Investor {
  id: string
  first_name: string
  last_name: string
  total_shares: number | null
  percentage_ownership: number | null
}

interface Transaction {
  id: string
  date: string
  type: string
  amount: number
  description: string
}

function fmtCAD(n: number) {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
}

export default function DemoPage() {
  const [org, setOrg] = useState<DemoOrg | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [investors, setInvestors] = useState<Investor[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [orgRes, propsRes, invRes, txRes] = await Promise.all([
          supabase.from('organizations').select('id, name, logo_url, settings').eq('id', DEMO_ORG_ID).maybeSingle(),
          supabase.from('properties').select('id, name, location, status, total_cost, paid_amount, expected_roi, currency').eq('organization_id', DEMO_ORG_ID).limit(10),
          supabase.from('investors').select('id, first_name, last_name, total_shares, percentage_ownership').eq('organization_id', DEMO_ORG_ID).limit(20),
          supabase.from('transactions').select('id, date, type, amount, description').eq('organization_id', DEMO_ORG_ID).order('date', { ascending: false }).limit(10),
        ])
        if (cancelled) return
        setOrg(orgRes.data as DemoOrg | null)
        setProperties((propsRes.data || []) as Property[])
        setInvestors((invRes.data || []) as Investor[])
        setTransactions((txRes.data || []) as Transaction[])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const totalProperties = properties.length
  const totalInvested = transactions
    .filter(t => t.type === 'investissement' || t.type === 'investment')
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalShares = investors.reduce((s, i) => s + (i.total_shares || 0), 0)
  const totalAssets = properties.reduce((s, p) => s + (p.total_cost || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 pt-24">
      {/* Banniere demo */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Sparkles size={16} />
            <p className="text-sm font-medium">
              🎭 MODE DÉMO — Données fictives pour démontrer les capacités de la plateforme CERDIA.
            </p>
          </div>
          <Link href="/commerce" className="inline-flex items-center gap-1 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-medium transition-colors">
            Démarrer mon essai <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-4">
            <Eye size={28} className="text-purple-600 dark:text-purple-300" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {org?.name || 'Plateforme CERDIA — Démo'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore en toute liberté la plateforme de gestion d&apos;investissements de CERDIA.
            NAV par part, suivi des propriétés, dividendes, multi-devises, rapports fiscaux —
            tout est ici, simulé avec des données fictives.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <DemoKpi icon={Users} label="Investisseurs" value={investors.length.toString()} color="emerald" />
              <DemoKpi icon={Building2} label="Propriétés" value={totalProperties.toString()} color="orange" />
              <DemoKpi icon={DollarSign} label="Capital investi" value={fmtCAD(totalInvested)} color="blue" />
              <DemoKpi icon={TrendingUp} label="Actifs sous gestion" value={fmtCAD(totalAssets)} color="purple" />
            </div>

            {/* Properties */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-orange-500" /> Propriétés du portefeuille
              </h2>
              {properties.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center">
                  Le tenant DEMO n&apos;a pas encore de données. Eric peut les ajouter via le mode super_admin (View as...).
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {properties.map(p => (
                    <div key={p.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.location}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{p.status}</span>
                      </div>
                      <div className="mt-3 flex justify-between text-xs">
                        <span className="text-gray-500">Coût total</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {p.total_cost?.toLocaleString('fr-CA')} {p.currency || 'CAD'}
                        </span>
                      </div>
                      {p.expected_roi != null && (
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-500">ROI attendu</span>
                          <span className="font-medium text-emerald-600">{p.expected_roi}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Investisseurs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users size={18} className="text-emerald-500" /> Structure d&apos;investissement
              </h2>
              {investors.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4 text-center">Pas encore d&apos;investisseurs dans le démo.</p>
              ) : (
                <div className="space-y-2">
                  {investors.map(i => (
                    <div key={i.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-semibold text-purple-700 dark:text-purple-300">
                          {i.first_name?.charAt(0)}{i.last_name?.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">{i.first_name} {i.last_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{i.total_shares?.toLocaleString('fr-CA') || 0} parts</span>
                        <span className="font-medium">{(i.percentage_ownership ?? 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions récentes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-500" /> Transactions récentes
              </h2>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4 text-center">Pas encore de transactions.</p>
              ) : (
                <div className="space-y-1">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{t.date}</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate">{t.description}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap ml-2">
                        {fmtCAD(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA final */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Prêt à gérer tes propres investissements ?</h2>
              <p className="text-sm sm:text-base opacity-90 mb-5">
                Crée ton organisation et reçois ton accès personnalisé à la plateforme CERDIA.
              </p>
              <Link href="/commerce" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-full text-sm font-semibold hover:bg-purple-50 transition-colors">
                Commencer mon essai <ArrowRight size={14} />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DemoKpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
    orange:  'from-orange-50 to-orange-100 border-orange-200 text-orange-700',
    blue:    'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
    purple:  'from-purple-50 to-purple-100 border-purple-200 text-purple-700',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl border p-4 shadow-sm dark:from-gray-800 dark:to-gray-800 dark:border-gray-700`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wide font-medium opacity-80">{label}</p>
        <Icon size={14} className="opacity-70" />
      </div>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
    </div>
  )
}
