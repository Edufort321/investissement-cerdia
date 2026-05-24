'use client'

import { useState, useEffect } from 'react'
import { Link2, Copy, Trash2, Eye, EyeOff, Plus, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'
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

      alert(fr ? 'Lien de partage créé avec succès!' : 'Share link created successfully!')
    } catch (error) {
      console.error('Error creating share link:', error)
      alert(fr ? 'Erreur lors de la création du lien' : 'Error creating the link')
    } finally {
      setCreating(false)
    }
  }

  const revokeLink = async (linkId: string) => {
    if (!confirm(fr ? 'Voulez-vous vraiment désactiver ce lien de partage?' : 'Are you sure you want to deactivate this share link?')) return

    try {
      const { error } = await supabase
        .rpc('revoke_share_link', {
          p_link_id: linkId
        })

      if (error) throw error

      await loadLinks()
      alert(fr ? 'Lien désactivé avec succès' : 'Link deactivated successfully')
    } catch (error) {
      console.error('Error revoking link:', error)
      alert(fr ? 'Erreur lors de la désactivation' : 'Error deactivating the link')
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
      alert(fr ? 'Erreur lors de la copie' : 'Error copying to clipboard')
    }
  }

  const getStatusBadge = (link: ShareLink) => {
    if (!link.is_active) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">{fr ? 'Désactivé' : 'Disabled'}</span>
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">{fr ? 'Expiré' : 'Expired'}</span>
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">{fr ? 'Actif' : 'Active'}</span>
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
            {fr ? 'Liens de Partage' : 'Share Links'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {fr ? `Partagez ${scenarioName} via un lien sécurisé en lecture seule` : `Share ${scenarioName} via a secure read-only link`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {showCreateForm ? <X size={16} /> : <Plus size={16} />}
          {showCreateForm ? (fr ? 'Annuler' : 'Cancel') : (fr ? 'Créer un lien' : 'Create link')}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4">{fr ? 'Nouveau lien de partage' : 'New share link'}</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fr ? 'Expiration (jours)' : 'Expiration (days)'}
              </label>
              <input
                type="number"
                min="1"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : '')}
                placeholder={fr ? 'Laisser vide pour aucune expiration' : 'Leave empty for no expiration'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                {fr ? 'Laisser vide pour un lien permanent' : 'Leave empty for a permanent link'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {fr ? "Permissions d'accès" : 'Access permissions'}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewFinancials}
                    onChange={(e) => setViewFinancials(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{fr ? 'Afficher les informations financières' : 'Show financial information'}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewDocuments}
                    onChange={(e) => setViewDocuments(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{fr ? 'Afficher les documents' : 'Show documents'}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={viewBookings}
                    onChange={(e) => setViewBookings(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{fr ? 'Afficher le calendrier de bookings' : 'Show bookings calendar'}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fr ? 'Notes (optionnel)' : 'Notes (optional)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={fr ? 'Ex: Lien pour investisseur potentiel, lien pour auditeur, etc.' : 'E.g.: Link for potential investor, auditor link, etc.'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                {fr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={createLink}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {creating ? (fr ? 'Création...' : 'Creating...') : (fr ? 'Créer le lien' : 'Create link')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Link2 className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">{fr ? 'Aucun lien de partage créé' : 'No share links created'}</p>
          <p className="text-sm text-gray-500 mt-1">
            {fr ? 'Créez un lien pour partager ce scénario' : 'Create a link to share this scenario'}
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
                      {fr ? 'Créé le' : 'Created'} {new Date(link.created_at).toLocaleDateString(locale)}
                    </span>
                  </div>
                  {link.notes && (
                    <p className="text-sm text-gray-600 mb-2">{link.notes}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Eye size={12} />
                    <span>{link.access_count} {fr ? 'vues' : 'views'}</span>
                    {link.last_accessed_at && (
                      <span>• {fr ? 'Dernier accès' : 'Last accessed'}: {new Date(link.last_accessed_at).toLocaleDateString(locale)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(link.token)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={fr ? 'Copier le lien' : 'Copy link'}
                  >
                    {copiedToken === link.token ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                  <button
                    onClick={() => window.open(`/share/${link.token}`, '_blank')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title={fr ? 'Ouvrir dans un nouvel onglet' : 'Open in new tab'}
                  >
                    <ExternalLink size={18} />
                  </button>
                  {link.is_active && (
                    <button
                      onClick={() => revokeLink(link.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={fr ? 'Désactiver le lien' : 'Deactivate link'}
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
                  {fr ? 'Expire le' : 'Expires'} {new Date(link.expires_at).toLocaleDateString(locale)}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {link.permissions.view_financials && (
                  <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">{fr ? 'Financier' : 'Financial'}</span>
                )}
                {link.permissions.view_documents && (
                  <span className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">{fr ? 'Documents' : 'Documents'}</span>
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
