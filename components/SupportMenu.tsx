'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Monitor, ShieldCheck, ShieldOff, Clock, ExternalLink } from 'lucide-react'

/**
 * Menu Support du tenant — deux niveaux, par bonnes pratiques :
 *
 *  1. PARTAGE D'ÉCRAN (par défaut, recommandé) : le client démarre une session
 *     visio et garde le contrôle total. CERDIA ne voit AUCUNE donnée en base.
 *
 *  2. ACCÈS DÉLÉGUÉ (secours, sur consentement explicite) : le client AUTORISE
 *     CERDIA à accéder à ses données (lecture+écriture) pour une durée limitée.
 *     Tant que ce n'est pas activé, le support CERDIA ne voit rien de ce tenant.
 *     À l'activation, info@cerdia.ai reçoit un courriel.
 */

// Lien de session de support (visio). Configurable via env publique.
const SCREENSHARE_URL = process.env.NEXT_PUBLIC_SUPPORT_MEETING_URL || 'https://meet.google.com/new'

type ActiveGrant = { expires_at: string } | null

export default function SupportMenu() {
  const { organization } = useOrganization()
  const orgId = organization?.id ?? null

  const [activeGrant, setActiveGrant] = useState<ActiveGrant>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [duration, setDuration] = useState<'24h' | '7d' | '30d'>('7d')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')

  const loadGrant = async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await supabase
      .from('support_access_grants')
      .select('expires_at, revoked_at')
      .eq('organization_id', orgId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActiveGrant(data ? { expires_at: data.expires_at } : null)
    setLoading(false)
  }

  useEffect(() => { loadGrant() }, [orgId])

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }

  const grantAccess = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/support/grant', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ duration, reason: reason || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setMsg('✅ Accès support activé. L’équipe CERDIA a été notifiée par courriel.')
      await loadGrant()
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Erreur'))
    } finally {
      setBusy(false)
    }
  }

  const revokeAccess = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/support/grant', { method: 'DELETE', headers: await authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setMsg('🔒 Accès support révoqué.')
      await loadGrant()
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Erreur'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Support CERDIA</h2>
        <p className="text-sm text-gray-600 mt-1">
          Deux façons d’obtenir de l’aide. Le partage d’écran est recommandé : vous gardez le contrôle total.
        </p>
      </div>

      {/* 1. Partage d'écran */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Monitor className="text-blue-600 flex-shrink-0 mt-0.5" size={22} />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">1. Session de partage d’écran <span className="text-xs font-normal text-blue-600">(recommandé)</span></h3>
            <p className="text-sm text-gray-600 mt-1">
              Démarrez une visio et partagez votre écran. CERDIA vous guide sans accéder à vos données.
              Aucune donnée ne quitte votre compte.
            </p>
            <a
              href={SCREENSHARE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <ExternalLink size={15} /> Démarrer une session
            </a>
          </div>
        </div>
      </div>

      {/* 2. Accès délégué consenti */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          {activeGrant
            ? <ShieldCheck className="text-green-600 flex-shrink-0 mt-0.5" size={22} />
            : <ShieldOff className="text-gray-400 flex-shrink-0 mt-0.5" size={22} />}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">2. Autoriser l’accès aux données <span className="text-xs font-normal text-gray-500">(secours)</span></h3>
            <p className="text-sm text-gray-600 mt-1">
              Si le partage d’écran ne suffit pas, vous pouvez autoriser temporairement l’équipe CERDIA à
              consulter et corriger vos données. L’accès se coupe automatiquement à l’expiration et tout est journalisé.
            </p>

            {loading ? (
              <p className="text-sm text-gray-400 mt-3">Chargement…</p>
            ) : activeGrant ? (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <Clock size={14} />
                  Accès actif jusqu’au {new Date(activeGrant.expires_at).toLocaleString('fr-CA')}
                </div>
                <button
                  onClick={revokeAccess}
                  disabled={busy}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy ? '…' : 'Révoquer l’accès maintenant'}
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm text-gray-600">Durée :</label>
                  {(['24h', '7d', '30d'] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        duration === d ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {d === '24h' ? '24 heures' : d === '7d' ? '7 jours' : '30 jours'}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Motif (optionnel) — ex: bug sur le calcul NAV"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                />
                <button
                  onClick={grantAccess}
                  disabled={busy}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy ? '…' : 'Autoriser l’accès support'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </div>
  )
}
