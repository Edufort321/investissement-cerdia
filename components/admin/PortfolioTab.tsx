'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import CircleCropModal from '@/components/ui/CircleCropModal'
import {
  Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Link2, Image, Upload, Crop,
  Copy, Check, Star, Globe, Instagram, Share2, ExternalLink, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, User, Sparkles, FileDown, Loader2, RefreshCw
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
  uda_number: string
  gender: string
  age_class: string
  theme: string
  theme_primary: string
  theme_accent: string
  height_cm: number | null
  weight_kg: number | null
  eye_color: string
  hair_color: string
  hair_length: string
  skin_tone: string
  shoe_size: string
  clothing_size: string
  languages: string[]
  special_skills: string
  is_organization: boolean
  is_paid: boolean
  paid_at: string | null
  renewal_due: string | null
  created_at: string
}

interface PortfolioItem {
  id: string
  profile_id: string
  type: 'photo' | 'link' | 'video' | 'service'
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
  const [fillLang, setFillLang] = useState<'fr' | 'en'>('fr')
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [bioModalOpen, setBioModalOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setCollapsed(s => ({ ...s, [key]: !s[key] }))
  const isOpen = (key: string) => collapsed[key] !== true
  const [detailOpen, setDetailOpen] = useState(true)

  // ── Tarifs portfolio ──────────────────────────────────────────────────────
  const CERDIA_UUID = 'c0000000-0000-0000-0000-000000000001'
  const [setupPrice, setSetupPrice]   = useState(150)
  const [annualPrice, setAnnualPrice] = useState(50)
  const [editingPrice, setEditingPrice]   = useState(false)
  const [setupInput, setSetupInput]   = useState('150')
  const [annualInput, setAnnualInput] = useState('50')
  const [savingPrice, setSavingPrice] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc]           = useState<string | null>(null)
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', tagline: '', bio: '', contact_email: '', phone: '',
    instagram_url: '', tiktok_url: '', location: '', slug: '', uda_number: '',
    gender: '', age_class: '', theme: 'rose', theme_primary: '', theme_accent: '',
    height_cm: '' as string | number, weight_kg: '' as string | number,
    eye_color: '', hair_color: '', hair_length: '', skin_tone: '',
    shoe_size: '', clothing_size: '', languages: '', special_skills: '',
  })
  const [itemForm, setItemForm] = useState({
    type: 'photo' as 'photo' | 'link' | 'video',
    title: '', description: '', url: '', thumbnail_url: '', category: 'portfolio'
  })

  useEffect(() => { loadProfiles() }, [])
  useEffect(() => { if (selectedProfile) loadItems(selectedProfile.id) }, [selectedProfile])
  useEffect(() => { loadPricing() }, [])

  const loadPricing = async () => {
    const { data } = await supabase.from('organizations').select('settings').eq('id', CERDIA_UUID).maybeSingle()
    const s = data?.settings?.portfolio_pricing
    const setup = Number(s?.setup_cad) || 150
    const annual = Number(s?.annual_cad) || 50
    setSetupPrice(setup); setAnnualPrice(annual)
    setSetupInput(String(setup)); setAnnualInput(String(annual))
  }

  const savePricing = async () => {
    const setup = parseFloat(setupInput.replace(',', '.'))
    const annual = parseFloat(annualInput.replace(',', '.'))
    if (isNaN(setup) || isNaN(annual)) { showToast('Montant invalide', false); return }
    setSavingPrice(true)
    const { data: cur } = await supabase.from('organizations').select('settings').eq('id', CERDIA_UUID).maybeSingle()
    const merged = { ...(cur?.settings || {}), portfolio_pricing: { setup_cad: setup, annual_cad: annual } }
    const { error } = await supabase.from('organizations').update({ settings: merged }).eq('id', CERDIA_UUID)
    setSavingPrice(false)
    if (error) { showToast('Erreur: ' + error.message, false); return }
    setSetupPrice(setup); setAnnualPrice(annual)
    setEditingPrice(false)
    showToast('Tarifs mis a jour')
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadProfiles = async (keepSelectedId?: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('portfolio_profiles').select('*').order('created_at', { ascending: false })
      if (error) { showToast('Erreur chargement: ' + error.message, false); return }
      setProfiles(data || [])
      if (data) {
        const targetId = keepSelectedId ?? selectedProfile?.id
        if (targetId) {
          const refreshed = data.find(p => p.id === targetId)
          if (refreshed) setSelectedProfile(refreshed)
        } else if (data.length > 0) {
          setSelectedProfile(data[0])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadItems = async (profileId: string) => {
    const { data } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', profileId).order('sort_order').order('created_at')
    setItems(data || [])
  }

  const slugify = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const openNewProfile = () => {
    setForm({ name: '', tagline: '', bio: '', contact_email: '', phone: '', instagram_url: '', tiktok_url: '', location: '', slug: '', uda_number: '', gender: '', age_class: '', theme: 'rose', theme_primary: '', theme_accent: '', height_cm: '', weight_kg: '', eye_color: '', hair_color: '', hair_length: '', skin_tone: '', shoe_size: '', clothing_size: '', languages: '', special_skills: '' })
    setSelectedProfile(null)
    setEditingProfile(true)
  }

  const openEditProfile = (p: Profile) => {
    setForm({
      name: p.name, tagline: p.tagline || '', bio: p.bio || '',
      contact_email: p.contact_email || '', phone: p.phone || '',
      instagram_url: p.instagram_url || '', tiktok_url: p.tiktok_url || '',
      location: p.location || '', slug: p.slug, uda_number: p.uda_number || '',
      gender: p.gender || '', age_class: p.age_class || '',
      theme: p.theme || 'rose', theme_primary: p.theme_primary || '', theme_accent: p.theme_accent || '',
      height_cm: p.height_cm ?? '', weight_kg: p.weight_kg ?? '',
      eye_color: p.eye_color || '', hair_color: p.hair_color || '',
      hair_length: p.hair_length || '', skin_tone: p.skin_tone || '',
      shoe_size: p.shoe_size || '', clothing_size: p.clothing_size || '',
      languages: (p.languages || []).join(', '), special_skills: p.special_skills || '',
    })
    setEditingProfile(true)
  }

  const saveProfile = async () => {
    if (!form.name.trim()) { showToast('Le nom est requis', false); return }
    const slug = form.slug || slugify(form.name)
    const langs = typeof form.languages === 'string'
      ? form.languages.split(',').map(l => l.trim()).filter(Boolean)
      : form.languages
    const payload = {
      ...form, slug,
      height_cm: form.height_cm !== '' ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg !== '' ? Number(form.weight_kg) : null,
      languages: langs,
    }
    setIsLoading(true)
    if (selectedProfile) {
      const { error } = await supabase.from('portfolio_profiles').update(payload).eq('id', selectedProfile.id)
      if (error) { showToast('Erreur: ' + error.message, false); setIsLoading(false); return }
      showToast('Profil mis a jour')
      await loadProfiles(selectedProfile.id)
    } else {
      const { data, error } = await supabase.from('portfolio_profiles').insert([payload]).select().single()
      if (error) { showToast('Erreur: ' + error.message, false); setIsLoading(false); return }
      showToast('Profil cree!')
      await loadProfiles(data.id)
    }
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

  const updateBilling = async (profileId: string, patch: Partial<Pick<Profile,'is_paid'|'paid_at'|'renewal_due'|'is_organization'>>) => {
    const { error } = await supabase.from('portfolio_profiles').update(patch).eq('id', profileId)
    if (error) { showToast('Erreur: ' + error.message, false); return }
    setProfiles(ps => ps.map(p => p.id === profileId ? { ...p, ...patch } : p))
    if (selectedProfile?.id === profileId) setSelectedProfile(s => s ? { ...s, ...patch } : s)
    showToast('Facturation mise a jour')
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
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur upload: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    const { error } = await supabase.from('portfolio_profiles').update({ [field]: publicUrl }).eq('id', selectedProfile.id)
    if (!error) {
      setSelectedProfile({ ...selectedProfile, [field]: publicUrl })
      showToast('Photo mise a jour!')
    }
    setUploadProgress(null)
    await loadProfiles()
  }

  const openHeadshotCrop = (file: File) => setCropSrc(URL.createObjectURL(file))

  const confirmHeadshotCrop = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (!selectedProfile) return
    await uploadPhoto(new File([blob], `headshot-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'headshot_url')
  }

  const openCoverCrop = (file: File) => setCoverCropSrc(URL.createObjectURL(file))

  const openHeadshotAdjust = async () => {
    if (!selectedProfile?.headshot_url) return
    const blob = await fetch(selectedProfile.headshot_url).then(r => r.blob())
    setCropSrc(URL.createObjectURL(blob))
  }
  const openCoverAdjust = async () => {
    if (!selectedProfile?.cover_url) return
    const blob = await fetch(selectedProfile.cover_url).then(r => r.blob())
    setCoverCropSrc(URL.createObjectURL(blob))
  }

  const confirmCoverCrop = async (blob: Blob) => {
    if (coverCropSrc) URL.revokeObjectURL(coverCropSrc)
    setCoverCropSrc(null)
    if (!selectedProfile) return
    await uploadPhoto(new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'cover_url')
  }

  const uploadItemFile = async (file: File) => {
    if (!selectedProfile) return
    const isVideo = file.type.startsWith('video/')
    setUploadProgress(isVideo ? 'Upload video...' : 'Upload photo...')
    const ext = file.name.split('.').pop()
    const path = `portfolio/${selectedProfile.id}/items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    setItemForm(f => ({
      ...f,
      type: isVideo ? 'video' : 'photo',
      url: publicUrl,
      thumbnail_url: isVideo ? '' : publicUrl,
    }))
    setUploadProgress(null)
    showToast(isVideo ? 'Video chargee!' : 'Photo chargee!')
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

  const photoItems   = items.filter(i => i.type === 'photo')
  const linkItems    = items.filter(i => i.type === 'link')
  const serviceItems = items.filter(i => i.type === 'service')

  const exportPDF = async (profile: Profile) => {
    setPdfLoading(true)
    try {
      // ── Helpers ───────────────────────────────────────────────────────────
      // Use canvas so the browser applies EXIF rotation before we export
      const fetchImg = (url: string): Promise<{ data: string; fmt: 'JPEG' | 'PNG'; w: number; h: number } | null> =>
        new Promise(res => {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const c = document.createElement('canvas')
            c.width  = img.naturalWidth
            c.height = img.naturalHeight
            c.getContext('2d')!.drawImage(img, 0, 0)
            res({ data: c.toDataURL('image/jpeg', 0.92), fmt: 'JPEG', w: img.naturalWidth, h: img.naturalHeight })
          }
          img.onerror = () => res(null)
          img.src = url
        })

      const makeCircle = (url: string): Promise<string | null> =>
        new Promise(res => {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const S = 280
            const c = document.createElement('canvas')
            c.width = c.height = S
            const ctx = c.getContext('2d')!
            ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip()
            const sc = Math.max(S / img.naturalWidth, S / img.naturalHeight)
            const w = img.naturalWidth * sc, h = img.naturalHeight * sc
            ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
            res(c.toDataURL('image/jpeg', 0.9))
          }
          img.onerror = () => res(null)
          img.src = url
        })

      // Fetch frais du profil pour avoir les caracteristiques physiques a jour
      const { data: freshData } = await supabase.from('portfolio_profiles').select('*').eq('id', profile.id).single()
      const p = (freshData as Profile) || profile

      // ── Theme colors ─────────────────────────────────────────────────────
      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '')
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
      }
      const TDEF: Record<string, {primary:string;accent:string}> = {
        rose:   { primary:'#db2777', accent:'#a855f7' },
        violet: { primary:'#8b5cf6', accent:'#db2777' },
        ocean:  { primary:'#06b6d4', accent:'#3b82f6' },
        forest: { primary:'#10b981', accent:'#059669' },
        sunset: { primary:'#f59e0b', accent:'#ef4444' },
        slate:  { primary:'#94a3b8', accent:'#64748b' },
      }
      const td = TDEF[p.theme] || TDEF.rose
      const primaryRgb = hexToRgb(p.theme === 'custom' && p.theme_primary ? p.theme_primary : td.primary)
      const accentRgb  = hexToRgb(p.theme === 'custom' && p.theme_accent  ? p.theme_accent  : td.accent)
      // dark version of accent for backgrounds (divide by ~3)
      const accentDarkRgb: [number,number,number] = [Math.round(accentRgb[0]*0.35), Math.round(accentRgb[1]*0.12), Math.round(accentRgb[2]*0.5)]

      // ── Fetch images concurrently ─────────────────────────────────────────
      const [headshotCircle, ...photoImgResults] = await Promise.all([
        profile.headshot_url ? makeCircle(profile.headshot_url) : Promise.resolve(null),
        ...photoItems.slice(0, 6).map(p => fetchImg(p.url))
      ])
      const photoImgs = photoImgResults as ({ data: string; fmt: 'JPEG' | 'PNG'; w: number; h: number } | null)[]

      const pubUrl = publicUrl(profile)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const W = 215.9, H = 279.4
      const LX = 15, LC = 120   // left col x + width
      const RX = 142, RC = 58   // right col x + width

      // ── PAGE BACKGROUND ──────────────────────────────────────────────────
      doc.setFillColor(10, 8, 20)
      doc.rect(0, 0, W, H, 'F')

      // Right column subtle tint
      doc.setFillColor(14, 11, 26)
      doc.rect(RX - 3, 0, W - RX + 3, H, 'F')

      // ── TOP ACCENT BAND ──────────────────────────────────────────────────
      doc.setFillColor(...accentDarkRgb)
      doc.rect(0, 0, W, 55, 'F')
      doc.setFillColor(10, 8, 20)
      doc.rect(0, 48, W, 7, 'F')
      doc.setDrawColor(...primaryRgb)
      doc.setLineWidth(0.8)
      doc.line(LX, 48, W - LX, 48)
      // silver decorative line
      doc.setDrawColor(200, 200, 210)
      doc.setLineWidth(0.25)
      doc.line(LX, 49.5, W - LX, 49.5)

      // ── HEADSHOT ─────────────────────────────────────────────────────────
      const HS = 34
      if (headshotCircle) {
        doc.addImage(headshotCircle, 'JPEG', LX, 7, HS, HS)
      } else {
        doc.setFillColor(60, 20, 80)
        doc.circle(LX + HS / 2, 7 + HS / 2, HS / 2, 'F')
      }

      // ── NOM & TAGLINE ────────────────────────────────────────────────────
      const TX = LX + HS + 6
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(255, 255, 255)
      doc.text(p.name, TX, 18)

      if (p.tagline) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(...primaryRgb)
        doc.text(p.tagline.toUpperCase(), TX, 25)
      }

      const meta: string[] = []
      if (p.location) meta.push(p.location)
      if (p.uda_number) meta.push(`UDA ${p.uda_number}`)
      if (meta.length > 0) {
        doc.setFontSize(8)
        doc.setTextColor(180, 160, 200)
        doc.text(meta.join('   |   '), TX, 31)
      }

      // CERDIA Portfolio label (top-right corner)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(200, 200, 210)
      doc.text('CERDIA PORTFOLIO', W - LX, 10, { align: 'right' })
      doc.setDrawColor(200, 200, 210)
      doc.setLineWidth(0.2)
      doc.line(W - LX - 38, 11.5, W - LX, 11.5)

      // ── COLONNE GAUCHE ───────────────────────────────────────────────────
      let y = 56

      // BIO (max 18 lignes p.1 ; suite sur p.2 si plus long)
      let bioOverflow: string[] = []
      if (p.bio) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...primaryRgb)
        doc.text('A PROPOS', LX, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(210, 205, 225)
        const allBioLines: string[] = doc.splitTextToSize(p.bio, LC)
        const MAX_BIO_P1 = 18
        const bioP1 = allBioLines.slice(0, MAX_BIO_P1)
        bioOverflow = allBioLines.slice(MAX_BIO_P1)
        doc.text(bioP1, LX, y)
        y += bioP1.length * 4.4 + 5
      }

      // FICHE PHYSIQUE
      const physRows: { label: string; val: string }[] = []
      if (p.height_cm) physRows.push({ label: 'Taille', val: `${p.height_cm} cm` })
      if (p.weight_kg) physRows.push({ label: 'Poids',  val: `${p.weight_kg} kg` })
      if (p.eye_color)     physRows.push({ label: 'Yeux',     val: p.eye_color })
      if (p.hair_color)    physRows.push({ label: 'Cheveux',  val: p.hair_color + (p.hair_length ? ' / ' + p.hair_length : '') })
      if (p.skin_tone)     physRows.push({ label: 'Teint',    val: p.skin_tone })
      if (p.clothing_size) physRows.push({ label: 'Vetement', val: p.clothing_size })
      if (p.shoe_size)     physRows.push({ label: 'Pointure', val: p.shoe_size })
      if (p.languages?.length) physRows.push({ label: 'Langues', val: p.languages.join(', ') })
      if (p.special_skills)    physRows.push({ label: 'Competences', val: p.special_skills })

      if (physRows.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...primaryRgb)
        doc.text('FICHE PHYSIQUE', LX, y)
        y += 4

        const COL = LC / 2 - 1
        for (let i = 0; i < physRows.length; i += 2) {
          const left  = physRows[i]
          const right = physRows[i + 1]
          doc.setFillColor(22, 16, 38)
          doc.roundedRect(LX, y - 2.5, COL, 6, 0.8, 0.8, 'F')
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(160, 140, 190)
          doc.text(left.label.toUpperCase(), LX + 2, y + 0.5)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(230, 225, 245)
          const lv = left.val.length > 24 ? left.val.slice(0, 22) + '..' : left.val
          doc.text(lv, LX + 2, y + 3.5)
          if (right) {
            doc.setFillColor(22, 16, 38)
            doc.roundedRect(LX + COL + 2, y - 2.5, COL, 6, 0.8, 0.8, 'F')
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(160, 140, 190)
            doc.text(right.label.toUpperCase(), LX + COL + 4, y + 0.5)
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(230, 225, 245)
            const rv = right.val.length > 24 ? right.val.slice(0, 22) + '..' : right.val
            doc.text(rv, LX + COL + 4, y + 3.5)
          }
          y += 7
        }
        y += 4
      }

      // CONTACT
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...primaryRgb)
      doc.text('CONTACT', LX, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)

      const contacts: { label: string; val: string; url?: string; color?: [number,number,number] }[] = []
      if (p.contact_email) contacts.push({ label: 'Email', val: p.contact_email, url: `mailto:${p.contact_email}` })
      if (p.phone)         contacts.push({ label: 'Tel',   val: p.phone })
      if (p.instagram_url) contacts.push({ label: 'Instagram', val: p.instagram_url, url: p.instagram_url, color: primaryRgb })
      if (p.tiktok_url)    contacts.push({ label: 'TikTok', val: p.tiktok_url, url: p.tiktok_url, color: accentRgb })

      for (const c of contacts) {
        doc.setTextColor(140, 130, 160)
        doc.text(`${c.label}:`, LX, y)
        doc.setTextColor(...(c.color ?? [210, 205, 225] as [number,number,number]))
        const val = c.val.length > 45 ? c.val.slice(0, 42) + '...' : c.val
        doc.text(val, LX + 20, y)
        if (c.url) doc.link(LX, y - 3.5, LC, 5, { url: c.url })
        y += 5.5
      }

      // LIENS
      if (linkItems.length > 0) {
        y += 3
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...primaryRgb)
        doc.text('LIENS & PROJETS', LX, y)
        y += 5

        for (const link of linkItems.slice(0, 5)) {
          if (y > H - 40) break
          doc.setFillColor(25, 18, 42)
          doc.roundedRect(LX, y - 3, LC, 7, 1, 1, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(210, 205, 225)
          const title = link.title || link.url
          doc.text(title.length > 38 ? title.slice(0, 35) + '...' : title, LX + 3, y + 1)
          doc.setTextColor(140, 100, 200)
          if (link.title) {
            const u = link.url.length > 30 ? link.url.slice(0, 27) + '...' : link.url
            doc.text(u, LX + 3, y + 4.5)
          }
          doc.link(LX, y - 3, LC, 7, { url: link.url })
          y += link.title ? 9 : 8
        }
      }

      // PORTFOLIO URL BOX
      const boxY = Math.max(y + 4, 220)
      doc.setFillColor(Math.round(accentDarkRgb[0]*1.2), Math.round(accentDarkRgb[1]*1.2), Math.round(accentDarkRgb[2]*1.2))
      doc.roundedRect(LX, boxY, LC, 20, 3, 3, 'F')
      doc.setDrawColor(...primaryRgb)
      doc.setLineWidth(0.4)
      doc.roundedRect(LX, boxY, LC, 20, 3, 3, 'S')
      // silver top edge
      doc.setDrawColor(210, 210, 220)
      doc.setLineWidth(0.3)
      doc.line(LX + 3, boxY + 0.5, LX + LC - 3, boxY + 0.5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...primaryRgb)
      doc.text('PORTFOLIO EN LIGNE', LX + LC / 2, boxY + 7, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...accentRgb)
      const pubShort = pubUrl.length > 42 ? pubUrl.slice(0, 39) + '...' : pubUrl
      doc.text(pubShort, LX + LC / 2, boxY + 13, { align: 'center' })
      doc.link(LX, boxY, LC, 20, { url: pubUrl })

      // ── COLONNE DROITE — PHOTOS avec ratio reel ───────────────────────────
      let ry = 56
      const PH_W = RC
      const MAX_PH_H = Math.round(PH_W * 1.35)  // portrait max 4:3 inverse

      for (let i = 0; i < Math.min(photoImgs.length, 5); i++) {
        const img = photoImgs[i]
        if (!img) continue
        // ratio reel de l'image, plafonne pour eviter les photos trop hautes
        const ratio = img.h / img.w
        const PH_H = Math.min(Math.round(PH_W * ratio), MAX_PH_H)
        if (ry + PH_H > H - 20) break
        doc.addImage(img.data, img.fmt, RX, ry, PH_W, PH_H, undefined, 'MEDIUM')
        if (photoItems[i]?.category && photoItems[i].category !== 'portfolio') {
          doc.setFillColor(20, 10, 35)
          doc.rect(RX, ry + PH_H - 6, PH_W, 6, 'F')
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)
          doc.setTextColor(200, 180, 230)
          doc.text(photoItems[i].category.toUpperCase(), RX + 2, ry + PH_H - 1.5)
        }
        ry += PH_H + 3
      }

      if (photoItems.length > 5) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(120, 100, 140)
        doc.text(`+ ${photoItems.length - 5} autres photos en ligne`, RX, ry + 3)
      } else if (photoItems.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(80, 70, 100)
        doc.text('Photos disponibles en ligne', RX + RC / 2, 100, { align: 'center' })
      }

      // ── FOOTER ───────────────────────────────────────────────────────────
      doc.setFillColor(20, 15, 35)
      doc.rect(0, H - 12, W, 12, 'F')
      doc.setDrawColor(100, 20, 140)
      doc.setLineWidth(0.3)
      doc.line(0, H - 12, W, H - 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(130, 110, 160)
      doc.text(`${p.name}  |  Portfolio Artistique  |  ${new Date().getFullYear()}`, W / 2, H - 5, { align: 'center' })
      doc.link(30, H - 12, W - 60, 12, { url: pubUrl })

      // ── PAGE 2 (bio longue + photos supplementaires) ─────────────────────
      if (bioOverflow.length > 0 || photoImgs.length > 5) {
        doc.addPage()
        doc.setFillColor(10, 8, 20)
        doc.rect(0, 0, W, H, 'F')

        // bandeau haut minimal
        doc.setFillColor(...accentDarkRgb)
        doc.rect(0, 0, W, 14, 'F')
        doc.setDrawColor(...primaryRgb)
        doc.setLineWidth(0.5)
        doc.line(0, 14, W, 14)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(255, 255, 255)
        doc.text(p.name + '  —  Suite', LX, 9)

        let y2 = 22

        if (bioOverflow.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...primaryRgb)
          doc.text('A PROPOS (suite)', LX, y2)
          y2 += 5
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(210, 205, 225)
          doc.text(bioOverflow, LX, y2)
          y2 += bioOverflow.length * 4.4 + 8
        }

        // photos supplementaires en grille 2 colonnes
        const extraPhotos = photoImgs.slice(5)
        if (extraPhotos.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...primaryRgb)
          doc.text('PHOTOS SUPPLEMENTAIRES', LX, y2)
          y2 += 5
          const GW = (W - 30 - 5) / 2
          let gx = LX, gy = y2
          for (const img of extraPhotos) {
            if (!img) continue
            const ratio = img.h / img.w
            const GH = Math.min(Math.round(GW * ratio), Math.round(GW * 1.35))
            if (gy + GH > H - 15) break
            doc.addImage(img.data, img.fmt, gx, gy, GW, GH, undefined, 'MEDIUM')
            gx = gx === LX ? LX + GW + 5 : LX
            if (gx === LX) gy += GH + 4
          }
        }

        // footer p.2
        doc.setFillColor(20, 15, 35)
        doc.rect(0, H - 12, W, 12, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(130, 110, 160)
        doc.text(`${p.name}  |  Portfolio Artistique  |  Page 2`, W / 2, H - 5, { align: 'center' })
      }

      doc.save(`portfolio-${p.slug}.pdf`)
      showToast('PDF exporte!')
    } catch (err) {
      console.error('PDF error:', err)
      showToast('Erreur PDF: ' + (err instanceof Error ? err.message : String(err)), false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
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

      {/* Modal bio complete */}
      {bioModalOpen && selectedProfile?.bio && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setBioModalOpen(false)}>
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Bio — {selectedProfile.name}</h3>
              <button onClick={() => setBioModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedProfile.bio}</p>
          </div>
        </div>
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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Portfolio Artistique</h1>
                <p className="text-sm text-gray-400">Gestion des portfolios publics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadProfiles(selectedProfile?.id)}
                disabled={isLoading}
                title="Actualiser"
                className="p-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors disabled:opacity-40"
              >
                <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={openNewProfile}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Plus size={16} /> Nouveau portfolio
              </button>
            </div>
          </div>

          {/* Stats + Prix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Clients total</p>
              <p className="text-xl font-bold text-white">{profiles.length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Payés</p>
              <p className="text-xl font-bold text-emerald-400">{profiles.filter(p => p.is_paid).length}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">ARR (renouvellements)</p>
              <p className="text-xl font-bold text-yellow-400">{profiles.filter(p => p.is_paid).length * annualPrice} $</p>
            </div>
            {/* Tarifs modifiables */}
            <div className="bg-gray-900 border border-pink-800/30 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Tarifs</p>
                {!editingPrice
                  ? <button onClick={() => setEditingPrice(true)} className="text-xs text-pink-400 hover:text-pink-300 transition-colors">Modifier</button>
                  : <button onClick={() => setEditingPrice(false)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Annuler</button>
                }
              </div>
              {!editingPrice ? (
                <p className="text-sm font-bold text-white">{setupPrice}$&nbsp;<span className="text-gray-500 font-normal text-xs">setup</span>&nbsp;+&nbsp;{annualPrice}$<span className="text-gray-500 font-normal text-xs">/an</span></p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input value={setupInput} onChange={e => setSetupInput(e.target.value.replace(/[^\d.,]/g,''))}
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-pink-500" placeholder="150" />
                    <span className="text-xs text-gray-500">$ setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input value={annualInput} onChange={e => setAnnualInput(e.target.value.replace(/[^\d.,]/g,''))}
                      className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-pink-500" placeholder="50" />
                    <span className="text-xs text-gray-500">$/an</span>
                    <button onClick={savePricing} disabled={savingPrice}
                      className="text-xs bg-pink-600 hover:bg-pink-500 text-white px-2 py-1 rounded transition-colors disabled:opacity-50">
                      {savingPrice ? '...' : 'OK'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                onClick={() => {
                  if (selectedProfile?.id === p.id) {
                    setDetailOpen(d => !d)
                  } else {
                    setSelectedProfile(p)
                    setDetailOpen(true)
                    setEditingProfile(false)
                  }
                }}
                className={`relative rounded-xl p-4 cursor-pointer transition-all border
                  ${selectedProfile?.id === p.id
                    ? 'bg-gray-800 border-pink-500/50'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600'}`}
              >
                {selectedProfile?.id === p.id && (
                  <div className="absolute top-2 right-2">
                    {detailOpen
                      ? <ChevronUp size={14} className="text-pink-400" />
                      : <ChevronDown size={14} className="text-pink-400" />
                    }
                  </div>
                )}
                <div className="flex items-start gap-3">
                  {p.headshot_url
                    ? <img src={p.headshot_url} alt={p.name} className="w-12 h-12 rounded-full object-cover object-top ring-2 ring-pink-500/30" />
                    : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center border border-pink-500/20">
                        <User size={20} className="text-pink-400" />
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{p.tagline || 'Artiste'}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>
                        {p.is_published ? 'Public' : 'Prive'}
                      </span>
                      {p.is_organization && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Org</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_paid ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-700/60 text-gray-600'}`}>
                        {p.is_paid ? '$ Paye' : '$ En attente'}
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
                    { key: 'uda_number', label: 'Numero UDA', placeholder: 'Ex: 12345 (Union des Artistes)' },
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
                  {/* Genre + Classe d'age */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Genre</label>
                    <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500">
                      <option value="">--</option>
                      <option value="femme">Femme</option>
                      <option value="homme">Homme</option>
                      <option value="non-binaire">Non-binaire</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Classe d&apos;age</label>
                    <select value={form.age_class} onChange={e => setForm(f => ({ ...f, age_class: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500">
                      <option value="">--</option>
                      <option value="enfant">Enfant (4-12 ans)</option>
                      <option value="ado">Adolescent (13-17 ans)</option>
                      <option value="adulte">Adulte (18-59 ans)</option>
                      <option value="senior">Senior (60+)</option>
                    </select>
                  </div>
                  {/* Theme */}
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 mb-1.5 block">Couleur du portfolio</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { k: 'rose', label: 'Rose', c: '#ec4899' }, { k: 'or', label: 'Or', c: '#d4af37' },
                        { k: 'argent', label: 'Argent', c: '#94a3b8' }, { k: 'bleu', label: 'Bleu', c: '#3b82f6' },
                        { k: 'nature', label: 'Nature', c: '#22c55e' }, { k: 'custom', label: 'Perso', c: form.theme_primary || '#ffffff' },
                      ].map(({ k, label, c }) => (
                        <button key={k} type="button" onClick={() => setForm(f => ({ ...f, theme: k }))}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${form.theme === k ? 'text-white border-white/20 bg-white/10' : 'text-gray-400 border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                          {label}
                        </button>
                      ))}
                    </div>
                    {form.theme === 'custom' && (
                      <div className="flex gap-3 mt-2">
                        <div className="flex items-center gap-1.5 flex-1">
                          <input type="color" value={form.theme_primary || '#ec4899'}
                            onChange={e => setForm(f => ({ ...f, theme_primary: e.target.value }))}
                            className="w-8 h-8 rounded border border-gray-700 bg-gray-800 p-0.5 cursor-pointer" />
                          <input type="text" value={form.theme_primary} placeholder="Couleur principale"
                            onChange={e => setForm(f => ({ ...f, theme_primary: e.target.value }))}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono placeholder-gray-600 focus:outline-none" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-1">
                          <input type="color" value={form.theme_accent || '#a855f7'}
                            onChange={e => setForm(f => ({ ...f, theme_accent: e.target.value }))}
                            className="w-8 h-8 rounded border border-gray-700 bg-gray-800 p-0.5 cursor-pointer" />
                          <input type="text" value={form.theme_accent} placeholder="Couleur accent"
                            onChange={e => setForm(f => ({ ...f, theme_accent: e.target.value }))}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white font-mono placeholder-gray-600 focus:outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
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
                  {/* Caracteristiques physiques */}
                  <div className="col-span-2">
                    <p className="text-xs text-gray-300 uppercase tracking-widest mb-2 mt-1">Caracteristiques physiques</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'height_cm', label: 'Taille (cm)', placeholder: 'Ex: 168', type: 'number' },
                        { key: 'weight_kg', label: 'Poids (kg)', placeholder: 'Ex: 58', type: 'number' },
                        { key: 'shoe_size', label: 'Pointure', placeholder: 'Ex: 38' },
                        { key: 'clothing_size', label: 'Taille vetement', placeholder: 'Ex: S, M, 36...' },
                      ].map(({ key, label, placeholder, type }) => (
                        <div key={key}>
                          <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                          <input
                            type={type || 'text'}
                            value={(form as any)[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Couleur des yeux</label>
                        <select value={form.eye_color} onChange={e => setForm(f => ({ ...f, eye_color: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500">
                          <option value="">--</option>
                          <option value="Marron">Marron</option>
                          <option value="Noisette">Noisette</option>
                          <option value="Vert">Vert</option>
                          <option value="Bleu">Bleu</option>
                          <option value="Gris">Gris</option>
                          <option value="Noir">Noir</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Couleur des cheveux</label>
                        <select value={form.hair_color} onChange={e => setForm(f => ({ ...f, hair_color: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500">
                          <option value="">--</option>
                          <option value="Noir">Noir</option>
                          <option value="Brun">Brun</option>
                          <option value="Chatain">Chatain</option>
                          <option value="Blond">Blond</option>
                          <option value="Roux">Roux</option>
                          <option value="Gris / Blanc">Gris / Blanc</option>
                          <option value="Colore">Colore</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Longueur cheveux</label>
                        <select value={form.hair_length} onChange={e => setForm(f => ({ ...f, hair_length: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500">
                          <option value="">--</option>
                          <option value="Tres court">Tres court</option>
                          <option value="Court">Court</option>
                          <option value="Mi-long">Mi-long</option>
                          <option value="Long">Long</option>
                          <option value="Tres long">Tres long</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Teint</label>
                        <select value={form.skin_tone} onChange={e => setForm(f => ({ ...f, skin_tone: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500">
                          <option value="">--</option>
                          <option value="Tres clair">Tres clair</option>
                          <option value="Clair">Clair</option>
                          <option value="Moyen">Moyen</option>
                          <option value="Olive">Olive</option>
                          <option value="Fonce">Fonce</option>
                          <option value="Tres fonce">Tres fonce</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">Langues (separees par virgule)</label>
                        <input
                          value={form.languages as string}
                          onChange={e => setForm(f => ({ ...f, languages: e.target.value }))}
                          placeholder="Ex: Francais, Anglais, Espagnol"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">Competences speciales</label>
                        <input
                          value={form.special_skills}
                          onChange={e => setForm(f => ({ ...f, special_skills: e.target.value }))}
                          placeholder="Ex: Conduite auto, Equitation, Chant..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
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
            {selectedProfile && !editingProfile && detailOpen && (
              <>
                {/* Profile header card */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  {/* Cover */}
                  <div
                    className="h-36 relative group"
                    style={selectedProfile.cover_url
                      ? { backgroundImage: `url(${selectedProfile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: 'linear-gradient(135deg, #1a0533 0%, #2d0a5e 50%, #0d1a3d 100%)' }
                    }
                  >
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all">
                      <label className="flex flex-col items-center gap-1 cursor-pointer text-white/80 hover:text-white transition-colors">
                        <div className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl"><Upload size={18} /></div>
                        <span className="text-[10px]">Changer</span>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => { if (e.target.files?.[0]) openCoverCrop(e.target.files[0]); e.target.value = '' }} />
                      </label>
                      {selectedProfile.cover_url && (
                        <button onClick={openCoverAdjust} className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors">
                          <div className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl"><Crop size={18} /></div>
                          <span className="text-[10px]">Ajuster</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-5 -mt-10 flex items-end gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-20 h-20 rounded-full ring-4 ring-gray-900 relative group cursor-pointer overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {selectedProfile.headshot_url
                          ? <img src={selectedProfile.headshot_url} alt={selectedProfile.name} className="w-full h-full object-cover object-top" />
                          : <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                              <User size={28} />
                            </div>
                        }
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-full">
                          <Upload size={18} className="text-white" />
                        </div>
                      </div>
                      {selectedProfile.headshot_url && (
                        <button onClick={openHeadshotAdjust}
                          className="text-[10px] text-gray-500 hover:text-pink-400 transition-colors flex items-center gap-0.5">
                          <Crop size={9} /> Ajuster
                        </button>
                      )}
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
                        disabled={pdfLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-900/30 hover:bg-purple-800/40 text-purple-400 border border-purple-800/30 transition-colors disabled:opacity-50"
                      >
                        {pdfLoading ? <><Loader2 size={13} className="animate-spin" /> Generation...</> : <><FileDown size={13} /> PDF</>}
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
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Edit2 size={11} /> Lien de remplissage (client)
                        </p>
                        <div className="flex gap-1">
                          <button onClick={() => setFillLang('fr')}
                            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${fillLang === 'fr' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>FR</button>
                          <button onClick={() => setFillLang('en')}
                            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${fillLang === 'en' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>EN</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-purple-400 truncate flex-1">/portfolio/fill/[token]?lang={fillLang}</code>
                        <button
                          onClick={() => copyToClipboard(`${fillUrl(selectedProfile)}?lang=${fillLang}`, 'token')}
                          className="flex-shrink-0 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                        >
                          {copiedToken ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        </button>
                        <a href={`${fillUrl(selectedProfile)}?lang=${fillLang}`} target="_blank" className="flex-shrink-0 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Facturation */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  <div onClick={() => toggle('billing')} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 cursor-pointer transition-colors select-none">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Facturation</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600">{setupPrice}$ setup · {annualPrice}$/an</span>
                      {isOpen('billing') ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                    </div>
                  </div>
                  {isOpen('billing') && <div className="px-4 pb-4 space-y-3">
                  {/* Org checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox"
                      checked={selectedProfile.is_organization ?? false}
                      onChange={e => updateBilling(selectedProfile.id, { is_organization: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Organisation / Agence</span>
                  </label>
                  {/* Paid checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox"
                      checked={selectedProfile.is_paid ?? false}
                      onChange={e => {
                        const now = e.target.checked ? new Date().toISOString() : null
                        const renewal = e.target.checked ? new Date(Date.now() + 365*24*3600*1000).toISOString().slice(0,10) : null
                        updateBilling(selectedProfile.id, { is_paid: e.target.checked, paid_at: now, renewal_due: renewal })
                      }}
                      className="w-4 h-4 rounded accent-yellow-500 cursor-pointer" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Frais initial payé (150$)
                      {selectedProfile.paid_at && (
                        <span className="text-xs text-gray-600 ml-2">{new Date(selectedProfile.paid_at).toLocaleDateString('fr-CA')}</span>
                      )}
                    </span>
                  </label>
                  {/* Renewal date */}
                  {selectedProfile.is_paid && selectedProfile.renewal_due && (
                    <div className="flex items-center gap-3 pl-7">
                      <span className="text-xs text-gray-500">Renouvellement annuel (50$) :</span>
                      <input type="date"
                        value={selectedProfile.renewal_due ?? ''}
                        onChange={e => updateBilling(selectedProfile.id, { renewal_due: e.target.value || null })}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-pink-500" />
                    </div>
                  )}
                  </div>}{/* end collapsible billing */}
                </div>

                {/* Bio resume */}
                {selectedProfile.bio && (
                  <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-gray-800/50 transition-colors">
                      <div onClick={() => toggle('bio')} className="flex items-center gap-2 flex-1 cursor-pointer select-none">
                        <p className="text-xs text-gray-500 uppercase tracking-widest flex-1">Bio</p>
                        {isOpen('bio') ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                      </div>
                      <button onClick={() => setBioModalOpen(true)} className="text-xs text-pink-400 hover:text-pink-300 transition-colors ml-3">Voir tout</button>
                    </div>
                    {isOpen('bio') && (
                      <p className="text-sm text-gray-300 leading-relaxed line-clamp-3 px-5 pb-4">{selectedProfile.bio}</p>
                    )}
                  </div>
                )}

                {uploadProgress && (
                  <div className="bg-purple-900/30 border border-purple-700/30 rounded-lg px-4 py-2 text-sm text-purple-300 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    {uploadProgress}
                  </div>
                )}

                {/* Photos grid */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3">
                    <div onClick={() => toggle('photos')} className="flex items-center gap-2 flex-1 cursor-pointer select-none hover:text-white transition-colors">
                      <Image size={16} className="text-pink-400" />
                      <span className="font-semibold">Photos & Liens</span>
                      <span className="text-gray-500 font-normal text-sm">({items.length})</span>
                      {isOpen('photos') ? <ChevronUp size={14} className="text-gray-600 ml-1" /> : <ChevronDown size={14} className="text-gray-600 ml-1" />}
                    </div>
                    <button
                      onClick={() => setAddingItem(!addingItem)}
                      className="flex items-center gap-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-600/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>
                  {isOpen('photos') && <div className="px-5 pb-5">

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

                      {(itemForm.type === 'photo' || itemForm.type === 'video') && (
                        <div>
                          <button
                            onClick={() => {
                              const inp = document.createElement('input')
                              inp.type = 'file'
                              inp.accept = itemForm.type === 'video' ? 'video/*' : 'image/*'
                              inp.onchange = (e) => {
                                const f = (e.target as HTMLInputElement).files?.[0]
                                if (f) uploadItemFile(f)
                              }
                              inp.click()
                            }}
                            className="w-full border-2 border-dashed border-gray-600 hover:border-pink-500 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-500 hover:text-pink-400 transition-colors"
                          >
                            <Upload size={24} />
                            <span className="text-sm">
                              {itemForm.type === 'video' ? 'Choisir une video depuis la galerie' : 'Choisir une photo depuis la galerie'}
                            </span>
                          </button>
                          {itemForm.url && itemForm.type === 'photo' && (
                            <img src={itemForm.url} alt="preview" className="mt-2 w-full max-h-48 rounded-lg object-contain bg-gray-900" />
                          )}
                          {itemForm.url && itemForm.type === 'video' && (
                            <video src={itemForm.url} controls className="mt-2 w-full rounded-lg max-h-32" />
                          )}
                        </div>
                      )}

                      {itemForm.type === 'link' && (
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

                  {/* Services */}
                  {serviceItems.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Services ({serviceItems.length})</p>
                      {serviceItems.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{s.title}</p>
                            {s.category && <p className="text-pink-400 text-xs">{s.category}</p>}
                          </div>
                          <button onClick={() => deleteItem(s.id)} className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gallery grid */}
                  {items.filter(i => i.type !== 'service').length === 0 ? (
                    <div className="text-center py-10 text-gray-600">
                      <Image size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune photo ou lien</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.filter(i => i.type !== 'service').map(item => (
                        <div key={item.id} className="relative group rounded-xl overflow-hidden bg-gray-800 border border-gray-700 aspect-square">
                          {item.type === 'photo' && item.url ? (
                            <img src={item.url} alt={item.title || ''} className="w-full h-full object-cover object-top" />
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
                  </div>}{/* end collapsible photos */}
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
