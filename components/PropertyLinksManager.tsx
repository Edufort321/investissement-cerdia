'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Link2, Plus, X, ExternalLink, Camera, HardHat, FileText, Globe, ChevronDown } from 'lucide-react'

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

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; iconColor: string; headerColor: string }> = {
  construction: { label: 'Construction', icon: HardHat, iconColor: 'text-orange-500', headerColor: 'text-orange-600' },
  photos:       { label: 'Photos',       icon: Camera,   iconColor: 'text-purple-500', headerColor: 'text-purple-600' },
  documents:    { label: 'Documents',    icon: FileText,  iconColor: 'text-blue-500',   headerColor: 'text-blue-600'   },
  general:      { label: 'Général',      icon: Globe,     iconColor: 'text-gray-500',   headerColor: 'text-gray-600'   },
}

const CATEGORY_ORDER = ['construction', 'photos', 'documents', 'general']

export default function PropertyLinksManager({ propertyId, isAdmin }: PropertyLinksManagerProps) {
  const [links, setLinks] = useState<PropertyLink[]>([])
  const [open, setOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<PropertyLink['category']>('general')
  const [saving, setSaving] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadLinks()
  }, [propertyId])

  // Fermer le panneau en cliquant ailleurs
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowForm(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Supprimer ce lien ?')) return
    await supabase.from('property_links').delete().eq('id', id)
    await loadLinks()
  }

  // Ne rien afficher si pas de liens et pas admin
  if (links.length === 0 && !isAdmin) return null

  // Grouper par catégorie
  const grouped = CATEGORY_ORDER.reduce<Record<string, PropertyLink[]>>((acc, cat) => {
    const catLinks = links.filter(l => l.category === cat)
    if (catLinks.length > 0) acc[cat] = catLinks
    return acc
  }, {})

  return (
    <div ref={panelRef} className="relative">
      {/* Bouton déclencheur */}
      <div className="px-4 sm:px-6 py-2 flex justify-end border-b border-gray-100">
        <button
          onClick={() => { setOpen(!open); setShowForm(false) }}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            open
              ? 'bg-gray-900 text-white border-gray-900'
              : links.length > 0
                ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                : 'border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400'
          }`}
        >
          <Link2 size={12} />
          {links.length > 0 ? (
            <span>Liens <span className="font-bold">({links.length})</span></span>
          ) : (
            <span>Ajouter des liens</span>
          )}
          <ChevronDown size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Panneau déroulant */}
      {open && (
        <div className="absolute right-4 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          {/* Liens groupés par catégorie */}
          {Object.keys(grouped).length > 0 ? (
            <div className="divide-y divide-gray-100">
              {CATEGORY_ORDER.filter(cat => grouped[cat]).map(cat => {
                const cfg = CATEGORY_CONFIG[cat]
                const Icon = cfg.icon
                return (
                  <div key={cat} className="px-4 py-3">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${cfg.headerColor}`}>
                      <Icon size={12} />
                      {cfg.label}
                    </div>
                    <div className="space-y-1">
                      {grouped[cat].map(link => (
                        <div key={link.id} className="flex items-center justify-between group">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 flex-1 min-w-0 py-0.5"
                          >
                            <ExternalLink size={12} className="flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
                            <span className="truncate">{link.title}</span>
                          </a>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleDelete(link.id, e)}
                              className="ml-2 p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                              title="Supprimer"
                            >
                              <X size={13} />
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
            <div className="px-4 py-4 text-center text-sm text-gray-400">
              Aucun lien ajouté
            </div>
          )}

          {/* Footer admin */}
          {isAdmin && (
            <div className="border-t border-gray-100">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <Plus size={14} />
                  Ajouter un lien
                </button>
              ) : (
                <form onSubmit={handleAdd} className="p-3 space-y-2 bg-gray-50">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                    autoFocus
                  />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    required
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PropertyLink['category'])}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="construction">🟠 Construction</option>
                    <option value="photos">🟣 Photos</option>
                    <option value="documents">🔵 Documents</option>
                    <option value="general">⚪ Général</option>
                  </select>
                  <div className="flex gap-1.5">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
                    >
                      {saving ? '...' : 'Ajouter'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setTitle(''); setUrl('') }}
                      className="flex-1 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
