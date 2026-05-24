'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CircleCropModal from '@/components/ui/CircleCropModal'
import { Save, Upload, Plus, Trash2, Check, ExternalLink, Sparkles, Camera, Link2, User, Star } from 'lucide-react'

interface Profile {
  id: string
  name: string
  tagline: string
  bio: string
  headshot_url: string
  cover_url: string
  contact_email: string
  phone: string
  instagram_url: string
  tiktok_url: string
  location: string
}

interface PortfolioItem {
  id: string
  type: string
  title: string
  url: string
  category: string
  sort_order: number
}

export default function PortfolioFillPage() {
  const { token } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'profil' | 'photos' | 'liens'>('profil')

  useEffect(() => { if (token) load(token as string) }, [token])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async (t: string) => {
    const { data } = await supabase.from('portfolio_profiles').select('*').eq('fill_token', t).single()
    if (!data) { setLoading(false); return }
    setProfile(data)
    setForm({
      name: data.name, tagline: data.tagline || '', bio: data.bio || '',
      contact_email: data.contact_email || '', phone: data.phone || '',
      instagram_url: data.instagram_url || '', tiktok_url: data.tiktok_url || '',
      location: data.location || ''
    })
    const { data: its } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', data.id).order('sort_order').order('created_at')
    setItems(its || [])
    setLoading(false)
  }

  const saveProfile = async () => {
    if (!profile) return
    const { error } = await supabase.from('portfolio_profiles')
      .update(form).eq('id', profile.id)
    if (error) { showToast('Erreur: ' + error.message, false); return }
    setProfile({ ...profile, ...form } as Profile)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    showToast('Profil sauvegarde!')
  }

  const openHeadshotCrop = (file: File) => {
    const url = URL.createObjectURL(file)
    setCropSrc(url)
  }

  const confirmHeadshotCrop = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    const file = new File([blob], `headshot-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await uploadPhoto(file, 'headshot_url')
  }

  const uploadPhoto = async (file: File, field: 'headshot_url' | 'cover_url') => {
    if (!profile) return
    setUploadProgress('Upload...')
    const ext = file.name.split('.').pop()
    const path = `portfolio/${profile.id}/${field}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur upload', false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('portfolio_profiles').update({ [field]: publicUrl }).eq('id', profile.id)
    setProfile(p => p ? { ...p, [field]: publicUrl } : null)
    setUploadProgress(null)
    showToast('Photo mise a jour!')
  }

  const uploadItemPhoto = async (file: File) => {
    if (!profile) return
    setUploadProgress('Upload photo...')
    const ext = file.name.split('.').pop()
    const path = `portfolio/${profile.id}/items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur', false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    await supabase.from('portfolio_items').insert([{
      profile_id: profile.id, type: 'photo', url: publicUrl,
      thumbnail_url: publicUrl, sort_order: maxOrder + 1, category: 'portfolio'
    }])
    setUploadProgress(null)
    showToast('Photo ajoutee!')
    await load(token as string)
  }

  const addLink = async (url: string, title: string) => {
    if (!profile || !url) return
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    await supabase.from('portfolio_items').insert([{
      profile_id: profile.id, type: 'link', url, title, sort_order: maxOrder + 1, category: 'portfolio'
    }])
    showToast('Lien ajoute!')
    await load(token as string)
  }

  const deleteItem = async (id: string) => {
    await supabase.from('portfolio_items').delete().eq('id', id)
    setItems(its => its.filter(i => i.id !== id))
    showToast('Supprime')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-5xl mb-4">✦</p>
          <h1 className="text-2xl font-bold text-white mb-2">Lien invalide</h1>
          <p className="text-gray-500">Ce lien de remplissage n&apos;est pas valide ou a expiré.</p>
        </div>
      </div>
    )
  }

  const photos = items.filter(i => i.type === 'photo')
  const links = items.filter(i => i.type === 'link' || i.type === 'video')

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Crop modal */}
      {cropSrc && (
        <CircleCropModal
          src={cropSrc}
          onConfirm={confirmHeadshotCrop}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium
          ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Mon Portfolio</h1>
            <p className="text-xs text-pink-400">{profile.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadProgress && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
              {uploadProgress}
            </span>
          )}
          <a
            href={`/portfolio/${(profile as any).slug || ''}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink size={12} /> Voir public
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-900 border-b border-gray-800 px-4">
        <div className="flex gap-0">
          {[
            { key: 'profil', label: 'Mon Profil', icon: User },
            { key: 'photos', label: `Photos (${photos.length})`, icon: Camera },
            { key: 'liens', label: `Liens (${links.length})`, icon: Link2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors
                ${activeSection === key
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Section: Profil */}
        {activeSection === 'profil' && (
          <div className="space-y-6">
            {/* Photo de profil */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile.headshot_url
                  ? <img src={profile.headshot_url} alt={profile.name} className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500/30" />
                  : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/20 flex items-center justify-center">
                      <User size={28} className="text-pink-400/50" />
                    </div>
                }
              </div>
              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 cursor-pointer bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg border border-gray-700 transition-colors"
                >
                  <Upload size={13} /> Changer ma photo
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) openHeadshotCrop(e.target.files[0]); e.target.value = '' }} />
                </label>
                <label
                  className="flex items-center gap-2 cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs px-3 py-2 rounded-lg border border-gray-700 transition-colors"
                >
                  <Upload size={13} /> Photo couverture
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'cover_url')} />
                </label>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              {[
                { key: 'name', label: 'Nom *', placeholder: 'Ton nom complet' },
                { key: 'tagline', label: 'Titre / Specialite', placeholder: 'Ex: Modele, Actrice, Artiste...' },
                { key: 'location', label: 'Ville', placeholder: 'Montreal, QC' },
                { key: 'contact_email', label: 'Email (pour les agences)', placeholder: 'tonnom@email.com' },
                { key: 'phone', label: 'Telephone', placeholder: '+1 514 000 0000' },
                { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/toncompte' },
                { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@toncompte' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
                  <input
                    value={(form as any)[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Bio — Parle-toi en quelques phrases</label>
                <textarea
                  value={form.bio || ''}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Je suis passionnee par la mode, la photographie artistique..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                />
              </div>
            </div>

            <button
              onClick={saveProfile}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white py-3 rounded-xl font-medium text-sm transition-opacity"
            >
              {saved ? <><Check size={16} /> Sauvegarde!</> : <><Save size={16} /> Sauvegarder mon profil</>}
            </button>
          </div>
        )}

        {/* Section: Photos */}
        {activeSection === 'photos' && (
          <div className="space-y-5">
            <label className="flex flex-col items-center gap-3 cursor-pointer w-full border-2 border-dashed border-gray-700 hover:border-pink-500 rounded-2xl py-10 text-center transition-colors group">
              <div className="w-14 h-14 rounded-full bg-pink-600/10 group-hover:bg-pink-600/20 flex items-center justify-center transition-colors">
                <Upload size={24} className="text-pink-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Ajouter des photos</p>
                <p className="text-gray-500 text-xs mt-1">JPG, PNG — Clique ou glisse tes photos ici</p>
              </div>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => {
                  Array.from(e.target.files || []).forEach(f => uploadItemPhoto(f))
                }} />
            </label>

            {photos.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <Camera size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune photo encore</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(p => (
                  <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden">
                    <img src={p.url} alt={p.title || ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <button
                        onClick={() => deleteItem(p.id)}
                        className="p-2 bg-red-600/80 rounded-lg hover:bg-red-500 transition-colors"
                      >
                        <Trash2 size={15} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section: Liens */}
        {activeSection === 'liens' && (
          <LinkSection links={links} onAdd={addLink} onDelete={deleteItem} />
        )}
      </div>

      {/* Bottom tip */}
      <div className="text-center pb-8 px-4">
        <p className="text-xs text-gray-700">
          <Star size={10} className="inline mr-1" />
          Les agences verront ton portfolio public une fois publie par ton administrateur.
        </p>
      </div>
    </main>
  )
}

function LinkSection({
  links, onAdd, onDelete
}: {
  links: PortfolioItem[]
  onAdd: (url: string, title: string) => void
  onDelete: (id: string) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-white">Ajouter un lien</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom du projet / lien"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500" />
        <button
          onClick={() => { onAdd(url, title); setUrl(''); setTitle('') }}
          disabled={!url}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2 rounded-lg text-sm transition-colors"
        >
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <Link2 size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun lien encore</p>
          <p className="text-xs mt-1">Ajoute des liens Instagram, YouTube, etc.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl p-3">
              <Link2 size={16} className="text-purple-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{link.title || link.url}</p>
                <p className="text-gray-500 text-xs truncate">{link.url}</p>
              </div>
              <button onClick={() => onDelete(link.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
