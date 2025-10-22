'use client'

import { useState, useEffect } from 'react'
import { Link2, Copy, Trash2, Eye, EyeOff, Plus, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface ShareLink {
  id: string
  token: string
  created_at: string
  expires_at: string | null
  is_active: boolean
  access_count: number
  last_accessed_at: string | null
  permissions: {
    view_financials: boolean
    view_documents: boolean
    view_bookings: boolean
  }
  notes: string | null
  share_url: string
}

interface ShareLinkManagerProps {
  scenarioId: string
  scenarioName: string
}

export default function ShareLinkManager({ scenarioId, scenarioName }: ShareLinkManagerProps) {
  const { currentUser } = useAuth()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Formulaire de création
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('')
  const [viewFinancials, setViewFinancials] = useState(true)
  const [viewDocuments, setViewDocuments] = useState(false)
  const [viewBookings, setViewBookings] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadLinks()
  }, [scenarioId])

  const loadLinks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('list_scenario_share_links', {
          p_scenario_id: scenarioId
        })

      if (error) throw error
      setLinks(data || [])
    } catch (error) {
      console.error('Error loading share links:', error)
    } finally {
      setLoading(false)
    }
  }

  const createLink = async () => {
    if (!currentUser) return

    setCreating(true)
    try {
      const { data, error } = await supabase
        .rpc('create_share_link', {
          p_scenario_id: scenarioId,
          p_created_by: currentUser.id,
          p_expires_in_days: expiresInDays || null,
          p_view_financials: viewFinancials,
          p_view_documents: viewDocuments,
          p_view_bookings: viewBookings,
          p_notes: notes || null
        })

      if (error) throw error

      // Réinitialiser le formulaire
      setExpiresInDays('')
      setViewFinancials(true)
      setViewDocuments(false)
      setViewBookings(false)
      setNotes('')
      setShowCreateForm(false)

      // Recharger les liens
      await loadLinks()

      alert('✅ Lien de partage créé avec succès!')
    } catch (error) {
      console.error('Error creating share link:', error)
      alert('❌ Erreur lors de la création du lien')
    } finally {
      setCreating(false)
    }
  }

  const revokeLink = async (linkId: string) => {
    if (!confirm('Voulez-vous vraiment désactiver ce lien de partage?')) return

    try {
      const { error } = await supabase
        .rpc('revoke_share_link', {
          p_link_id: linkId
        })

      if (error) throw error

      await loadLinks()
      alert('✅ Lien désactivé avec succès')
    } catch (error) {
      console.error('Error revoking link:', error)
      alert('❌ Erreur lors de la désactivation')
    }
  }

  const copyToClipboard = async (token: string) => {
    const baseUrl = window.location.origin
    const shareUrl = `${baseUrl}/share/${token}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      alert('Erreur lors de la copie')
    }
  }

  const getStatusBadge = (link: ShareLink) => {
    if (!link.is_active) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">Désactivé</span>
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Expiré</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Actif</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Link2 size={20} />
            Liens de Partage
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Partagez {scenarioName} via un lien sécurisé en lecture seule
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {showCreateForm ? <X size={16} /> : <Plus size={16} />}
          {showCreateForm ? 'Annuler' : 'Créer un lien'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">Nouveau lien de partage</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration (jours)
              </label>
              <input
                type="number"
                min="1"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : '')}
                placeholder="Laisser vide pour aucune expiration"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide pour un lien permanent
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions d'accès
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewFinancials}
                    onChange={(e) => setViewFinancials(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Afficher les informations financières</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewDocuments}
                    onChange={(e) => setViewDocuments(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Afficher les documents</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewBookings}
                    onChange={(e) => setViewBookings(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Afficher le calendrier de bookings</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Lien pour investisseur potentiel, lien pour auditeur, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={createLink}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {creating ? 'Création...' : 'Créer le lien'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Link2 className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">Aucun lien de partage créé</p>
          <p className="text-sm text-gray-500 mt-1">
            Créez un lien pour partager ce scénario
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(link)}
                    <span className="text-xs text-gray-500">
                      Créé le {new Date(link.created_at).toLocaleDateString('fr-CA')}
                    </span>
                  </div>
                  {link.notes && (
                    <p className="text-sm text-gray-600 mb-2">{link.notes}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Eye size={12} />
                    <span>{link.access_count} vues</span>
                    {link.last_accessed_at && (
                      <span>• Dernier accès: {new Date(link.last_accessed_at).toLocaleDateString('fr-CA')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(link.token)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copier le lien"
                  >
                    {copiedToken === link.token ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  <button
                    onClick={() => window.open(`/share/${link.token}`, '_blank')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Ouvrir dans un nouvel onglet"
                  >
                    <ExternalLink size={18} />
                  </button>
                  {link.is_active && (
                    <button
                      onClick={() => revokeLink(link.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Désactiver le lien"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded px-3 py-2 font-mono text-xs text-gray-700 break-all">
                {window.location.origin}/share/{link.token}
              </div>

              {link.expires_at && (
                <div className="mt-2 text-xs text-gray-600">
                  Expire le {new Date(link.expires_at).toLocaleDateString('fr-CA')}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {link.permissions.view_financials && (
                  <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">Financier</span>
                )}
                {link.permissions.view_documents && (
                  <span className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">Documents</span>
                )}
                {link.permissions.view_bookings && (
                  <span className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded">Bookings</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
