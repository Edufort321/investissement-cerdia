'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import CircleCropModal from '@/components/ui/CircleCropModal'
import {
  Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Link2, Image, Upload,
  Copy, Check, Star, Globe, Instagram, Share2, ExternalLink, ChevronDown,
  Phone, Mail, MapPin, User, Sparkles, FileDown
} from 'lucide-react'

interface Profile {
  id: string
  slug: string
  fill_token: string
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
  is_published: boolean
  created_at: string
}

interface PortfolioItem {
  id: string
  profile_id: string
  type: 'photo' | 'link' | 'video'
  title: string
  description: string
  url: string
  thumbnail_url: string
  category: string
  sort_order: number
}

const CATEGORIES = ['portfolio', 'editorial', 'commercial', 'beauty', 'fashion', 'lifestyle']

export default function PortfolioTab() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', tagline: '', bio: '', contact_email: '', phone: '',
    instagram_url: '', tiktok_url: '', location: '', slug: ''
  })
  const [itemForm, setItemForm] = useState({
    type: 'photo' as 'photo' | 'link' | 'video',
    title: '', description: '', url: '', thumbnail_url: '', category: 'portfolio'
  })

  useEffect(() => { loadProfiles() }, [])
  useEffect(() => { if (selectedProfile) loadItems(selectedProfile.id) }, [selectedProfile])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadProfiles = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('portfolio_profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data || [])
    if (!selectedProfile && data && data.length > 0) setSelectedProfile(data[0])
    setIsLoading(false)
  }

  const loadItems = async (profileId: string) => {
    const { data } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', profileId).order('sort_order').order('created_at')
    setItems(data || [])
  }

  const slugify = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const openNewProfile = () => {
    setForm({ name: '', tagline: '', bio: '', contact_email: '', phone: '', instagram_url: '', tiktok_url: '', location: '', slug: '' })
    setSelectedProfile(null)
    setEditingProfile(true)
  }

  const openEditProfile = (p: Profile) => {
    setForm({
      name: p.name, tagline: p.tagline || '', bio: p.bio || '',
      contact_email: p.contact_email || '', phone: p.phone || '',
      instagram_url: p.instagram_url || '', tiktok_url: p.tiktok_url || '',
      location: p.location || '', slug: p.slug
    })
    setEditingProfile(true)
  }

  const saveProfile = async () => {
    if (!form.name.trim()) { showToast('Le nom est requis', false); return }
    const slug = form.slug || slugify(form.name)
    setIsLoading(true)
    if (selectedProfile) {
      const { error } = await supabase.from('portfolio_profiles').update({ ...form, slug }).eq('id', selectedProfile.id)
      if (error) { showToast('Erreur: ' + error.message, false); setIsLoading(false); return }
      showToast('Profil mis a jour')
    } else {
      const { data, error } = await supabase.from('portfolio_profiles').insert([{ ...form, slug }]).select().single()
      if (error) { showToast('Erreur: ' + error.message, false); setIsLoading(false); return }
      setSelectedProfile(data)
      showToast('Profil cree!')
    }
    await loadProfiles()
    setEditingProfile(false)
    setIsLoading(false)
  }

  const togglePublish = async (profile: Profile) => {
    const { error } = await supabase.from('portfolio_profiles')
      .update({ is_published: !profile.is_published }).eq('id', profile.id)
    if (!error) {
      showToast(profile.is_published ? 'Portfolio cache' : 'Portfolio publie!')
      await loadProfiles()
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile({ ...profile, is_published: !profile.is_published })
      }
    }
  }

  const deleteProfile = async (id: string) => {
    if (!confirm('Supprimer ce portfolio et toutes ses photos?')) return
    await supabase.from('portfolio_profiles').delete().eq('id', id)
    setSelectedProfile(null)
    showToast('Portfolio supprime')
    await loadProfiles()
  }

  const uploadPhoto = async (file: File, field: 'headshot_url' | 'cover_url') => {
    if (!selectedProfile) { showToast('Choisir un profil d\'abord', false); return }
    setUploadProgress(`Upload ${field === 'headshot_url' ? 'photo profil' : 'couverture'}...`)
    const ext = file.name.split('.').pop()
    const path = `portfolio/${selectedProfile.id}/${field}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur upload: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    const { error } = await supabase.from('portfolio_profiles').update({ [field]: publicUrl }).eq('id', selectedProfile.id)
    if (!error) {
      setSelectedProfile({ ...selectedProfile, [field]: publicUrl })
      showToast('Photo mise a jour!')
    }
    setUploadProgress(null)
    await loadProfiles()
  }

  const openHeadshotCrop = (file: File) => {
    const url = URL.createObjectURL(file)
    setCropSrc(url)
  }

  const confirmHeadshotCrop = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (!selectedProfile) return
    const file = new File([blob], `headshot-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await uploadPhoto(file, 'headshot_url')
  }

  const uploadItemPhoto = async (file: File) => {
    if (!selectedProfile) return
    setUploadProgress('Upload photo...')
    const ext = file.name.split('.').pop()
    const path = `portfolio/${selectedProfile.id}/items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    setItemForm(f => ({ ...f, url: publicUrl, thumbnail_url: publicUrl }))
    setUploadProgress(null)
    showToast('Photo chargee!')
  }

  const saveItem = async () => {
    if (!selectedProfile || !itemForm.url) { showToast('URL ou photo requise', false); return }
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    const { error } = await supabase.from('portfolio_items').insert([{
      profile_id: selectedProfile.id,
      ...itemForm,
      sort_order: maxOrder + 1
    }])
    if (error) { showToast('Erreur: ' + error.message, false); return }
    showToast('Element ajoute!')
    setItemForm({ type: 'photo', title: '', description: '', url: '', thumbnail_url: '', category: 'portfolio' })
    setAddingItem(false)
    await loadItems(selectedProfile.id)
  }

  const deleteItem = async (id: string) => {
    await supabase.from('portfolio_items').delete().eq('id', id)
    showToast('Supprime')
    if (selectedProfile) await loadItems(selectedProfile.id)
  }

  const copyToClipboard = (text: string, which: 'slug' | 'token') => {
    navigator.clipboard.writeText(text)
    if (which === 'slug') { setCopiedSlug(text); setTimeout(() => setCopiedSlug(null), 2000) }
    else { setCopiedToken(true); setTimeout(() => setCopiedToken(false), 2000) }
  }

  const publicUrl = (profile: Profile) => `${window.location.origin}/portfolio/${profile.slug}`
  const fillUrl = (profile: Profile) => `${window.location.origin}/portfolio/fill/${profile.fill_token}`

  const photoItems = items.filter(i => i.type === 'photo')
  const linkItems = items.filter(i => i.type === 'link')

  const exportPDF = (profile: Profile) => {
    try {
      const pubUrl = publicUrl(profile)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const W = 215.9, H = 279.4

      // ── Background sombre ──
      doc.setFillColor(12, 10, 22)
      doc.rect(0, 0, W, H, 'F')

      // Gradient top accent band
      doc.setFillColor(80, 0, 100)
      doc.rect(0, 0, W, 8, 'F')
      doc.setFillColor(150, 20, 80)
      doc.rect(0, 0, W, 3, 'F')

      let y = 22

      // ── NOM ──
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(30)
      doc.setTextColor(255, 255, 255)
      doc.text(profile.name, W / 2, y, { align: 'center' })
      y += 9

      // ── Tagline ──
      if (profile.tagline) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(244, 114, 182)
        doc.text(profile.tagline.toUpperCase(), W / 2, y, { align: 'center' })
        y += 6
      }

      // ── Localisation ──
      if (profile.location) {
        doc.setFontSize(8)
        doc.setTextColor(140, 120, 160)
        doc.text(profile.location, W / 2, y, { align: 'center' })
        y += 5
      }

      // Separateur
      doc.setDrawColor(100, 20, 140)
      doc.setLineWidth(0.3)
      doc.line(50, y + 2, W - 50, y + 2)
      y += 8

      // ── Bio ──
      if (profile.bio) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.setTextColor(200, 195, 215)
        const lines = doc.splitTextToSize(profile.bio, 165)
        doc.text(lines, W / 2, y, { align: 'center' })
        y += lines.length * 5 + 8
      }

      // ── Contact ──
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(219, 39, 119)
      doc.text('CONTACT', 20, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(190, 185, 205)

      if (profile.contact_email) {
        doc.text(`Email: ${profile.contact_email}`, 20, y)
        doc.link(20, y - 4, 100, 5, { url: `mailto:${profile.contact_email}` })
        y += 5
      }
      if (profile.phone) {
        doc.text(`Tel: ${profile.phone}`, 20, y)
        y += 5
      }
      if (profile.instagram_url) {
        doc.setTextColor(244, 114, 182)
        doc.text('Instagram  ->  ' + profile.instagram_url, 20, y)
        doc.link(20, y - 4, 175, 5, { url: profile.instagram_url })
        doc.setTextColor(190, 185, 205)
        y += 5
      }
      if (profile.tiktok_url) {
        doc.setTextColor(168, 85, 247)
        doc.text('TikTok  ->  ' + profile.tiktok_url, 20, y)
        doc.link(20, y - 4, 175, 5, { url: profile.tiktok_url })
        doc.setTextColor(190, 185, 205)
        y += 5
      }
      y += 6

      // ── Liens projets ──
      if (linkItems.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(219, 39, 119)
        doc.text('LIENS & PROJETS', 20, y)
        y += 5

        for (const link of linkItems.slice(0, 8)) {
          doc.setFillColor(30, 18, 50)
          doc.roundedRect(20, y - 3.5, W - 40, 8, 1.5, 1.5, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(210, 205, 225)
          if (link.title) {
            doc.text(link.title, 26, y + 1)
            doc.setTextColor(140, 100, 200)
            const urlStr = link.url.length > 55 ? link.url.slice(0, 52) + '...' : link.url
            doc.text(urlStr, 26 + 55, y + 1)
          } else {
            doc.setTextColor(140, 100, 200)
            const urlStr = link.url.length > 80 ? link.url.slice(0, 77) + '...' : link.url
            doc.text(urlStr, 26, y + 1)
          }
          doc.link(20, y - 3.5, W - 40, 8, { url: link.url })
          y += 10
        }
        y += 4
      }

      // ── Portfolio en ligne — grand bouton cliquable ──
      doc.setFillColor(60, 10, 90)
      doc.roundedRect(20, y, W - 40, 16, 3, 3, 'F')
      doc.setDrawColor(219, 39, 119)
      doc.setLineWidth(0.4)
      doc.roundedRect(20, y, W - 40, 16, 3, 3, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(219, 39, 119)
      doc.text('VOIR LE PORTFOLIO EN LIGNE', W / 2, y + 5.5, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(168, 85, 247)
      doc.text(pubUrl, W / 2, y + 11, { align: 'center' })
      doc.link(20, y, W - 40, 16, { url: pubUrl })
      y += 22

      // ── Mention photos ──
      if (photoItems.length > 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(120, 100, 140)
        doc.text(`${photoItems.length} photo${photoItems.length > 1 ? 's' : ''} disponible${photoItems.length > 1 ? 's' : ''} sur le portfolio en ligne.`, W / 2, y, { align: 'center' })
        y += 6
      }

      // ── Footer ──
      doc.setDrawColor(80, 20, 120)
      doc.setLineWidth(0.4)
      doc.line(20, H - 14, W - 20, H - 14)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(90, 75, 110)
      doc.text(`${profile.name}  |  Portfolio Artistique  |  ${new Date().getFullYear()}`, W / 2, H - 9, { align: 'center' })
      doc.text(pubUrl, W / 2, H - 5, { align: 'center' })
      doc.link(40, H - 12, W - 80, 8, { url: pubUrl })

      doc.save(`portfolio-${profile.slug}.pdf`)
      showToast('PDF exporte!')
    } catch (err) {
      console.error('PDF error:', err)
      showToast('Erreur PDF: ' + (err instanceof Error ? err.message : String(err)), false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
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
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Portfolio Artistique</h1>
              <p className="text-sm text-gray-400">Gestion des portfolios publics</p>
            </div>
          </div>
          <button
            onClick={openNewProfile}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <Plus size={16} /> Nouveau portfolio
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar profiles */}
          <div className="lg:col-span-1 space-y-3">
            {profiles.length === 0 && !editingProfile && (
              <div className="text-center py-12 text-gray-500">
                <User size={40} className="mx-auto mb-3 opacity-30" />
                <p>Aucun portfolio</p>
                <p className="text-xs mt-1">Cree un nouveau portfolio pour commencer</p>
              </div>
            )}
            {profiles.map(p => (
              <div
                key={p.id}
                onClick={() => { setSelectedProfile(p); setEditingProfile(false) }}
                className={`relative rounded-xl p-4 cursor-pointer transition-all border
                  ${selectedProfile?.id === p.id
                    ? 'bg-gray-800 border-pink-500/50'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
              >
                <div className="flex items-start gap-3">
                  {p.headshot_url
                    ? <img src={p.headshot_url} alt={p.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-500/30" />
                    : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center border border-pink-500/20">
                        <User size={20} className="text-pink-400" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{p.tagline || 'Artiste'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>
                        {p.is_published ? 'Public' : 'Prive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile form */}
            {editingProfile && (
              <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                {/* ── Glamour banner ── */}
                <div className="relative h-28 bg-gradient-to-r from-purple-950 via-pink-950 to-purple-950 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(219,39,119,0.20)_0%,transparent_70%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(168,85,247,0.15)_0%,transparent_60%)]" />
                  <div className="relative z-10 text-center px-4">
                    <p className="text-pink-400/60 text-xs tracking-[0.35em] uppercase mb-2">
                      ✦ Portfolio Artistique ✦
                    </p>
                    <h2
                      className="text-3xl md:text-4xl font-bold text-white leading-tight"
                      style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        textShadow: '0 2px 16px rgba(219,39,119,0.6), 0 0 40px rgba(168,85,247,0.3)'
                      }}
                    >
                      {selectedProfile ? selectedProfile.name : 'Nouveau Portfolio'}
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'name', label: 'Nom *', placeholder: 'Ex: Sofia Dufort' },
                    { key: 'tagline', label: 'Titre', placeholder: 'Ex: Modele & Artiste' },
                    { key: 'contact_email', label: 'Email', placeholder: 'sofia@email.com' },
                    { key: 'phone', label: 'Tel', placeholder: '+1 514...' },
                    { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
                    { key: 'tiktok_url', label: 'TikTok URL', placeholder: 'https://tiktok.com/@...' },
                    { key: 'location', label: 'Ville', placeholder: 'Montreal, QC' },
                    { key: 'slug', label: 'Slug URL', placeholder: 'sofia-dufort (auto)' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className={key === 'bio' ? 'col-span-2' : ''}>
                      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                      <input
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Decris-toi en quelques lignes..."
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={saveProfile}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save size={15} /> Sauvegarder
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    <X size={15} /> Annuler
                  </button>
                </div>
                </div>{/* /p-6 */}
              </div>
            )}

            {/* Profile detail */}
            {selectedProfile && !editingProfile && (
              <>
                {/* Profile header card */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  {/* Cover */}
                  <div
                    className="h-36 relative group cursor-pointer"
                    style={selectedProfile.cover_url
                      ? { backgroundImage: `url(${selectedProfile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 50%, #0d1a3d 100%)' }
                    }
                    onClick={() => coverInputRef.current?.click()}
                  >
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Upload size={24} className="text-white" />
                    </div>
                    <span className="absolute bottom-2 right-3 text-xs text-white/50 opacity-0 group-hover:opacity-100">Changer couverture</span>
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'cover_url')} />

                  <div className="p-5 -mt-10 flex items-end gap-4">
                    <div
                      className="w-20 h-20 rounded-full ring-4 ring-gray-900 relative group cursor-pointer overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {selectedProfile.headshot_url
                        ? <img src={selectedProfile.headshot_url} alt={selectedProfile.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                            <User size={28} />
                          </div>
                      }
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-full">
                        <Upload size={18} className="text-white" />
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) openHeadshotCrop(e.target.files[0]); e.target.value = '' }} />

                    <div className="flex-1 pb-1">
                      <h2 className="text-xl font-bold text-white">{selectedProfile.name}</h2>
                      {selectedProfile.tagline && <p className="text-sm text-pink-400">{selectedProfile.tagline}</p>}
                      {selectedProfile.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin size={11} /> {selectedProfile.location}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pb-1">
                      <button
                        onClick={() => togglePublish(selectedProfile)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${selectedProfile.is_published
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30'
                            : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'}`}
                      >
                        {selectedProfile.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                        {selectedProfile.is_published ? 'Public' : 'Prive'}
                      </button>
                      <button
                        onClick={() => openEditProfile(selectedProfile)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 transition-colors"
                      >
                        <Edit2 size={13} /> Modifier
                      </button>
                      <button
                        onClick={() => exportPDF(selectedProfile)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 border border-purple-800/30 transition-colors"
                      >
                        <FileDown size={13} /> PDF
                      </button>
                      <button
                        onClick={() => deleteProfile(selectedProfile.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-800/30 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Share links */}
                  <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <Globe size={11} /> Lien public (agences)
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-pink-400 truncate flex-1">/portfolio/{selectedProfile.slug}</code>
                        <button
                          onClick={() => copyToClipboard(publicUrl(selectedProfile), 'slug')}
                          className="flex-shrink-0 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                          {copiedSlug ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                        <a href={publicUrl(selectedProfile)} target="_blank" className="flex-shrink-0 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                        <Edit2 size={11} /> Lien de remplissage (pour ta fille)
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-purple-400 truncate flex-1">/portfolio/fill/[token]</code>
                        <button
                          onClick={() => copyToClipboard(fillUrl(selectedProfile), 'token')}
                          className="flex-shrink-0 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                          {copiedToken ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                        <a href={fillUrl(selectedProfile)} target="_blank" className="flex-shrink-0 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {uploadProgress && (
                  <div className="bg-purple-900/30 border border-purple-700/30 rounded-lg px-4 py-2 text-sm text-purple-300 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    {uploadProgress}
                  </div>
                )}

                {/* Photos grid */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Image size={16} className="text-pink-400" />
                      Photos & Liens <span className="text-gray-500 font-normal text-sm">({items.length})</span>
                    </h3>
                    <button
                      onClick={() => setAddingItem(!addingItem)}
                      className="flex items-center gap-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-600/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>

                  {/* Add item form */}
                  {addingItem && (
                    <div className="mb-5 p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-3">
                      <div className="flex gap-3">
                        {(['photo', 'link', 'video'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setItemForm(f => ({ ...f, type: t }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize
                              ${itemForm.type === t
                                ? 'bg-pink-600 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {itemForm.type === 'photo' && (
                        <div>
                          <button
                            onClick={() => {
                              const inp = document.createElement('input')
                              inp.type = 'file'; inp.accept = 'image/*'
                              inp.onchange = (e) => {
                                const f = (e.target as HTMLInputElement).files?.[0]
                                if (f) uploadItemPhoto(f)
                              }
                              inp.click()
                            }}
                            className="w-full border-2 border-dashed border-gray-600 hover:border-pink-500 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-500 hover:text-pink-400 transition-colors"
                          >
                            <Upload size={24} />
                            <span className="text-sm">Cliquer pour uploader une photo</span>
                          </button>
                          {itemForm.url && (
                            <img src={itemForm.url} alt="preview" className="mt-2 h-24 rounded-lg object-cover" />
                          )}
                        </div>
                      )}

                      {itemForm.type !== 'photo' && (
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">URL *</label>
                          <input
                            value={itemForm.url}
                            onChange={e => setItemForm(f => ({ ...f, url: e.target.value }))}
                            placeholder="https://..."
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Titre</label>
                          <input
                            value={itemForm.title}
                            onChange={e => setItemForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Ex: Editorial Vogue"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Categorie</label>
                          <select
                            value={itemForm.category}
                            onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                          >
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={saveItem} className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 text-white px-3 py-2 rounded-lg text-sm transition-colors">
                          <Save size={14} /> Sauvegarder
                        </button>
                        <button onClick={() => setAddingItem(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Gallery grid */}
                  {items.length === 0 ? (
                    <div className="text-center py-10 text-gray-600">
                      <Image size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune photo ou lien</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.map(item => (
                        <div key={item.id} className="relative group rounded-xl overflow-hidden bg-gray-800 border border-gray-700 aspect-square">
                          {item.type === 'photo' && item.url ? (
                            <img src={item.url} alt={item.title || ''} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-3">
                              <Link2 size={24} className="text-purple-400 mb-2" />
                              <p className="text-xs text-center text-gray-400 truncate w-full">{item.title || item.url}</p>
                            </div>
                          )}
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all">
                            {item.title && <p className="text-xs text-white font-medium text-center px-2">{item.title}</p>}
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize
                              ${item.category === 'editorial' ? 'bg-yellow-500/20 text-yellow-400' :
                                item.category === 'beauty' ? 'bg-pink-500/20 text-pink-400' :
                                item.category === 'fashion' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-700 text-gray-400'}`}
                            >
                              {item.category}
                            </span>
                            <button onClick={() => deleteItem(item.id)} className="p-1.5 bg-red-600/80 rounded-lg hover:bg-red-500 transition-colors mt-1">
                              <Trash2 size={14} className="text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {!selectedProfile && !editingProfile && profiles.length === 0 && (
              <div className="text-center py-20 text-gray-600">
                <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-500">Cree un portfolio pour commencer</p>
                <button
                  onClick={openNewProfile}
                  className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Plus size={16} /> Nouveau portfolio
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
