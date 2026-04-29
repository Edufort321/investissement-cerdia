'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, ExternalLink, Camera, HardHat, FileText, Globe } from 'lucide-react'

interface PropertyLink {
  id: string
  property_id: string
  title: string
  url: string
  category: 'construction' | 'photos' | 'documents' | 'general'
  created_at: string
}

interface PropertyLinksManagerProps {
  propertyId: string
  isAdmin: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; iconColor: string; headerBg: string; headerText: string }> = {
  construction: { label: 'Construction', icon: HardHat,  iconColor: 'text-orange-500', headerBg: 'bg-orange-50', headerText: 'text-orange-700' },
  photos:       { label: 'Photos',       icon: Camera,   iconColor: 'text-purple-500', headerBg: 'bg-purple-50', headerText: 'text-purple-700' },
  documents:    { label: 'Documents',    icon: FileText,  iconColor: 'text-blue-500',   headerBg: 'bg-blue-50',   headerText: 'text-blue-700'   },
  general:      { label: 'Général',      icon: Globe,     iconColor: 'text-gray-500',   headerBg: 'bg-gray-50',   headerText: 'text-gray-700'   },
}

const CATEGORY_ORDER = ['construction', 'photos', 'documents', 'general']

export default function PropertyLinksManager({ propertyId, isAdmin }: PropertyLinksManagerProps) {
  const [links, setLinks] = useState<PropertyLink[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<PropertyLink['category']>('general')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadLinks()
  }, [propertyId])

  const loadLinks = async () => {
    const { data } = await supabase
      .from('property_links')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: true })
    setLinks(data || [])
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    setSaving(true)
    try {
      let finalUrl = url.trim()
      if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl
      const { error } = await supabase.from('property_links').insert([{
        property_id: propertyId,
        title: title.trim(),
        url: finalUrl,
        category,
      }])
      if (error) throw error
      setTitle('')
      setUrl('')
      setCategory('general')
      setShowForm(false)
      await loadLinks()
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce lien ?')) return
    await supabase.from('property_links').delete().eq('id', id)
    await loadLinks()
  }

  // Grouper par catégorie
  const grouped = CATEGORY_ORDER.reduce<Record<string, PropertyLink[]>>((acc, cat) => {
    const catLinks = links.filter(l => l.category === cat)
    if (catLinks.length > 0) acc[cat] = catLinks
    return acc
  }, {})

  const hasLinks = links.length > 0

  return (
    <div className="p-5 space-y-4">
      {/* Liens groupés par catégorie */}
      {hasLinks ? (
        <div className="space-y-3">
          {CATEGORY_ORDER.filter(cat => grouped[cat]).map(cat => {
            const cfg = CATEGORY_CONFIG[cat]
            const Icon = cfg.icon
            return (
              <div key={cat} className={`rounded-lg overflow-hidden border border-gray-100`}>
                <div className={`flex items-center gap-2 px-3 py-2 ${cfg.headerBg}`}>
                  <Icon size={13} className={cfg.iconColor} />
                  <span className={`text-xs font-semibold ${cfg.headerText}`}>{cfg.label}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {grouped[cat].map(link => (
                    <div key={link.id} className="flex items-center justify-between px-3 py-2.5 group hover:bg-gray-50">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 flex-1 min-w-0"
                      >
                        <ExternalLink size={13} className="flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
                        <span className="truncate">{link.title}</span>
                      </a>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(link.id)}
                          className="ml-3 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          title="Supprimer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          Aucun lien ajouté pour ce projet.
        </div>
      )}

      {/* Formulaire d'ajout (admin) */}
      {isAdmin && (
        <div className="border-t border-gray-100 pt-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
              <Plus size={15} />
              Ajouter un lien
            </button>
          ) : (
            <form onSubmit={handleAdd} className="space-y-3 bg-gray-50 rounded-lg p-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Suivi de chantier semaine 12"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PropertyLink['category'])}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-400"
                >
                  <option value="construction">🟠 Construction</option>
                  <option value="photos">🟣 Photos</option>
                  <option value="documents">🔵 Documents</option>
                  <option value="general">⚪ Général</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setTitle(''); setUrl('') }}
                  className="flex-1 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
