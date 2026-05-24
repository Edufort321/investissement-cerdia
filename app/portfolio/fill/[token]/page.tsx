'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CircleCropModal from '@/components/ui/CircleCropModal'
import {
  Save, Upload, Plus, Trash2, Check, ExternalLink, Sparkles,
  Camera, Link2, User, ChevronLeft, ChevronRight, Eye,
  Instagram, ShoppingBag, Lock, Lightbulb, AlertCircle, Loader2
} from 'lucide-react'

interface Profile {
  id: string
  slug: string
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
  uda_number: string
  is_published: boolean
}

interface PortfolioItem {
  id: string
  type: string
  title: string
  url: string
  category: string
  sort_order: number
}

type Section = 'profil' | 'photos' | 'liens' | 'boutique'

const BIO_IDEAS = [
  "Passionnee de mode et de photographie, je collabore avec des marques locales depuis 3 ans.",
  "Modele commerciale specialisee en beaute et lifestyle. Disponible pour shootings et collaborations.",
  "Artiste polyvalente — modeling, acting, content creation. Je donne vie aux visions des createurs.",
  "Etudiante en arts visuels, je combine passion et professionnalisme dans chaque projet.",
]

const TAGLINE_IDEAS = [
  "Modele Commerciale & Lifestyle",
  "Artiste / Modele / Creatrice de contenu",
  "Actrice & Modele — Montreal",
  "Influenceuse & Ambassadrice de marques",
]

