'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Link, Plus, X, ExternalLink, Camera, HardHat, FileText, Globe } from 'lucide-react'

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

const CATEGORY_CONFIG = {
  construction: { label: 'Construction', icon: HardHat, color: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' },
  photos:       { label: 'Photos',       icon: Camera,   color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
  documents:    { label: 'Documents',    icon: FileText,  color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
  general:      { label: 'Général',      icon: Globe,     color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
}

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

  if (links.length === 0 && !isAdmin) return null

  return (
    <div className="px-4 sm:px-6 pt-3 pb-3 border-b border-gray-100 bg-gray-50/60">
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => {
          const cfg = CATEGORY_CONFIG[link.category] || CATEGORY_CONFIG.general
          const Icon = cfg.icon
          return (
            <div key={link.id} className="flex items-center group">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cfg.color}`}
              >
                <Icon size={11} />
                <span>{link.title}</span>
                <ExternalLink size={10} className="opacity-60" />
              </a>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(link.id)}
                  className="ml-0.5 p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Supprimer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )
        })}

        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <Plus size={12} />
            Ajouter un lien
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du lien"
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              required
              autoFocus
            />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              required
            />
          </div>
          <div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PropertyLink['category'])}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#5e5e5e]"
            >
              <option value="construction">Construction</option>
              <option value="photos">Photos</option>
              <option value="documents">Documents</option>
              <option value="general">Général</option>
            </select>
          </div>
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-[#5e5e5e] text-white rounded-lg hover:bg-[#3e3e3e] disabled:opacity-50 transition-colors"
            >
              {saving ? '...' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setTitle(''); setUrl('') }}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
