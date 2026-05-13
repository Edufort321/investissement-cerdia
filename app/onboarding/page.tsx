'use client'

/**
 * Wizard d'onboarding — 1ere connexion d'un org_admin sur un nouveau tenant.
 *
 * Bloquant : tant que organization.onboarding_completed === false, le user
 * est redirige ici depuis /dashboard.
 *
 * 4 etapes :
 *   1. Société : nom legal (pre-rempli), adresse, numero d'entreprise
 *   2. Devises & juridiction : devise principale, juridiction fiscale, rapports T1135/T2209
 *   3. Classes de parts (skippable) : ajouter A/B/C ou noms custom
 *   4. Confirmation : recap + bouton "Commencer"
 *
 * A la fin : UPDATE organizations SET onboarding_completed=true, settings={...}
 *           → redirect /dashboard
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Building2, Globe, Coins, FileText, Check, ChevronLeft, ChevronRight, Sparkles, Plus, X, LogOut,
} from 'lucide-react'

const CURRENCIES = ['CAD', 'USD', 'EUR', 'MXN', 'DOP', 'GBP', 'CHF', 'AUD']
const JURISDICTIONS: Array<{ code: string; label: string; taxForms: string[] }> = [
  { code: 'CA', label: 'Canada',         taxForms: ['T1135', 'T2209'] },
  { code: 'US', label: 'États-Unis',     taxForms: ['1099', 'W-9'] },
  { code: 'FR', label: 'France',         taxForms: ['IFU'] },
  { code: 'MX', label: 'Mexique',        taxForms: [] },
  { code: 'DO', label: 'République Dominicaine', taxForms: [] },
  { code: 'OTHER', label: 'Autre / Non applicable', taxForms: [] },
]

type Step = 1 | 2 | 3 | 4

export default function OnboardingPage() {
  const router = useRouter()
  const { organization, profile, refresh, loading } = useOrganization()
  const { logout } = useAuth()

  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Form state
  const [legalName, setLegalName] = useState('')
  const [address, setAddress] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')

  const [currencyPrimary, setCurrencyPrimary] = useState('CAD')
  const [currenciesEnabled, setCurrenciesEnabled] = useState<string[]>(['CAD'])
  const [taxJurisdiction, setTaxJurisdiction] = useState('CA')

  const [shareClasses, setShareClasses] = useState<string[]>(['A'])
  const [newClassInput, setNewClassInput] = useState('')

  // Hydrate form from existing organization
  useEffect(() => {
    if (!organization) return
    setLegalName(prev => prev || organization.name || '')
    const s = organization.settings || {}
    if (s.address) setAddress(s.address as string)
    if (s.business_number) setBusinessNumber(s.business_number as string)
    if (s.currency_primary) setCurrencyPrimary(s.currency_primary as string)
    if (Array.isArray(s.currencies_enabled) && s.currencies_enabled.length > 0) {
      setCurrenciesEnabled(s.currencies_enabled as string[])
    }
    if (s.tax_jurisdiction) setTaxJurisdiction(s.tax_jurisdiction as string)
    if (Array.isArray(s.share_classes) && s.share_classes.length > 0) {
      setShareClasses(s.share_classes as string[])
    }
  }, [organization])

  // Si tenant deja onboarded → renvoie au dashboard (au cas où on arrive ici par erreur)
  useEffect(() => {
    if (!loading && organization?.onboarding_completed) {
      router.replace('/dashboard')
    }
  }, [loading, organization, router])

  const selectedJuri = useMemo(
    () => JURISDICTIONS.find(j => j.code === taxJurisdiction) || JURISDICTIONS[0],
    [taxJurisdiction],
  )

  const toggleCurrency = (cur: string) => {
    setCurrenciesEnabled(prev => {
      if (cur === currencyPrimary) return prev // ne pas retirer la devise principale
      return prev.includes(cur) ? prev.filter(c => c !== cur) : [...prev, cur]
    })
  }

  const addShareClass = () => {
    const v = newClassInput.trim()
    if (!v) return
    if (shareClasses.includes(v)) return
    setShareClasses(prev => [...prev, v])
    setNewClassInput('')
  }

  const removeShareClass = (c: string) => {
    setShareClasses(prev => prev.filter(x => x !== c))
  }

  const canProceed = useMemo(() => {
    if (step === 1) return legalName.trim().length > 0
    if (step === 2) return currencyPrimary && taxJurisdiction
    return true
  }, [step, legalName, currencyPrimary, taxJurisdiction])

  const goNext = () => {
    setErr('')
    if (!canProceed) {
      setErr('Champs requis manquants.')
      return
    }
    if (step < 4) setStep((step + 1) as Step)
  }
  const goBack = () => setStep(s => (s > 1 ? (s - 1) as Step : s))

  const finish = async () => {
    if (!organization) return
    setSaving(true)
    setErr('')
    // Merge settings
    const newSettings = {
      ...(organization.settings || {}),
      address: address.trim() || null,
      business_number: businessNumber.trim() || null,
      currency_primary: currencyPrimary,
      currencies_enabled: Array.from(new Set([currencyPrimary, ...currenciesEnabled])),
      tax_jurisdiction: taxJurisdiction,
      tax_forms: selectedJuri.taxForms,
      share_classes: shareClasses,
    }
    const updates: any = {
      settings: newSettings,
      onboarding_completed: true,
    }
    if (legalName.trim() && legalName.trim() !== organization.name) {
      updates.name = legalName.trim()
    }
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organization.id)
    if (error) {
      setSaving(false)
      setErr(`Erreur de sauvegarde: ${error.message}`)
      return
    }
    // Marque aussi profile.onboarding_completed pour les futurs flows
    if (profile) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id)
    }
    await refresh()
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!organization || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Tu dois être connecté pour accéder à cette page.</p>
          <button onClick={() => router.replace('/connexion')} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm">
            Connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logout discret en haut à droite */}
        <div className="flex justify-end mb-2">
          <button onClick={() => logout()} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <LogOut size={12} /> Déconnexion
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-2xl mb-4">
            <Sparkles size={26} className="text-purple-600 dark:text-purple-300" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Bienvenue sur ta plateforme
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Configurons ton organisation <span className="font-semibold">{organization.name}</span> en quelques étapes.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="flex-1">
              <div className={`h-2 rounded-full transition-colors ${n <= step ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              <p className={`text-xs mt-1 text-center transition-colors ${n === step ? 'font-semibold text-purple-700 dark:text-purple-300' : 'text-gray-400'}`}>
                Étape {n}
              </p>
            </div>
          ))}
        </div>

        {/* Card content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8">

          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <Building2 size={20} className="text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Société</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom légal *</label>
                  <input type="text" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={legalName} onChange={e => setLegalName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse (optionnel)</label>
                  <input type="text" placeholder="1234 rue Exemple, Ville, Province, Pays" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Numéro d'entreprise (NEQ / corpo) — optionnel</label>
                  <input type="text" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <Globe size={20} className="text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Devises &amp; juridiction</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Devise principale</label>
                  <div className="flex flex-wrap gap-2">
                    {CURRENCIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCurrencyPrimary(c)
                          if (!currenciesEnabled.includes(c)) setCurrenciesEnabled(prev => [...prev, c])
                        }}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                          currencyPrimary === c
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Devises secondaires acceptées</label>
                  <div className="flex flex-wrap gap-2">
                    {CURRENCIES.filter(c => c !== currencyPrimary).map(c => {
                      const active = currenciesEnabled.includes(c)
                      return (
                        <button key={c} type="button" onClick={() => toggleCurrency(c)}
                          className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
                            active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-gray-50 dark:bg-gray-700 text-gray-500 border border-gray-200 dark:border-gray-600'
                          }`}>
                          {active ? '✓' : '+'} {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Juridiction fiscale</label>
                  <select className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={taxJurisdiction} onChange={e => setTaxJurisdiction(e.target.value)}>
                    {JURISDICTIONS.map(j => <option key={j.code} value={j.code}>{j.label}</option>)}
                  </select>
                  {selectedJuri.taxForms.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Rapports activés pour cette juridiction : <span className="font-mono">{selectedJuri.taxForms.join(' · ')}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Coins size={20} className="text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Classes de parts</h2>
                <span className="ml-auto text-xs text-gray-400">(facultatif)</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Si ton organisation a une structure de parts/actions (ex: Classe A, B, C), définis-les ici. Sinon tu peux passer.
              </p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" placeholder="ex: Classe A" className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={newClassInput} onChange={e => setNewClassInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addShareClass()} />
                  <button type="button" onClick={addShareClass} className="px-3 py-2 bg-purple-600 text-white rounded-xl text-sm flex items-center gap-1">
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
                {shareClasses.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {shareClasses.map(c => (
                      <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl text-sm">
                        {c}
                        <button type="button" onClick={() => removeShareClass(c)} className="hover:text-purple-900">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <FileText size={20} className="text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Confirmation</h2>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-gray-500">Nom légal</span><span className="font-medium">{legalName}</span>
                </div>
                {address && (
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="text-gray-500">Adresse</span><span className="font-medium text-right">{address}</span>
                  </div>
                )}
                {businessNumber && (
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="text-gray-500">Numéro d'entreprise</span><span className="font-medium">{businessNumber}</span>
                  </div>
                )}
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-gray-500">Devise principale</span><span className="font-medium">{currencyPrimary}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-gray-500">Devises secondaires</span><span className="font-medium text-right">{currenciesEnabled.filter(c => c !== currencyPrimary).join(', ') || '—'}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-gray-500">Juridiction fiscale</span><span className="font-medium">{selectedJuri.label}</span>
                </div>
                {selectedJuri.taxForms.length > 0 && (
                  <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="text-gray-500">Rapports fiscaux</span><span className="font-medium font-mono">{selectedJuri.taxForms.join(' · ')}</span>
                  </div>
                )}
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <span className="text-gray-500">Classes de parts</span><span className="font-medium">{shareClasses.length > 0 ? shareClasses.join(', ') : 'Aucune'}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-5">
                Tu pourras modifier ces paramètres plus tard depuis les <strong>Paramètres</strong> de ton organisation.
              </p>
            </div>
          )}

          {err && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1 || saving}
              className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed}
                className="flex items-center gap-1 px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {step === 3 && shareClasses.length === 0 ? 'Passer' : 'Suivant'} <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Check size={14} /> {saving ? 'Configuration…' : 'Commencer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
