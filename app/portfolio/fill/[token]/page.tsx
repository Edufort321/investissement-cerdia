'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CircleCropModal from '@/components/ui/CircleCropModal'
import { getTheme, THEME_LABELS, GENDER_LABELS, AGE_CLASS_LABELS, defaultThemeForGender } from '@/lib/portfolioTheme'
import {
  Save, Upload, Plus, Trash2, Check, ExternalLink, Sparkles,
  Camera, Link2, User, ChevronLeft, ChevronRight, Eye,
  Instagram, ShoppingBag, Lock, Lightbulb, AlertCircle, Loader2, X, Crop, Palette, Play
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
  fill_token: string
  gender: string
  age_class: string
  theme: string
  theme_primary: string
  theme_accent: string
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
type Lang = 'fr' | 'en'

const T = {
  fr: {
    loading: 'Chargement...', invalid_link: 'Lien invalide',
    invalid_desc: "Ce lien de remplissage n'est pas valide ou a expire.",
    profile: 'Profil', photos: 'Photos', links: 'Liens', shop: 'Boutique',
    photos_section: 'Photos du profil', profile_photo: 'Photo profil',
    cover: 'Couverture', cover_desc: 'Couverture (fond du carousel)',
    info: 'Informations', full_name: 'Nom complet *', title_spec: 'Titre / Specialite',
    city: 'Ville', email: 'Email', phone: 'Telephone',
    ig_url: 'Instagram URL', tt_url: 'TikTok URL',
    uda: 'Numero UDA', uda_desc: '(Union des Artistes)',
    bio_label: 'Biographie', bio_ideas: 'Idees de presentation :',
    save: 'Sauvegarder mon profil', saving: 'Sauvegarde...', saved: 'Sauvegarde!',
    preview: 'Apercu', gallery: 'Galerie', camera_btn: 'Appareil photo',
    gallery_desc: "Choisir depuis l'album", camera_desc: 'Prendre une photo',
    no_photos: 'Aucune photo encore', no_photos_desc: 'Uploade tes meilleures photos pour impressionner les agences',
    add_link: 'Ajouter un lien', link_name: 'Nom du projet ou lien', link_url: 'URL',
    add: 'Ajouter', delete: 'Supprimer', expand: 'Agrandir', crop: 'Recadrer',
    shop_title: 'Boutique & Monetisation', shop_desc: 'Transforme ton portfolio en source de revenus',
    coming_soon: 'Bientot disponible', view: 'Voir',
    tagline_hint: 'Idees :', suggestions: 'Suggestions :',
    profile_saved: 'Profil sauvegarde!', photo_updated: 'Photo mise a jour!',
    photo_added: 'Photo ajoutee!', link_added: 'Lien ajoute!', deleted: 'Supprime',
    err_upload: 'Erreur upload: ', err_unknown: 'Erreur inconnue', err_prefix: 'Erreur: ',
    upload_cover: 'Upload couverture...', upload_headshot: 'Upload photo profil...',
    upload_photo: 'Upload photo...', cropping: 'Recadrage...',
    name_ph: 'Ex: Sofia Dufort', tagline_ph: 'Ex: Modele Commerciale & Lifestyle',
    city_ph: 'Ex: Montreal, QC', email_ph: 'ton@email.com', phone_ph: '+1 514...',
    ig_ph: 'https://instagram.com/toncompte', tt_ph: 'https://tiktok.com/@toncompte', uda_ph: 'Ex: 12345',
    bio_ph: 'Parle de toi — ta passion, ton experience, ce qui te rend unique...',
    link_name_ph: 'Ex: Shooting Vogue, Instagram, YouTube...', link_url_ph: 'https://...',
  },
  en: {
    loading: 'Loading...', invalid_link: 'Invalid link',
    invalid_desc: 'This fill link is not valid or has expired.',
    profile: 'Profile', photos: 'Photos', links: 'Links', shop: 'Shop',
    photos_section: 'Profile photos', profile_photo: 'Profile photo',
    cover: 'Cover', cover_desc: 'Cover (carousel background)',
    info: 'Information', full_name: 'Full name *', title_spec: 'Title / Specialty',
    city: 'City', email: 'Email', phone: 'Phone',
    ig_url: 'Instagram URL', tt_url: 'TikTok URL',
    uda: 'UDA Number', uda_desc: '(Union des Artistes)',
    bio_label: 'Biography', bio_ideas: 'Presentation ideas:',
    save: 'Save my profile', saving: 'Saving...', saved: 'Saved!',
    preview: 'Preview', gallery: 'Gallery', camera_btn: 'Camera',
    gallery_desc: 'Choose from album', camera_desc: 'Take a photo',
    no_photos: 'No photos yet', no_photos_desc: 'Upload your best photos to impress agencies',
    add_link: 'Add a link', link_name: 'Project name or link', link_url: 'URL',
    add: 'Add', delete: 'Delete', expand: 'Expand', crop: 'Crop',
    shop_title: 'Shop & Monetization', shop_desc: 'Turn your portfolio into a revenue source',
    coming_soon: 'Coming soon', view: 'View',
    tagline_hint: 'Ideas:', suggestions: 'Suggestions:',
    profile_saved: 'Profile saved!', photo_updated: 'Photo updated!',
    photo_added: 'Photo added!', link_added: 'Link added!', deleted: 'Deleted',
    err_upload: 'Upload error: ', err_unknown: 'Unknown error', err_prefix: 'Error: ',
    upload_cover: 'Uploading cover...', upload_headshot: 'Uploading profile photo...',
    upload_photo: 'Uploading photo...', cropping: 'Cropping...',
    name_ph: 'e.g. Sofia Dufort', tagline_ph: 'e.g. Commercial & Lifestyle Model',
    city_ph: 'e.g. Montreal, QC', email_ph: 'your@email.com', phone_ph: '+1 514...',
    ig_ph: 'https://instagram.com/yourhandle', tt_ph: 'https://tiktok.com/@yourhandle', uda_ph: 'e.g. 12345',
    bio_ph: 'Tell your story — your passion, experience, what makes you unique...',
    link_name_ph: 'e.g. Vogue Shoot, Instagram, YouTube...', link_url_ph: 'https://...',
  }
}

const BIO_IDEAS = {
  fr: [
    "Passionnee de mode et de photographie, je collabore avec des marques locales depuis 3 ans.",
    "Modele commerciale specialisee en beaute et lifestyle. Disponible pour shootings et collaborations.",
    "Artiste polyvalente — modeling, acting, content creation. Je donne vie aux visions des createurs.",
    "Etudiante en arts visuels, je combine passion et professionnalisme dans chaque projet.",
  ],
  en: [
    "Fashion and photography enthusiast collaborating with local brands for over 3 years.",
    "Commercial model specialized in beauty and lifestyle. Available for shootings and brand collaborations.",
    "Versatile artist — modeling, acting, content creation. I bring creative visions to life.",
    "Visual arts student combining passion and professionalism in every project.",
  ]
}

const TAGLINE_IDEAS = {
  fr: ["Modele Commerciale & Lifestyle", "Artiste / Modele / Creatrice de contenu"],
  en: ["Commercial & Lifestyle Model", "Artist / Model / Content Creator"],
}

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
  const [cropSrc, setCropSrc]             = useState<string | null>(null)
  const [coverCropSrc, setCoverCropSrc]   = useState<string | null>(null)
  const [photoCropUrl, setPhotoCropUrl]   = useState<string | null>(null)
  const [photoCropId, setPhotoCropId]     = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx]     = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('profil')
  const [lang, setLang]                   = useState<Lang>('fr')
  const [carouselIdx, setCarouselIdx]     = useState(0)
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const t = T[lang]

  useEffect(() => { if (token) load(token as string) }, [token])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async (tk: string) => {
    const { data, error } = await supabase
      .from('portfolio_profiles').select('*').eq('fill_token', tk).single()
    if (error || !data) { setLoading(false); return }
    setProfile(data as Profile)
    setForm({
      name: data.name ?? '', tagline: data.tagline ?? '', bio: data.bio ?? '',
      contact_email: data.contact_email ?? '', phone: data.phone ?? '',
      instagram_url: data.instagram_url ?? '', tiktok_url: data.tiktok_url ?? '',
      location: data.location ?? '', uda_number: data.uda_number ?? '',
      gender: data.gender ?? '', age_class: data.age_class ?? '',
      theme: data.theme ?? defaultThemeForGender(data.gender),
      theme_primary: data.theme_primary ?? '', theme_accent: data.theme_accent ?? '',
    })
    const { data: its } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', data.id).order('sort_order').order('created_at')
    setItems(its ?? [])
    setLoading(false)
  }

  const saveProfile = async () => {
    if (!profile || saving) return
    setSaving(true); setSaveError(null)
    try {
      const payload = {
        name: form.name ?? '', tagline: form.tagline ?? '', bio: form.bio ?? '',
        contact_email: form.contact_email ?? '', phone: form.phone ?? '',
        instagram_url: form.instagram_url ?? '', tiktok_url: form.tiktok_url ?? '',
        location: form.location ?? '', uda_number: form.uda_number ?? '',
        gender: (form as any).gender ?? '', age_class: (form as any).age_class ?? '',
        theme: (form as any).theme ?? 'rose',
        theme_primary: (form as any).theme_primary ?? '',
        theme_accent: (form as any).theme_accent ?? '',
      }
      const { error } = await supabase.from('portfolio_profiles').update(payload)
        .eq('fill_token', profile.fill_token ?? '')
      if (error) {
        setSaveError(error.message)
        showToast(t.err_prefix + error.message, false)
      } else {
        setProfile(p => p ? { ...p, ...payload } : p)
        setSaved(true); showToast(t.profile_saved)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e: any) {
      const msg = e?.message ?? t.err_unknown
      setSaveError(msg); showToast(t.err_prefix + msg, false)
    } finally { setSaving(false) }
  }

  const photos = items.filter(i => i.type === 'photo')
  const videos = items.filter(i => i.type === 'video')
  const links  = items.filter(i => i.type === 'link')
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

  // ── Uploads ──────────────────────────────────────────────────────────────
  const openHeadshotCrop = (file: File) => setCropSrc(URL.createObjectURL(file))
  const openCoverCrop    = (file: File) => setCoverCropSrc(URL.createObjectURL(file))

  const confirmHeadshotCrop = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    await uploadPhoto(new File([blob], `headshot-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'headshot_url')
  }

  const confirmCoverCrop = async (blob: Blob) => {
    if (coverCropSrc) URL.revokeObjectURL(coverCropSrc)
    setCoverCropSrc(null)
    await uploadPhoto(new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'cover_url')
  }

  const uploadPhoto = async (file: File, field: 'headshot_url' | 'cover_url') => {
    if (!profile) return
    setUploadProgress(field === 'headshot_url' ? t.upload_headshot : t.upload_cover)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/${field}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast(t.err_upload + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    await supabase.from('portfolio_profiles').update({ [field]: publicUrl })
      .eq('fill_token', profile.fill_token ?? '')
    setProfile(p => p ? { ...p, [field]: publicUrl } : p)
    setUploadProgress(null)
    showToast(t.photo_updated)
  }

  const uploadItemPhoto = async (file: File) => {
    if (!profile) return
    const isVideo = file.type.startsWith('video/')
    setUploadProgress(isVideo ? (lang === 'fr' ? 'Upload video...' : 'Uploading video...') : t.upload_photo)
    const ext  = file.name.split('.').pop() ?? (isVideo ? 'mp4' : 'jpg')
    const path = `${profile.id}/items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast(t.err_upload + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    const { error } = await supabase.from('portfolio_items').insert([{
      profile_id: profile.id,
      type: isVideo ? 'video' : 'photo',
      url: publicUrl,
      thumbnail_url: isVideo ? '' : publicUrl,
      sort_order: maxOrder + 1, category: 'portfolio'
    }])
    setUploadProgress(null)
    if (error) { showToast(t.err_prefix + error.message, false); return }
    showToast(isVideo ? (lang === 'fr' ? 'Video ajoutee!' : 'Video added!') : t.photo_added)
    await load(token as string)
  }

  // ── Photo crop from existing URL ─────────────────────────────────────────
  const openPhotoCrop = (item: PortfolioItem) => {
    setLightboxIdx(null)
    setPhotoCropUrl(item.url)
    setPhotoCropId(item.id)
  }

  const confirmPhotoCrop = async (blob: Blob) => {
    if (!profile || !photoCropId) return
    setPhotoCropUrl(null)
    setUploadProgress(t.cropping)
    const path = `${profile.id}/items/${Date.now()}-crop.jpg`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) { showToast(t.err_upload + upErr.message, false); setUploadProgress(null); setPhotoCropId(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    await supabase.from('portfolio_items').update({ url: publicUrl, thumbnail_url: publicUrl }).eq('id', photoCropId)
    setPhotoCropId(null)
    setUploadProgress(null)
    showToast(t.photo_updated)
    await load(token as string)
  }

  const deleteItem = async (id: string) => {
    await supabase.from('portfolio_items').delete().eq('id', id)
    setItems(its => its.filter(i => i.id !== id))
    setLightboxIdx(null)
    showToast(t.deleted)
  }

  const addLink = async (url: string, title: string) => {
    if (!profile || !url) return
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    const { error } = await supabase.from('portfolio_items').insert([{
      profile_id: profile.id, type: 'link', url, title,
      sort_order: maxOrder + 1, category: 'portfolio'
    }])
    if (error) { showToast(t.err_prefix + error.message, false); return }
    showToast(t.link_added)
    await load(token as string)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">{t.loading}</p>
      </div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-5xl mb-4">✦</p>
        <h1 className="text-2xl font-bold text-white mb-2">{t.invalid_link}</h1>
        <p className="text-gray-500">{t.invalid_desc}</p>
      </div>
    </div>
  )

  const publicUrl = `/portfolio/${profile.slug}`

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-32">

      {/* ── Modals ── */}
      {cropSrc && (
        <CircleCropModal src={cropSrc} shape="circle"
          onConfirm={confirmHeadshotCrop}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null) }} />
      )}
      {coverCropSrc && (
        <CircleCropModal src={coverCropSrc} shape="banner"
          onConfirm={confirmCoverCrop}
          onCancel={() => { URL.revokeObjectURL(coverCropSrc); setCoverCropSrc(null) }} />
      )}
      {photoCropUrl && (
        <CircleCropModal src={photoCropUrl} shape="square"
          onConfirm={confirmPhotoCrop}
          onCancel={() => { setPhotoCropUrl(null); setPhotoCropId(null) }} />
      )}

      {/* ── Photo lightbox ── */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white/40 text-xs">{lightboxIdx + 1} / {photos.length}</span>
            <button onClick={() => setLightboxIdx(null)} className="text-white/60 hover:text-white">
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {lightboxIdx > 0 && (
              <button onClick={() => setLightboxIdx(i => i! - 1)}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/60 hover:text-white">
                <ChevronLeft size={22} />
              </button>
            )}
            <img src={photos[lightboxIdx].url} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
            {lightboxIdx < photos.length - 1 && (
              <button onClick={() => setLightboxIdx(i => i! + 1)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/60 hover:text-white">
                <ChevronRight size={22} />
              </button>
            )}
          </div>
          <div className="flex gap-3 px-4 pb-6 justify-center">
            <button
              onClick={() => openPhotoCrop(photos[lightboxIdx!])}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-sm font-medium transition-all">
              <Crop size={15} /> {t.crop}
            </button>
            <button
              onClick={() => deleteItem(photos[lightboxIdx!].id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 rounded-xl text-sm font-medium transition-all">
              <Trash2 size={15} /> {t.delete}
            </button>
          </div>
        </div>
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
            {profile.tagline && <p className="text-pink-400/70 text-xs mt-0.5 truncate max-w-[140px]">{profile.tagline}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Lang toggle */}
          <button
            onClick={() => setLang(l => l === 'fr' ? 'en' : 'fr')}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          {uploadProgress && (
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> {uploadProgress}
            </span>
          )}
          {profile.is_published && (
            <a href={publicUrl} target="_blank"
              className="flex items-center gap-1 text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-600/30">
              <Eye size={11} /> {t.view}
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
                <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/70 hover:text-white z-10">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 rounded-full text-white/70 hover:text-white z-10">
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
              <p className="text-xs">{lang === 'fr' ? "Ajoute des photos pour voir l'apercu" : 'Add photos to see the preview'}</p>
            </div>
          </div>
        )}
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
            { key: 'profil',   label: t.profile,   icon: User },
            { key: 'photos',   label: `${t.photos}${photos.length > 0 ? ` (${photos.length})` : ''}`, icon: Camera },
            { key: 'liens',    label: `${t.links}${links.length > 0 ? ` (${links.length})` : ''}`, icon: Link2 },
            { key: 'boutique', label: t.shop,       icon: ShoppingBag },
          ] as { key: Section; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors flex-1 justify-center
                ${activeSection === key ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
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
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">{t.photos_section}</p>
              <div className="flex gap-3">
                {/* Headshot */}
                <label className="flex-1 cursor-pointer group">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 group-hover:border-pink-500 transition-colors">
                    {profile.headshot_url
                      ? <img src={profile.headshot_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <User size={28} className="text-gray-600" />
                          <span className="text-xs text-gray-600">{t.profile_photo}</span>
                        </div>
                    }
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Camera size={20} className="text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-1">{t.profile_photo}</p>
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
                          <span className="text-xs text-gray-600">{t.cover}</span>
                        </div>
                    }
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <Crop size={20} className="text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-1">{t.cover_desc}</p>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) openCoverCrop(e.target.files[0]); e.target.value = '' }} />
                </label>
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest">{t.info}</p>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.full_name}</label>
                <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t.name_ph}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.title_spec}</label>
                <input value={form.tagline ?? ''} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                  placeholder={t.tagline_ph}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TAGLINE_IDEAS[lang].map(idea => (
                    <button key={idea} type="button" onClick={() => setForm(f => ({ ...f, tagline: idea }))}
                      className="text-xs bg-pink-500/10 text-pink-400/80 border border-pink-500/20 px-2 py-1 rounded-full hover:bg-pink-500/20 transition-colors flex items-center gap-1">
                      <Lightbulb size={10} /> {idea}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.city}</label>
                <input value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={t.city_ph}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.email}</label>
                  <input type="email" value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    placeholder={t.email_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.phone}</label>
                  <input type="tel" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder={t.phone_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.ig_url}</label>
                <div className="relative">
                  <Instagram size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/60" />
                  <input value={form.instagram_url ?? ''} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                    placeholder={t.ig_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">{t.tt_url}</label>
                <input value={form.tiktok_url ?? ''} onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))}
                  placeholder={t.tt_ph}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                  {t.uda} <span className="text-gray-600 font-normal">{t.uda_desc}</span>
                </label>
                <input value={(form as any).uda_number ?? ''} onChange={e => setForm(f => ({ ...f, uda_number: e.target.value }))}
                  placeholder={t.uda_ph}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
              </div>
            </div>

            {/* Genre / Classe d'age / Theme */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-medium flex items-center gap-1.5">
                <Palette size={11} /> {lang === 'fr' ? 'Identite & Apparence' : 'Identity & Appearance'}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                    {lang === 'fr' ? 'Genre' : 'Gender'}
                  </label>
                  <select value={(form as any).gender ?? ''}
                    onChange={e => {
                      const g = e.target.value
                      setForm(f => ({ ...f, gender: g, theme: (f as any).theme || defaultThemeForGender(g) }))
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors">
                    <option value="">--</option>
                    {Object.entries(GENDER_LABELS).map(([v, lb]) => (
                      <option key={v} value={v}>{lb[lang]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium">
                    {lang === 'fr' ? "Classe d'age" : 'Age class'}
                  </label>
                  <select value={(form as any).age_class ?? ''}
                    onChange={e => setForm(f => ({ ...f, age_class: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors">
                    <option value="">--</option>
                    {Object.entries(AGE_CLASS_LABELS).map(([v, lb]) => (
                      <option key={v} value={v}>{lb[lang]} ({lb.range})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Theme color picker */}
              <div>
                <label className="text-xs text-gray-400 mb-2 block font-medium">
                  {lang === 'fr' ? 'Couleur du portfolio' : 'Portfolio color'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(THEME_LABELS).filter(([k]) => k !== 'custom').map(([key, lb]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, theme: key }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${(form as any).theme === key ? 'text-white border-white/30 bg-white/10' : 'text-gray-400 border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: lb.preview }} />
                      {lb[lang]}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, theme: 'custom' }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${(form as any).theme === 'custom' ? 'text-white border-white/30 bg-white/10' : 'text-gray-400 border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
                    <Palette size={11} /> {lang === 'fr' ? 'Personnalise' : 'Custom'}
                  </button>
                </div>

                {/* Custom color pickers */}
                {(form as any).theme === 'custom' && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {lang === 'fr' ? 'Couleur principale' : 'Primary color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={(form as any).theme_primary || '#ec4899'}
                          onChange={e => setForm(f => ({ ...f, theme_primary: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5" />
                        <input type="text" value={(form as any).theme_primary || ''}
                          onChange={e => setForm(f => ({ ...f, theme_primary: e.target.value }))}
                          placeholder="#ec4899"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {lang === 'fr' ? 'Couleur accent' : 'Accent color'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={(form as any).theme_accent || '#a855f7'}
                          onChange={e => setForm(f => ({ ...f, theme_accent: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5" />
                        <input type="text" value={(form as any).theme_accent || ''}
                          onChange={e => setForm(f => ({ ...f, theme_accent: e.target.value }))}
                          placeholder="#a855f7"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">{t.bio_label}</p>
                <span className="text-xs text-gray-600">{(form.bio ?? '').length}/500</span>
              </div>
              <textarea
                value={form.bio ?? ''}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value.slice(0, 500) }))}
                rows={5} placeholder={t.bio_ph}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none leading-relaxed"
              />
              <div>
                <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                  <Lightbulb size={11} className="text-pink-400/60" /> {t.bio_ideas}
                </p>
                <div className="space-y-1.5">
                  {BIO_IDEAS[lang].map(idea => (
                    <button key={idea} type="button" onClick={() => setForm(f => ({ ...f, bio: idea }))}
                      className="w-full text-left text-xs bg-gray-800/60 text-gray-400 border border-gray-700/50 px-3 py-2 rounded-lg hover:border-pink-500/40 hover:text-pink-300 transition-colors">
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
            {/* Upload buttons: 3 columns — galerie, camera, video */}
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-gray-700 hover:border-pink-500 rounded-2xl py-6 text-center transition-colors group">
                <div className="w-10 h-10 rounded-full bg-pink-600/10 group-hover:bg-pink-600/20 flex items-center justify-center transition-colors">
                  <Upload size={18} className="text-pink-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{t.gallery}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 leading-tight">{t.gallery_desc}</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => {
                    Array.from(e.target.files ?? []).forEach(f => uploadItemPhoto(f))
                    ;(e.target as HTMLInputElement).value = ''
                  }} />
              </label>

              <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-purple-800/50 hover:border-purple-500 rounded-2xl py-6 text-center transition-colors group">
                <div className="w-10 h-10 rounded-full bg-purple-600/10 group-hover:bg-purple-600/20 flex items-center justify-center transition-colors">
                  <Camera size={18} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{t.camera_btn}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 leading-tight">{t.camera_desc}</p>
                </div>
                <input type="file" accept="image/*,video/*" capture="environment" className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) uploadItemPhoto(e.target.files[0])
                    ;(e.target as HTMLInputElement).value = ''
                  }} />
              </label>

              <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-blue-800/50 hover:border-blue-500 rounded-2xl py-6 text-center transition-colors group">
                <div className="w-10 h-10 rounded-full bg-blue-600/10 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors">
                  <Play size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{lang === 'fr' ? 'Video' : 'Video'}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 leading-tight">{lang === 'fr' ? 'MP4, MOV (100MB)' : 'MP4, MOV (100MB)'}</p>
                </div>
                <input type="file" accept="video/*" className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) uploadItemPhoto(e.target.files[0])
                    ;(e.target as HTMLInputElement).value = ''
                  }} />
              </label>
            </div>

            {photos.length === 0 && videos.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Camera size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-gray-500">{t.no_photos}</p>
                <p className="text-xs mt-1">{t.no_photos_desc}</p>
              </div>
            ) : (
              <>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, idx) => (
                      <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-800 cursor-pointer"
                           onClick={() => setLightboxIdx(idx)}>
                        <img src={p.url} alt={p.title ?? ''} className="w-full h-full object-cover"
                          style={{ imageRendering: 'auto' }} />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-active:opacity-100 flex items-center justify-center gap-2 transition-all">
                          <div className="p-2 bg-white/10 rounded-lg">
                            <ExternalLink size={14} className="text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {videos.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 uppercase tracking-widest">{lang === 'fr' ? 'Videos' : 'Videos'} ({videos.length})</p>
                    {videos.map(v => (
                      <div key={v.id} className="relative rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                        <video controls preload="metadata" className="w-full max-h-48">
                          <source src={v.url} />
                        </video>
                        <button onClick={() => deleteItem(v.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-600/70 hover:bg-red-500 rounded-lg transition-colors">
                          <Trash2 size={13} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── LIENS ── */}
        {activeSection === 'liens' && (
          <LinkSection links={links} onAdd={addLink} onDelete={deleteItem} t={t} />
        )}

        {/* ── BOUTIQUE ── */}
        {activeSection === 'boutique' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-purple-950 to-gray-900 rounded-2xl border border-purple-800/30 p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag size={24} className="text-purple-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t.shop_title}</h2>
              <p className="text-purple-300/70 text-sm mb-4">{t.shop_desc}</p>
              <span className="inline-flex items-center gap-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-medium">
                <Lock size={11} /> {t.coming_soon}
              </span>
            </div>
            {[
              { icon: '📦', fr: 'Produits & Merch', en: 'Products & Merch', dfr: 'Vends tes prints, posters, collaborations de marques directement depuis ton portfolio.', den: 'Sell your prints, posters, brand collaborations directly from your portfolio.' },
              { icon: '📅', fr: 'Reservations & Shootings', en: 'Bookings & Shootings', dfr: 'Les agences et photographes peuvent reserver ton temps directement en ligne.', den: 'Agencies and photographers can book your time directly online.' },
              { icon: '💌', fr: 'Demandes de collaboration', en: 'Collaboration requests', dfr: 'Formulaire personnalise pour que les marques te contactent avec leurs offres.', den: 'Custom form so brands can reach you with their offers.' },
              { icon: '📊', fr: 'Statistiques & Visites', en: 'Stats & Visits', dfr: "Vois combien d'agences ont consulte ton portfolio et quelles photos sont les plus vues.", den: 'See how many agencies viewed your portfolio and which photos get the most attention.' },
              { icon: '🌟', fr: 'Portfolio Pro', en: 'Pro Portfolio', dfr: 'Domaine personnalise, portfolio sans publicite, badge verifie pour les agences.', den: 'Custom domain, ad-free portfolio, verified badge for agencies.' },
            ].map(item => (
              <div key={item.fr} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-start gap-3 opacity-60">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{lang === 'fr' ? item.fr : item.en}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{lang === 'fr' ? item.dfr : item.den}</p>
                </div>
                <Lock size={14} className="text-gray-700 flex-shrink-0 mt-0.5" />
              </div>
            ))}
            <p className="text-xs text-gray-700 text-center pt-2">
              {lang === 'fr'
                ? 'Tu seras notifiee en premier quand ces fonctionnalites seront disponibles.'
                : 'You will be notified first when these features become available.'}
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
                <ExternalLink size={13} /> {t.preview}
              </a>
            )}
            <button onClick={saveProfile} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all
                bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-60 disabled:cursor-not-allowed">
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> {t.saving}</>
                : saved
                  ? <><Check size={16} /> {t.saved}</>
                  : <><Save size={16} /> {t.save}</>
              }
            </button>
          </div>
        </div>
      )}

    </main>
  )
}

function LinkSection({
  links, onAdd, onDelete, t
}: {
  links: PortfolioItem[]
  onAdd: (url: string, title: string) => void
  onDelete: (id: string) => void
  t: typeof T['fr']
}) {
  const [url, setUrl]     = useState('')
  const [title, setTitle] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium">{t.add_link}</p>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t.link_name}</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={t.link_name_ph}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">{t.link_url}</label>
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder={t.link_url_ph}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
        </div>
        <button
          onClick={() => { onAdd(url, title); setUrl(''); setTitle('') }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-pink-600/80 to-purple-600/80 hover:opacity-90 text-white rounded-xl text-sm font-medium transition-opacity">
          <Plus size={15} /> {t.add}
        </button>
      </div>

      {links.length > 0 && (
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Link2 size={14} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{link.title || link.url}</p>
                <p className="text-gray-600 text-xs truncate">{link.url}</p>
              </div>
              <a href={link.url} target="_blank" rel="noopener" className="p-1.5 text-gray-600 hover:text-white transition-colors">
                <ExternalLink size={14} />
              </a>
              <button onClick={() => onDelete(link.id)} className="p-1.5 text-gray-700 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
