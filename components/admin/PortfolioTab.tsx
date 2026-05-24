'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import CircleCropModal from '@/components/ui/CircleCropModal'
import {
  Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Link2, Image, Upload,
  Copy, Check, Star, Globe, Instagram, Share2, ExternalLink, ChevronDown,
  Phone, Mail, MapPin, User, Sparkles, FileDown, Loader2
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
  const [pdfLoading, setPdfLoading] = useState(false)

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

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const loadProfiles = async (keepSelectedId?: string) => {
    setIsLoading(true)
    const { data } = await supabase.from('portfolio_profiles').select('*').order('created_at', { ascending: false })
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

  const confirmCoverCrop = async (blob: Blob) => {
    if (coverCropSrc) URL.revokeObjectURL(coverCropSrc)
    setCoverCropSrc(null)
    if (!selectedProfile) return
    await uploadPhoto(new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' }), 'cover_url')
  }

  const uploadItemPhoto = async (file: File) => {
    if (!selectedProfile) return
    setUploadProgress('Upload photo...')
    const ext = file.name.split('.').pop()
    const path = `portfolio/${selectedProfile.id}/items/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (upErr) { showToast('Erreur: ' + upErr.message, false); setUploadProgress(null); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
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

  const exportPDF = async (profile: Profile) => {
    setPdfLoading(true)
    try {
      // ── Helpers ───────────────────────────────────────────────────────────
      // Use canvas so the browser applies EXIF rotation before we export
      const fetchImg = (url: string): Promise<{ data: string; fmt: 'JPEG' | 'PNG' } | null> =>
        new Promise(res => {
          const img = new window.Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const c = document.createElement('canvas')
            c.width  = img.naturalWidth
            c.height = img.naturalHeight
            c.getContext('2d')!.drawImage(img, 0, 0)
            res({ data: c.toDataURL('image/jpeg', 0.92), fmt: 'JPEG' })
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

      // ── Fetch images concurrently ─────────────────────────────────────────
      const [headshotCircle, ...photoImgResults] = await Promise.all([
        profile.headshot_url ? makeCircle(profile.headshot_url) : Promise.resolve(null),
        ...photoItems.slice(0, 6).map(p => fetchImg(p.url))
      ])
      const photoImgs = photoImgResults as ({ data: string; fmt: 'JPEG' | 'PNG' } | null)[]

      const pubUrl = publicUrl(profile)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const W = 215.9, H = 279.4
      const LX = 15, LC = 120   // left col x + width
      const RX = 142, RC = 58   // right col x + width

      // ── PAGE BACKGROUND ──────────────────────────────────────────────────
      doc.setFillColor(10, 8, 20)
      doc.rect(0, 0, W, H, 'F')

      // Right column subtle tint
      doc.setFillColor(16, 12, 30)
      doc.rect(RX - 3, 0, W - RX + 3, H, 'F')

      // ── TOP ACCENT BAND ──────────────────────────────────────────────────
      doc.setFillColor(100, 10, 130)
      doc.rect(0, 0, W, 55, 'F')
      doc.setFillColor(10, 8, 20)
      doc.rect(0, 48, W, 7, 'F')
      // Pink shimmer line
      doc.setDrawColor(219, 39, 119)
      doc.setLineWidth(0.8)
      doc.line(LX, 48, W - LX, 48)

      // ── HEADSHOT ─────────────────────────────────────────────────────────
      const HS = 34   // headshot size mm
      if (headshotCircle) {
        doc.addImage(headshotCircle, 'JPEG', LX, 7, HS, HS)
      } else {
        doc.setFillColor(60, 20, 80)
        doc.circle(LX + HS / 2, 7 + HS / 2, HS / 2, 'F')
      }

      // ── NAME & TAGLINE (top right of headshot) ───────────────────────────
      const TX = LX + HS + 6
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(255, 255, 255)
      doc.text(profile.name, TX, 18)

      if (profile.tagline) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(244, 114, 182)
        doc.text(profile.tagline.toUpperCase(), TX, 25)
      }

      // Location + UDA on same line
      const meta: string[] = []
      if (profile.location) meta.push(profile.location)
      if (profile.uda_number) meta.push(`UDA ${profile.uda_number}`)
      if (meta.length > 0) {
        doc.setFontSize(8)
        doc.setTextColor(180, 160, 200)
        doc.text(meta.join('   |   '), TX, 31)
      }

      // ── LEFT COLUMN BODY ─────────────────────────────────────────────────
      let y = 56

      // BIO
      if (profile.bio) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(219, 39, 119)
        doc.text('A PROPOS', LX, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(210, 205, 225)
        const bioLines = doc.splitTextToSize(profile.bio, LC)
        doc.text(bioLines, LX, y)
        y += bioLines.length * 4.8 + 6
      }

      // FICHE PHYSIQUE
      const physRows: { label: string; val: string }[] = []
      if (profile.height_cm) physRows.push({ label: 'Taille', val: `${profile.height_cm} cm` })
      if (profile.weight_kg) physRows.push({ label: 'Poids',  val: `${profile.weight_kg} kg` })
      if (profile.eye_color)    physRows.push({ label: 'Yeux',    val: profile.eye_color })
      if (profile.hair_color)   physRows.push({ label: 'Cheveux', val: profile.hair_color + (profile.hair_length ? ' / ' + profile.hair_length : '') })
      if (profile.skin_tone)    physRows.push({ label: 'Teint',   val: profile.skin_tone })
      if (profile.clothing_size) physRows.push({ label: 'Vetement', val: profile.clothing_size })
      if (profile.shoe_size)    physRows.push({ label: 'Pointure', val: profile.shoe_size })
      if (profile.languages?.length) physRows.push({ label: 'Langues', val: profile.languages.join(', ') })
      if (profile.special_skills) physRows.push({ label: 'Competences', val: profile.special_skills })

      if (physRows.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(219, 39, 119)
        doc.text('FICHE PHYSIQUE', LX, y)
        y += 4

        // 2-column mini table
        const COL = LC / 2 - 1
        for (let i = 0; i < physRows.length; i += 2) {
          const left  = physRows[i]
          const right = physRows[i + 1]
          doc.setFillColor(22, 16, 38)
          doc.roundedRect(LX,         y - 2.5, COL, 6, 0.8, 0.8, 'F')
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(160, 140, 190)
          doc.text(left.label.toUpperCase(), LX + 2, y + 0.5)
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(230, 225, 245)
          const lv = left.val.length > 16 ? left.val.slice(0, 14) + '..' : left.val
          doc.text(lv, LX + 2, y + 3.5)
          if (right) {
            doc.setFillColor(22, 16, 38)
            doc.roundedRect(LX + COL + 2, y - 2.5, COL, 6, 0.8, 0.8, 'F')
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(160, 140, 190)
            doc.text(right.label.toUpperCase(), LX + COL + 4, y + 0.5)
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(230, 225, 245)
            const rv = right.val.length > 16 ? right.val.slice(0, 14) + '..' : right.val
            doc.text(rv, LX + COL + 4, y + 3.5)
          }
          y += 7
        }
        y += 4
      }

      // CONTACT
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(219, 39, 119)
      doc.text('CONTACT', LX, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)

      const contacts: { label: string; val: string; url?: string; color?: [number,number,number] }[] = []
      if (profile.contact_email) contacts.push({ label: 'Email', val: profile.contact_email, url: `mailto:${profile.contact_email}` })
      if (profile.phone) contacts.push({ label: 'Tel', val: profile.phone })
      if (profile.instagram_url) contacts.push({ label: 'Instagram', val: profile.instagram_url, url: profile.instagram_url, color: [244, 114, 182] })
      if (profile.tiktok_url) contacts.push({ label: 'TikTok', val: profile.tiktok_url, url: profile.tiktok_url, color: [168, 85, 247] })

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
        doc.setTextColor(219, 39, 119)
        doc.text('LIENS & PROJETS', LX, y)
        y += 5

        for (const link of linkItems.slice(0, 5)) {
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

      // PORTFOLIO URL BOX (bottom of left col)
      const boxY = Math.max(y + 4, 220)
      doc.setFillColor(55, 10, 85)
      doc.roundedRect(LX, boxY, LC, 18, 3, 3, 'F')
      doc.setDrawColor(219, 39, 119)
      doc.setLineWidth(0.4)
      doc.roundedRect(LX, boxY, LC, 18, 3, 3, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(219, 39, 119)
      doc.text('PORTFOLIO EN LIGNE', LX + LC / 2, boxY + 6, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(168, 85, 247)
      const pubShort = pubUrl.length > 42 ? pubUrl.slice(0, 39) + '...' : pubUrl
      doc.text(pubShort, LX + LC / 2, boxY + 12, { align: 'center' })
      doc.link(LX, boxY, LC, 18, { url: pubUrl })

      // ── RIGHT COLUMN — PHOTOS ─────────────────────────────────────────────
      let ry = 56
      const PH_W = RC, PH_H = Math.round(PH_W * 0.67)   // 3:2 aspect

      for (let i = 0; i < Math.min(photoImgs.length, 4); i++) {
        const img = photoImgs[i]
        if (img && ry + PH_H < H - 20) {
          doc.addImage(img.data, img.fmt, RX, ry, PH_W, PH_H, undefined, 'MEDIUM')
          // Category label
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
      }

      // Photo count note if more
      if (photoItems.length > 4) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(120, 100, 140)
        doc.text(`+ ${photoItems.length - 4} autres photos en ligne`, RX, ry + 3)
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
      doc.text(`${profile.name}  |  Portfolio Artistique  |  ${new Date().getFullYear()}`, W / 2, H - 5, { align: 'center' })
      doc.link(30, H - 12, W - 60, 12, { url: pubUrl })

      doc.save(`portfolio-${profile.slug}.pdf`)
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
                    onChange={e => { if (e.target.files?.[0]) openCoverCrop(e.target.files[0]); e.target.value = '' }} />

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