export default function PortfolioFillPage() {
  const { token } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [form, setForm] = useState<Partial<Profile>>({})
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('profil')
  const [carouselIdx, setCarouselIdx] = useState(0)
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { if (token) load(token as string) }, [token])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async (t: string) => {
    const { data, error } = await supabase
      .from('portfolio_profiles').select('*').eq('fill_token', t).single()
    if (error || !data) { setLoading(false); return }
    setProfile(data as Profile)
    setForm({
      name: data.name ?? '',
      tagline: data.tagline ?? '',
      bio: data.bio ?? '',
      contact_email: data.contact_email ?? '',
      phone: data.phone ?? '',
      instagram_url: data.instagram_url ?? '',
      tiktok_url: data.tiktok_url ?? '',
      location: data.location ?? '',
      uda_number: data.uda_number ?? '',
    })
    const { data: its } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', data.id).order('sort_order').order('created_at')
    setItems(its ?? [])
    setLoading(false)
  }

  // ── Save profile ────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!profile || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        name: form.name ?? '',
        tagline: form.tagline ?? '',
        bio: form.bio ?? '',
        contact_email: form.contact_email ?? '',
        phone: form.phone ?? '',
        instagram_url: form.instagram_url ?? '',
        tiktok_url: form.tiktok_url ?? '',
        location: form.location ?? '',
        uda_number: form.uda_number ?? '',
      }
      const { error } = await supabase
        .from('portfolio_profiles')
        .update(payload)
        .eq('fill_token', (profile as any).fill_token ?? '')
      if (error) {
        setSaveError(error.message)
        showToast('Erreur: ' + error.message, false)
      } else {
        setProfile(p => p ? { ...p, ...payload } : p)
        setSaved(true)
        showToast('Profil sauvegarde!')
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Erreur inconnue'
      setSaveError(msg)
      showToast('Erreur: ' + msg, false)
    } finally {
      setSaving(false)
    }
  }

  // ── Carousel ────────────────────────────────────────────────────────────
  const photos = items.filter(i => i.type === 'photo')
  const links = items.filter(i => i.type === 'link' || i.type === 'video')
  const carouselPhotos = photos.length > 0
    ? photos
    : profile?.cover_url
      ? [{ id: 'cover', url: profile.cover_url, type: 'photo', title: '', category: '', sort_order: 0 } as PortfolioItem]
      : []

  const advanceCarousel = useCallback(() => {
    setCarouselIdx(i => carouselPhotos.length > 0 ? (i + 1) % carouselPhotos.length : 0)
  }, [carouselPhotos.length])

  useEffect(() => {
    if (carouselPhotos.length <= 1) return
    carouselTimer.current = setInterval(advanceCarousel, 4000)
    return () => { if (carouselTimer.current) clearInterval(carouselTimer.current) }
  }, [carouselPhotos.length, advanceCarousel])

  const prevSlide = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current)
    setCarouselIdx(i => (i - 1 + carouselPhotos.length) % carouselPhotos.length)
    carouselTimer.current = setInterval(advanceCarousel, 4000)
  }
  const nextSlide = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current)
    setCarouselIdx(i => (i + 1) % carouselPhotos.length)
    carouselTimer.current = setInterval(advanceCarousel, 4000)
  }

  // ── Upload ───────────────────────────────────────────────────────────────
  const openHeadshotCrop = (file: File) => setCropSrc(URL.createObjectURL(file))

  const confirmHeadshotCrop = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    await uploadPhoto(new File([blob], `headshot-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'headshot_url')
  }

  const uploadPhoto = async (file: File, field: 'headshot_url' | 'cover_url') => {
    if (!profile) return
    setUploadProgress(field === 'headshot_url' ? 'Upload photo profil...' : 'Upload couverture...')
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/${field}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur upload: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    await supabase.from('portfolio_profiles').update({ [field]: publicUrl })
      .eq('fill_token', (profile as any).fill_token ?? '')
    setProfile(p => p ? { ...p, [field]: publicUrl } : p)
    setUploadProgress(null)
    showToast('Photo mise a jour!')
  }

  const uploadItemPhoto = async (file: File) => {
    if (!profile) return
    setUploadProgress('Upload photo...')
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    const { error } = await supabase.from('portfolio_items').insert([{
      profile_id: profile.id, type: 'photo', url: publicUrl,
      thumbnail_url: publicUrl, sort_order: maxOrder + 1, category: 'portfolio'
    }])
    setUploadProgress(null)
    if (error) { showToast('Erreur: ' + error.message, false); return }
    showToast('Photo ajoutee!')
    await load(token as string)
  }

  const addLink = async (url: string, title: string) => {
    if (!profile || !url) return
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    const { error } = await supabase.from('portfolio_items').insert([{
      profile_id: profile.id, type: 'link', url, title,
      sort_order: maxOrder + 1, category: 'portfolio'
    }])
    if (error) { showToast('Erreur: ' + error.message, false); return }
    showToast('Lien ajoute!')
    await load(token as string)
  }

  const deleteItem = async (id: string) => {
    await supabase.from('portfolio_items').delete().eq('id', id)
    setItems(its => its.filter(i => i.id !== id))
    showToast('Supprime')
  }

  // ── Loading / error screens ─────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-5xl mb-4">✦</p>
        <h1 className="text-2xl font-bold text-white mb-2">Lien invalide</h1>
        <p className="text-gray-500">Ce lien de remplissage n&apos;est pas valide ou a expire.</p>
      </div>
    </div>
  )

  const publicUrl = `/portfolio/${profile.slug}`

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-32">

      {/* ── Crop modal ── */}
      {cropSrc && (
        <CircleCropModal
          src={cropSrc}
          onConfirm={confirmHeadshotCrop}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium flex items-center gap-2
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-gray-800/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={12} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{profile.name || 'Mon Portfolio'}</p>
            {profile.tagline && <p className="text-pink-400/70 text-xs mt-0.5 truncate max-w-[160px]">{profile.tagline}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadProgress && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> {uploadProgress}
            </span>
          )}
          {profile.is_published && (
            <a href={publicUrl} target="_blank"
              className="flex items-center gap-1 text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-emerald-600/30">
              <Eye size={11} /> Voir
            </a>
          )}
        </div>
      </div>

      {/* ── HERO PREVIEW CAROUSEL ── */}
      <div className="relative h-52 bg-gray-900 overflow-hidden">
        {carouselPhotos.length > 0 ? (
          <>
            {carouselPhotos.map((p, idx) => (
              <img key={p.id} src={p.url} alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000
                  ${idx === carouselIdx ? 'opacity-80' : 'opacity-0'}`} />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/30" />
            {carouselPhotos.length > 1 && (
              <>
                <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/70 hover:text-white transition-colors z-10">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/70 hover:text-white transition-colors z-10">
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {carouselPhotos.map((_, idx) => (
                    <button key={idx} onClick={() => setCarouselIdx(idx)}
                      className={`h-1 rounded-full transition-all ${idx === carouselIdx ? 'bg-pink-400 w-5' : 'bg-white/30 w-1.5'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-950 to-black flex items-center justify-center">
            <div className="text-center opacity-30">
              <Camera size={36} className="mx-auto mb-2" />
              <p className="text-xs">Ajoute des photos pour voir l&apos;apercu</p>
            </div>
          </div>
        )}

        {/* Headshot + name overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end gap-3 z-10">
          <div className="w-14 h-14 rounded-full ring-2 ring-pink-400/50 ring-offset-2 ring-offset-transparent overflow-hidden flex-shrink-0 bg-gray-800 cursor-pointer"
               onClick={() => document.getElementById('headshot-input')?.click()}>
            {profile.headshot_url
              ? <img src={profile.headshot_url} alt={profile.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20">
                  <Camera size={18} className="text-pink-400/50" />
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight drop-shadow-lg truncate"
               style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
              {profile.name}
            </p>
            {profile.tagline && (
              <p className="text-pink-300 text-xs tracking-wide truncate"
                 style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {profile.tagline}
              </p>
            )}
          </div>
          <input id="headshot-input" type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) openHeadshotCrop(e.target.files[0]); e.target.value = '' }} />
        </div>
      </div>

      {/* ── SECTION TABS ── */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-2 sticky top-[57px] z-20">
        <div className="flex">
          {([
            { key: 'profil',   label: 'Profil',   icon: User },
            { key: 'photos',   label: `Photos${photos.length > 0 ? ` (${photos.length})` : ''}`, icon: Camera },
            { key: 'liens',    label: `Liens${links.length > 0 ? ` (${links.length})` : ''}`, icon: Link2 },
            { key: 'boutique', label: 'Boutique', icon: ShoppingBag },
          ] as { key: Section; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors flex-1 justify-center
                ${activeSection === key
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── PROFIL ── */}
        {activeSection === 'profil' && (
          <div className="space-y-5">

            {/* Photo section */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Photos du profil</p>
              <div className="flex gap-3">
                {/* Headshot */}
                <label className="flex-1 cursor-pointer group">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 group-hover:border-pink-500 transition-colors">
                    {profile.headshot_url
                      ? <img src={profile.headshot_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <User size={28} className="text-gray-600" />
                          <span className="text-xs text-gray-600">Photo profil</span>
                        </div>
                    }
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Camera size={20} className="text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-1">Photo profil</p>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) openHeadshotCrop(e.target.files[0]); e.target.value = '' }} />
                </label>
                {/* Cover */}
                <label className="flex-[2] cursor-pointer group">
                  <div className="relative rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 group-hover:border-purple-500 transition-colors" style={{ aspectRatio: '2/1' }}>
                    {profile.cover_url
                      ? <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <Upload size={24} className="text-gray-600" />
                          <span className="text-xs text-gray-600">Photo de couverture</span>
                        </div>
                    }
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Upload size={20} className="text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-1">Couverture (fond du carousel)</p>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) uploadPhoto(e.target.files[0], 'cover_url'); e.target.value = '' }} />
                </label>
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Informations</p>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Nom complet *</label>
                <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Sofia Dufort"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Titre / Specialite</label>
                <input value={form.tagline ?? ''} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                  placeholder="Ex: Modele Commerciale & Lifestyle"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TAGLINE_IDEAS.slice(0, 2).map(idea => (
                    <button key={idea} type="button"
                      onClick={() => setForm(f => ({ ...f, tagline: idea }))}
                      className="text-xs bg-pink-500/10 text-pink-400/80 border border-pink-500/20 px-2 py-1 rounded-full hover:bg-pink-500/20 transition-colors flex items-center gap-1">
                      <Lightbulb size={10} /> {idea}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Ville</label>
                <input value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ex: Montreal, QC"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">Email</label>
                  <input type="email" value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    placeholder="ton@email.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">Telephone</label>
                  <input type="tel" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 514..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Instagram URL</label>
                <div className="relative">
                  <Instagram size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/60" />
                  <input value={form.instagram_url ?? ''} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                    placeholder="https://instagram.com/toncompte"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">TikTok URL</label>
                <input value={form.tiktok_url ?? ''} onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))}
                  placeholder="https://tiktok.com/@toncompte"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">Numero UDA <span className="text-gray-600 font-normal">(Union des Artistes)</span></label>
                <input value={(form as any).uda_number ?? ''} onChange={e => setForm(f => ({ ...f, uda_number: e.target.value }))}
                  placeholder="Ex: 12345"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>
            </div>

            {/* Bio */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Biographie</p>
                <span className="text-xs text-gray-600">{(form.bio ?? '').length}/500</span>
              </div>
              <textarea
                value={form.bio ?? ''}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 500) }))}
                rows={5}
                placeholder="Parle de toi — ta passion, ton experience, ce qui te rend unique..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none leading-relaxed"
              />
              <div>
                <p className="text-xs text-gray-600 mb-2 flex items-center gap-1"><Lightbulb size={11} className="text-pink-400/60" /> Idees de presentation :</p>
                <div className="space-y-1.5">
                  {BIO_IDEAS.map(idea => (
                    <button key={idea} type="button"
                      onClick={() => setForm(f => ({ ...f, bio: idea }))}
                      className="w-full text-left text-xs bg-gray-800/60 text-gray-400 border border-gray-700/50 px-3 py-2 rounded-lg hover:border-pink-500/40 hover:text-pink-300 transition-colors">
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {saveError}
              </div>
            )}
          </div>
        )}

        {/* ── PHOTOS ── */}
        {activeSection === 'photos' && (
          <div className="space-y-5">

            {/* Upload buttons */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center gap-2.5 cursor-pointer border-2 border-dashed border-gray-700 hover:border-pink-500 rounded-2xl py-8 text-center transition-colors group">
                <div className="w-12 h-12 rounded-full bg-pink-600/10 group-hover:bg-pink-600/20 flex items-center justify-center transition-colors">
                  <Upload size={20} className="text-pink-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Galerie</p>
                  <p className="text-gray-600 text-xs mt-0.5">Choisir depuis l&apos;album</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => {
                    Array.from(e.target.files ?? []).forEach(f => uploadItemPhoto(f))
                    ;(e.target as HTMLInputElement).value = ''
                  }} />
              </label>

              <label className="flex flex-col items-center gap-2.5 cursor-pointer border-2 border-dashed border-purple-800/50 hover:border-purple-500 rounded-2xl py-8 text-center transition-colors group">
                <div className="w-12 h-12 rounded-full bg-purple-600/10 group-hover:bg-purple-600/20 flex items-center justify-center transition-colors">
                  <Camera size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Appareil photo</p>
                  <p className="text-gray-600 text-xs mt-0.5">Prendre une photo</p>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) uploadItemPhoto(e.target.files[0])
                    ;(e.target as HTMLInputElement).value = ''
                  }} />
              </label>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Camera size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-500">Aucune photo encore</p>
                <p className="text-xs mt-1">Uploade tes meilleures photos pour impressionner les agences</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(p => (
                  <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-800">
                    <img src={p.url} alt={p.title ?? ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <button onClick={() => deleteItem(p.id)}
                        className="p-2 bg-red-600/80 rounded-lg hover:bg-red-500 transition-colors">
                        <Trash2 size={15} className="text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LIENS ── */}
        {activeSection === 'liens' && (
          <LinkSection links={links} onAdd={addLink} onDelete={deleteItem} />
        )}

        {/* ── BOUTIQUE (coming soon) ── */}
        {activeSection === 'boutique' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-950 to-gray-900 rounded-2xl border border-purple-800/30 p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={24} className="text-purple-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}>Boutique & Monetisation</h2>
              <p className="text-purple-300/70 text-sm mb-4">Transforme ton portfolio en source de revenus</p>
              <span className="inline-flex items-center gap-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-medium">
                <Lock size={11} /> Bientot disponible
              </span>
            </div>

            {[
              { icon: '📦', title: 'Produits & Merch', desc: 'Vends tes prints, posters, collaborations de marques directement depuis ton portfolio.' },
              { icon: '📅', title: 'Reservations & Shootings', desc: 'Les agences et photographes peuvent reserver ton temps directement en ligne.' },
              { icon: '💌', title: 'Demandes de collaboration', desc: 'Formulaire personnalise pour que les marques te contactent avec leurs offres.' },
              { icon: '📊', title: 'Statistiques & Visites', desc: 'Vois combien d\'agences ont consulte ton portfolio et quelles photos sont les plus vues.' },
              { icon: '🌟', title: 'Portfolio Pro', desc: 'Domaine personnalise, portfolio sans publicite, badge verifie pour les agences.' },
            ].map(item => (
              <div key={item.title} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-start gap-3 opacity-60">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
                <Lock size={14} className="text-gray-700 flex-shrink-0 mt-0.5" />
              </div>
            ))}

            <p className="text-xs text-gray-700 text-center pt-2">
              Tu seras notifiee en premier quand ces fonctionnalites seront disponibles.
            </p>
          </div>
        )}
      </div>

      {/* ── FIXED SAVE BAR ── */}
      {activeSection !== 'boutique' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-gray-800/60 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {profile.slug && (
              <a href={publicUrl} target="_blank"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-2.5 rounded-xl transition-colors flex-shrink-0">
                <ExternalLink size={13} /> Apercu
              </a>
            )}
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all
                bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Sauvegarde en cours...</>
                : saved
                  ? <><Check size={16} /> Sauvegarde!</>
                  : <><Save size={16} /> Sauvegarder mon profil</>
              }
            </button>
          </div>
        </div>
      )}

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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">Ajouter un lien</p>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Nom du projet ou lien</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Shooting Vogue, Instagram, YouTube..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">URL</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
        </div>
        <button
          onClick={() => { if (url) { onAdd(url, title); setUrl(''); setTitle('') } }}
          disabled={!url}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> Ajouter ce lien
        </button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <Link2 size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm text-gray-500 font-medium">Aucun lien encore</p>
          <p className="text-xs mt-1">Instagram, YouTube, TikTok, site web...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Link2 size={14} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{link.title || link.url}</p>
                <p className="text-gray-600 text-xs truncate">{link.url}</p>
              </div>
              <button onClick={() => onDelete(link.id)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
