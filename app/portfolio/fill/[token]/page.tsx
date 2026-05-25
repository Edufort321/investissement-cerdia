'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CircleCropModal from '@/components/ui/CircleCropModal'
import { getTheme, THEME_LABELS, GENDER_LABELS, AGE_CLASS_LABELS, defaultThemeForGender } from '@/lib/portfolioTheme'
import {
  Save, Upload, Plus, Trash2, Check, ExternalLink, Sparkles,
  Camera, Link2, User, ChevronLeft, ChevronRight, Eye,
  Instagram, ShoppingBag, Lock, Lightbulb, AlertCircle, Loader2, X, Crop, Palette, Play,
  Share2, FileDown, Copy, Globe
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
  const [shareOpen, setShareOpen] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [appInstalled, setAppInstalled] = useState(false)
  const [pwaDismissed, setPwaDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('pwa-dismissed-fill') === '1'
  )
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
  const [lang, setLang]                   = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'fr'
    const p = new URLSearchParams(window.location.search).get('lang')
    return p === 'en' ? 'en' : 'fr'
  })
  const [carouselIdx, setCarouselIdx]     = useState(0)
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileRef    = useRef<typeof profile>(null)
  const formRef       = useRef<Partial<Profile>>({})
  const loadedRef     = useRef(false)
  const [autoSaving, setAutoSaving] = useState(false)

  const t = T[lang]

  useEffect(() => { if (token) load(token as string) }, [token])
  useEffect(() => { profileRef.current = profile }, [profile])
  useEffect(() => { formRef.current = form }, [form])

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    const installed = () => setAppInstalled(true)
    window.addEventListener('beforeinstallprompt', handler as EventListener)
    window.addEventListener('appinstalled', installed)
    if (window.matchMedia('(display-mode: standalone)').matches) setAppInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  // Flush immediat quand la page passe en arriere-plan (mobile: changement d'app, fermeture)
  useEffect(() => {
    const flush = () => {
      if (!loadedRef.current) return
      const p = profileRef.current
      if (!p?.fill_token) return
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null }
      // Utilise sendBeacon pour garantir la livraison meme si la page se ferme
      // Fallback: appel Supabase normal (fonctionne si la page reste ouverte)
      const payload = buildPayload(formRef.current)
      supabase.from('portfolio_profiles').update(payload).eq('fill_token', p.fill_token)
        .then(({ error }) => { if (error) console.error('[flush]', error.message) })
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [])

  // Auto-save 2s apres chaque changement de formulaire (mobile-first)
  useEffect(() => {
    if (!loadedRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const p = profileRef.current
      if (!p?.fill_token) return
      const payload = buildPayload(formRef.current)
      setAutoSaving(true)
      try {
        const { error } = await supabase
          .from('portfolio_profiles').update(payload).eq('fill_token', p.fill_token)
        if (error) {
          console.error('[auto-save]', error.message)
          showToast('Sauvegarde echouee: ' + error.message, false)
        } else {
          setProfile(pr => pr ? { ...pr, ...payload } : pr)
        }
      } finally { setAutoSaving(false) }
    }, 2000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [form])

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
      height_cm: data.height_cm ?? null, weight_kg: data.weight_kg ?? null,
      eye_color: data.eye_color ?? '', hair_color: data.hair_color ?? '',
      hair_length: data.hair_length ?? '', skin_tone: data.skin_tone ?? '',
      shoe_size: data.shoe_size ?? '', clothing_size: data.clothing_size ?? '',
      languages: data.languages ?? [], special_skills: data.special_skills ?? '',
    })
    const { data: its } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', data.id).order('sort_order').order('created_at')
    setItems(its ?? [])
    setLoading(false)
    setTimeout(() => { loadedRef.current = true }, 400)
  }

  const buildPayload = (f: Partial<Profile>) => ({
    name: f.name ?? '', tagline: f.tagline ?? '', bio: f.bio ?? '',
    contact_email: f.contact_email ?? '', phone: f.phone ?? '',
    instagram_url: f.instagram_url ?? '', tiktok_url: f.tiktok_url ?? '',
    location: f.location ?? '', uda_number: (f as any).uda_number ?? '',
    gender: (f as any).gender ?? '', age_class: (f as any).age_class ?? '',
    theme: (f as any).theme ?? 'rose',
    theme_primary: (f as any).theme_primary ?? '',
    theme_accent: (f as any).theme_accent ?? '',
    height_cm: (f as any).height_cm || null,
    weight_kg: (f as any).weight_kg || null,
    eye_color: (f as any).eye_color ?? '', hair_color: (f as any).hair_color ?? '',
    hair_length: (f as any).hair_length ?? '', skin_tone: (f as any).skin_tone ?? '',
    shoe_size: (f as any).shoe_size ?? '', clothing_size: (f as any).clothing_size ?? '',
    languages: (f as any).languages ?? [], special_skills: (f as any).special_skills ?? '',
  })

  const togglePublish = async () => {
    if (!profile) return
    const next = !profile.is_published
    const { error } = await supabase.from('portfolio_profiles')
      .update({ is_published: next })
      .eq('fill_token', profile.fill_token ?? '')
    if (!error) {
      setProfile(p => p ? { ...p, is_published: next } : p)
      showToast(next
        ? (lang === 'fr' ? 'Portfolio publie! Visible par les agences.' : 'Portfolio published! Visible to agencies.')
        : (lang === 'fr' ? 'Portfolio cache.' : 'Portfolio hidden.'),
        next
      )
    }
  }

  const shareProfile = async () => {
    const url = window.location.origin + `/portfolio/${profile?.slug}`
    if (navigator.share) {
      try { await navigator.share({ title: profile?.name, url }) } catch {}
    } else {
      setShareOpen(true)
    }
  }

  const copyUrl = async () => {
    const url = window.location.origin + `/portfolio/${profile?.slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const exportPDF = async () => {
    if (!profile) return
    setPdfExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const makeCircle = (url: string): Promise<string | null> =>
        new Promise(res => {
          const img = new window.Image(); img.crossOrigin = 'anonymous'
          img.onload = () => {
            const S = 280, c = document.createElement('canvas')
            c.width = c.height = S
            const ctx = c.getContext('2d')!
            ctx.beginPath(); ctx.arc(S/2,S/2,S/2,0,Math.PI*2); ctx.clip()
            const sc = Math.max(S/img.naturalWidth, S/img.naturalHeight)
            const w = img.naturalWidth*sc, h = img.naturalHeight*sc
            ctx.drawImage(img,(S-w)/2,(S-h)/2,w,h)
            res(c.toDataURL('image/jpeg',0.9))
          }; img.onerror = () => res(null); img.src = url
        })
      const fetchImg = (url: string): Promise<{data:string;fmt:'JPEG'|'PNG';w:number;h:number}|null> =>
        new Promise(res => {
          const img = new window.Image(); img.crossOrigin = 'anonymous'
          img.onload = () => {
            const c = document.createElement('canvas')
            c.width = img.naturalWidth; c.height = img.naturalHeight
            c.getContext('2d')!.drawImage(img,0,0)
            res({data:c.toDataURL('image/jpeg',0.92),fmt:'JPEG',w:img.naturalWidth,h:img.naturalHeight})
          }; img.onerror = () => res(null); img.src = url
        })

      const photoItems = items.filter(i => i.type === 'photo')
      const linkItems  = items.filter(i => i.type === 'link')

      // ── Theme colors ────────────────────────────────────────────────────
      const hexToRgb = (hex: string): [number, number, number] => {
        const h = hex.replace('#', '')
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
      }
      const TDEF: Record<string,{primary:string;accent:string}> = {
        rose:   {primary:'#db2777',accent:'#a855f7'},
        violet: {primary:'#8b5cf6',accent:'#db2777'},
        ocean:  {primary:'#06b6d4',accent:'#3b82f6'},
        forest: {primary:'#10b981',accent:'#059669'},
        sunset: {primary:'#f59e0b',accent:'#ef4444'},
        slate:  {primary:'#94a3b8',accent:'#64748b'},
      }
      const td = TDEF[(form as any).theme] || TDEF.rose
      const primaryRgb = hexToRgb((form as any).theme==='custom'&&(form as any).theme_primary?(form as any).theme_primary:td.primary)
      const accentRgb  = hexToRgb((form as any).theme==='custom'&&(form as any).theme_accent?(form as any).theme_accent:td.accent)
      const accentDarkRgb:[number,number,number]=[Math.round(accentRgb[0]*0.35),Math.round(accentRgb[1]*0.12),Math.round(accentRgb[2]*0.5)]

      const [hsCircle, ...photoResults] = await Promise.all([
        profile.headshot_url ? makeCircle(profile.headshot_url) : Promise.resolve(null),
        ...photoItems.slice(0,5).map(i => fetchImg(i.url))
      ])
      const photoImgs = photoResults as ({data:string;fmt:'JPEG'|'PNG';w:number;h:number}|null)[]

      const pubUrl = window.location.origin + `/portfolio/${profile.slug}`
      const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'letter'})
      const W=215.9,H=279.4,LX=15,LC=120,RX=142,RC=58
      doc.setFillColor(10,8,20); doc.rect(0,0,W,H,'F')
      doc.setFillColor(14,11,26); doc.rect(RX-3,0,W-RX+3,H,'F')
      doc.setFillColor(...accentDarkRgb); doc.rect(0,0,W,55,'F')
      doc.setFillColor(10,8,20); doc.rect(0,48,W,7,'F')
      doc.setDrawColor(...primaryRgb); doc.setLineWidth(0.8); doc.line(LX,48,W-LX,48)
      doc.setDrawColor(200,200,210); doc.setLineWidth(0.25); doc.line(LX,49.5,W-LX,49.5)

      const HS=34
      if (hsCircle) { doc.addImage(hsCircle,'JPEG',LX,7,HS,HS) }
      else { doc.setFillColor(...accentDarkRgb); doc.circle(LX+HS/2,7+HS/2,HS/2,'F') }

      const TX=LX+HS+6
      doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.setTextColor(255,255,255)
      doc.text(profile.name,TX,18)
      if (profile.tagline) { doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(...primaryRgb); doc.text(profile.tagline.toUpperCase(),TX,25) }
      const meta:string[]=[]
      if (profile.location) meta.push(profile.location)
      if (profile.uda_number) meta.push(`UDA ${profile.uda_number}`)
      if (meta.length>0) { doc.setFontSize(8); doc.setTextColor(180,160,200); doc.text(meta.join('   |   '),TX,31) }
      // CERDIA label
      doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(200,200,210)
      doc.text('CERDIA PORTFOLIO',W-LX,10,{align:'right'})
      doc.setDrawColor(200,200,210); doc.setLineWidth(0.2); doc.line(W-LX-38,11.5,W-LX,11.5)

      let y=56
      let bioOverflow:string[]=[]
      if (profile.bio) {
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...primaryRgb); doc.text('A PROPOS',LX,y); y+=5
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(210,205,225)
        const allBio:string[]=doc.splitTextToSize(profile.bio,LC)
        const bio1=allBio.slice(0,18); bioOverflow=allBio.slice(18)
        doc.text(bio1,LX,y); y+=bio1.length*4.4+5
      }

      const physRows:{label:string;val:string}[]=[]
      if ((form as any).height_cm) physRows.push({label:'Taille',val:`${(form as any).height_cm} cm`})
      if ((form as any).weight_kg) physRows.push({label:'Poids',val:`${(form as any).weight_kg} kg`})
      if ((form as any).eye_color) physRows.push({label:'Yeux',val:(form as any).eye_color})
      if ((form as any).hair_color) physRows.push({label:'Cheveux',val:(form as any).hair_color+((form as any).hair_length?' / '+(form as any).hair_length:'')})
      if ((form as any).skin_tone) physRows.push({label:'Teint',val:(form as any).skin_tone})
      if ((form as any).clothing_size) physRows.push({label:'Vetement',val:(form as any).clothing_size})
      if ((form as any).shoe_size) physRows.push({label:'Pointure',val:(form as any).shoe_size})
      if ((form as any).languages?.length) physRows.push({label:'Langues',val:((form as any).languages as string[]).join(', ')})
      if ((form as any).special_skills) physRows.push({label:'Competences',val:(form as any).special_skills})

      if (physRows.length>0) {
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...primaryRgb); doc.text('FICHE PHYSIQUE',LX,y); y+=4
        const COL=LC/2-1
        for (let i=0;i<physRows.length;i+=2) {
          const l=physRows[i],r=physRows[i+1]
          doc.setFillColor(22,16,38); doc.roundedRect(LX,y-2.5,COL,6,0.8,0.8,'F')
          doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(160,140,190); doc.text(l.label.toUpperCase(),LX+2,y+0.5)
          doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(230,225,245)
          doc.text(l.val.length>24?l.val.slice(0,22)+'..':l.val,LX+2,y+3.5)
          if (r) {
            doc.setFillColor(22,16,38); doc.roundedRect(LX+COL+2,y-2.5,COL,6,0.8,0.8,'F')
            doc.setFont('helvetica','bold'); doc.setFontSize(6); doc.setTextColor(160,140,190); doc.text(r.label.toUpperCase(),LX+COL+4,y+0.5)
            doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(230,225,245)
            doc.text(r.val.length>24?r.val.slice(0,22)+'..':r.val,LX+COL+4,y+3.5)
          }
          y+=7
        }
        y+=4
      }

      if (profile.contact_email||profile.phone) {
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...primaryRgb); doc.text('CONTACT',LX,y); y+=5
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
        if (profile.contact_email) { doc.setTextColor(140,130,160); doc.text('Email:',LX,y); doc.setTextColor(210,205,225); doc.text(profile.contact_email,LX+20,y); y+=5.5 }
        if (profile.phone) { doc.setTextColor(140,130,160); doc.text('Tel:',LX,y); doc.setTextColor(210,205,225); doc.text(profile.phone,LX+20,y); y+=5.5 }
      }

      if (linkItems.length>0) {
        y+=3; doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...primaryRgb); doc.text('LIENS & PROJETS',LX,y); y+=5
        for (const lk of linkItems.slice(0,5)) {
          if (y>H-40) break
          doc.setFillColor(25,18,42); doc.roundedRect(LX,y-3,LC,7,1,1,'F')
          doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(210,205,225)
          const ti=lk.title||lk.url; doc.text(ti.length>38?ti.slice(0,35)+'...':ti,LX+3,y+1)
          if (lk.title) { doc.setTextColor(140,100,200); doc.text(lk.url.length>30?lk.url.slice(0,27)+'...':lk.url,LX+3,y+4.5) }
          doc.link(LX,y-3,LC,7,{url:lk.url}); y+=lk.title?9:8
        }
      }

      const boxY=Math.max(y+4,220)
      doc.setFillColor(Math.round(accentDarkRgb[0]*1.2),Math.round(accentDarkRgb[1]*1.2),Math.round(accentDarkRgb[2]*1.2))
      doc.roundedRect(LX,boxY,LC,20,3,3,'F')
      doc.setDrawColor(...primaryRgb); doc.setLineWidth(0.4); doc.roundedRect(LX,boxY,LC,20,3,3,'S')
      doc.setDrawColor(210,210,220); doc.setLineWidth(0.3); doc.line(LX+3,boxY+0.5,LX+LC-3,boxY+0.5)
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...primaryRgb); doc.text('PORTFOLIO EN LIGNE',LX+LC/2,boxY+7,{align:'center'})
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...accentRgb)
      doc.text(pubUrl.length>42?pubUrl.slice(0,39)+'...':pubUrl,LX+LC/2,boxY+13,{align:'center'})
      doc.link(LX,boxY,LC,20,{url:pubUrl})

      let ry=56; const PH_W=RC; const MAX_PH_H=Math.round(PH_W*1.35)
      for (let i=0;i<Math.min(photoImgs.length,5);i++) {
        const img=photoImgs[i]; if (!img) continue
        const PH_H=Math.min(Math.round(PH_W*(img.h/img.w)),MAX_PH_H)
        if (ry+PH_H>H-20) break
        doc.addImage(img.data,img.fmt,RX,ry,PH_W,PH_H,undefined,'MEDIUM'); ry+=PH_H+3
      }

      doc.setFillColor(20,15,35); doc.rect(0,H-12,W,12,'F')
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(130,110,160)
      doc.text(`${profile.name}  |  Portfolio Artistique  |  ${new Date().getFullYear()}`,W/2,H-5,{align:'center'})

      if (bioOverflow.length>0) {
        doc.addPage()
        doc.setFillColor(10,8,20); doc.rect(0,0,W,H,'F')
        doc.setFillColor(...accentDarkRgb); doc.rect(0,0,W,14,'F')
        doc.setDrawColor(...primaryRgb); doc.setLineWidth(0.5); doc.line(0,14,W,14)
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255)
        doc.text(profile.name+'  —  Suite',LX,9)
        let y2=22
        doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...primaryRgb); doc.text('A PROPOS (suite)',LX,y2); y2+=5
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(210,205,225)
        doc.text(bioOverflow,LX,y2)
        doc.setFillColor(20,15,35); doc.rect(0,H-12,W,12,'F')
        doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(130,110,160)
        doc.text(`${profile.name}  |  Portfolio Artistique  |  Page 2`,W/2,H-5,{align:'center'})
      }

      doc.save(`portfolio-${profile.slug}.pdf`)
    } catch(e) { console.error(e) }
    finally { setPdfExporting(false) }
  }

  const saveProfile = async () => {
    if (!profile || saving) return
    setSaving(true); setSaveError(null)
    try {
      const payload = buildPayload(form)
      const fillTok = profile.fill_token
      if (!fillTok) { showToast('Token manquant — recharge la page', false); return }
      const { error } = await supabase
        .from('portfolio_profiles').update(payload).eq('fill_token', fillTok)
      if (error) {
        console.error('[save]', error)
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

  const photos   = items.filter(i => i.type === 'photo')
  const videos   = items.filter(i => i.type === 'video')
  const links    = items.filter(i => i.type === 'link')
  const services = items.filter(i => i.type === 'service')
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

  const addService = async (name: string, rate: string) => {
    if (!profile || !name.trim()) return
    const maxOrder = Math.max(0, ...items.map(i => i.sort_order))
    const { error } = await supabase.from('portfolio_items').insert([{
      profile_id: profile.id, type: 'service', title: name.trim(),
      url: '', sort_order: maxOrder + 1, category: rate.trim()
    }])
    if (error) { showToast(t.err_prefix + error.message, false); return }
    showToast(lang === 'fr' ? 'Service ajoute!' : 'Service added!')
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
          {autoSaving && !uploadProgress && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              <span className="hidden sm:inline">{lang === 'fr' ? 'Sauvegarde...' : 'Saving...'}</span>
            </span>
          )}
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

      {/* SPLIT LAYOUT: hero gauche (desktop) / formulaire droite */}
      <div className="lg:flex lg:h-[calc(100vh-57px)]">

      {/* ── HERO / PANNEAU GAUCHE ── */}
      <div className="relative h-52 sm:h-64 lg:h-full bg-gray-900 overflow-hidden lg:w-[42%] lg:flex-shrink-0">
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
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full ring-2 ring-white/30 ring-offset-2 ring-offset-transparent overflow-hidden flex-shrink-0 bg-gray-800 cursor-pointer shadow-xl"
               onClick={() => document.getElementById('headshot-input')?.click()}>
            {profile.headshot_url
              ? <img src={profile.headshot_url} alt={profile.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-purple-600/20">
                  <Camera size={20} className="text-pink-400/50" />
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg md:text-xl leading-tight drop-shadow-lg truncate"
               style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
              {profile.name}
            </p>
            {profile.tagline && (
              <p className="text-pink-200 text-sm tracking-wide truncate"
                 style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                {profile.tagline}
              </p>
            )}
            {profile.is_published && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {lang === 'fr' ? 'Public' : 'Public'}
              </span>
            )}
          </div>
          <input id="headshot-input" type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) openHeadshotCrop(e.target.files[0]); e.target.value = '' }} />
        </div>
      </div>{/* end hero */}

      {/* ── PANNEAU DROIT (formulaire) ── */}
      <div className="lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">

      {/* ── PWA INSTALL BANNER ── */}
      {!appInstalled && !pwaDismissed && (
        <div className="bg-gradient-to-r from-purple-950/90 to-pink-950/90 border-b border-pink-900/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                {lang === 'fr' ? 'Installe l\'app sur ton telephone' : 'Install the app on your phone'}
              </p>
              {installPrompt ? (
                <button
                  onClick={async () => {
                    installPrompt.prompt()
                    const { outcome } = await installPrompt.userChoice
                    if (outcome === 'accepted') setAppInstalled(true)
                    setInstallPrompt(null)
                  }}
                  className="mt-1.5 flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                  {lang === 'fr' ? 'Installer l\'app' : 'Install app'}
                </button>
              ) : typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                <p className="text-pink-200/80 text-xs mt-1">
                  {lang === 'fr'
                    ? 'Appuie sur Partager ⬆ dans Safari → "Sur l\'ecran d\'accueil"'
                    : 'Tap Share ⬆ in Safari → "Add to Home Screen"'}
                </p>
              ) : (
                <p className="text-pink-200/80 text-xs mt-1">
                  {lang === 'fr'
                    ? 'Ouvre ce lien dans Chrome et installe l\'app depuis le menu ⋮'
                    : 'Open in Chrome and install the app from the ⋮ menu'}
                </p>
              )}
            </div>
            <button
              onClick={() => { setPwaDismissed(true); localStorage.setItem('pwa-dismissed-fill', '1') }}
              className="text-gray-500 hover:text-gray-300 flex-shrink-0 p-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION TABS ── */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-2 sticky top-[57px] lg:top-0 z-20">
        <div className="flex">
          {([
            { key: 'profil',   label: t.profile,   icon: User },
            { key: 'photos',   label: `${t.photos}${photos.length > 0 ? ` (${photos.length})` : ''}`, icon: Camera },
            { key: 'liens',    label: `${t.links}${links.length > 0 ? ` (${links.length})` : ''}`, icon: Link2 },
            { key: 'boutique', label: t.shop,       icon: ShoppingBag },
          ] as { key: Section; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => {
              setActiveSection(key)
              if (key === 'boutique' && installPrompt && !appInstalled) {
                installPrompt.prompt()
                installPrompt.userChoice.then(({ outcome }: { outcome: string }) => {
                  if (outcome === 'accepted') setAppInstalled(true)
                  setInstallPrompt(null)
                })
              }
            }}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors flex-1 justify-center
                ${activeSection === key ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT (scrollable sur desktop) ── */}
      <div className="lg:flex-1 lg:overflow-y-auto pb-28 lg:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-5 lg:max-w-none lg:py-5">

        {/* ── PROFIL ── */}
        {activeSection === 'profil' && (
          <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:items-start lg:grid-cols-[1fr_1.4fr_1fr] lg:gap-4">

            {/* ── COL 1: Photos + Identite & Apparence ── */}
            <div className="space-y-4 min-w-0 md:col-start-1 md:row-start-1">

              {/* Photos */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
                <p className="text-xs text-gray-300 uppercase tracking-widest mb-3">{t.photos_section}</p>
                <div className="flex gap-3">
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

                  <label className="flex-[2] cursor-pointer group">
                    <div className="relative rounded-xl overflow-hidden bg-gray-800 border-2 border-dashed border-gray-700 group-hover:border-purple-500 transition-colors" style={{ aspectRatio: '8/3' }}>
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

              {/* Identite & Apparence */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
                <p className="text-xs text-gray-300 uppercase tracking-widest font-medium flex items-center gap-1.5">
                  <Palette size={11} /> {lang === 'fr' ? 'Identite & Apparence' : 'Identity & Appearance'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">
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
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">
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

                  {(form as any).theme === 'custom' && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="text-xs text-gray-500 mb-1 block">
                          {lang === 'fr' ? 'Couleur principale' : 'Primary color'}
                        </label>
                        <div className="flex items-center gap-2 min-w-0">
                          <input type="color" value={(form as any).theme_primary || '#ec4899'}
                            onChange={e => setForm(f => ({ ...f, theme_primary: e.target.value }))}
                            className="w-9 h-9 flex-shrink-0 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5" />
                          <input type="text" value={(form as any).theme_primary || ''}
                            onChange={e => setForm(f => ({ ...f, theme_primary: e.target.value }))}
                            placeholder="#ec4899"
                            className="min-w-0 flex-1 bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <label className="text-xs text-gray-500 mb-1 block">
                          {lang === 'fr' ? 'Couleur accent' : 'Accent color'}
                        </label>
                        <div className="flex items-center gap-2 min-w-0">
                          <input type="color" value={(form as any).theme_accent || '#a855f7'}
                            onChange={e => setForm(f => ({ ...f, theme_accent: e.target.value }))}
                            className="w-9 h-9 flex-shrink-0 rounded-lg border border-gray-700 cursor-pointer bg-gray-800 p-0.5" />
                          <input type="text" value={(form as any).theme_accent || ''}
                            onChange={e => setForm(f => ({ ...f, theme_accent: e.target.value }))}
                            placeholder="#a855f7"
                            className="min-w-0 flex-1 bg-gray-800 border border-gray-700 rounded-xl px-2 py-2 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>{/* end col 1 */}

            {/* ── COL 2: Info + Physiques + Bio ── */}
            <div className="space-y-4 min-w-0 md:col-start-2 md:row-start-1">

              {/* Info */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
                <p className="text-xs text-gray-300 uppercase tracking-widest">{t.info}</p>

                <div>
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.full_name}</label>
                  <input value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t.name_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>

                <div>
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.title_spec}</label>
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
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.city}</label>
                  <input value={form.location ?? ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder={t.city_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.email}</label>
                    <input type="email" value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                      placeholder={t.email_ph}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.phone}</label>
                    <input type="tel" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder={t.phone_ph}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Caracteristiques physiques */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
                <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">
                  {lang === 'fr' ? 'Caracteristiques physiques' : 'Physical attributes'}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Taille (cm)' : 'Height (cm)'}</label>
                    <input type="number" min={50} max={250} value={(form as any).height_cm ?? ''}
                      onChange={e => setForm(f => ({ ...f, height_cm: e.target.value ? Number(e.target.value) : null }))}
                      placeholder={lang === 'fr' ? 'Ex: 170' : 'e.g. 170'}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Poids (kg)' : 'Weight (kg)'}</label>
                    <input type="number" min={20} max={300} step={0.1} value={(form as any).weight_kg ?? ''}
                      onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value ? Number(e.target.value) : null }))}
                      placeholder={lang === 'fr' ? 'Ex: 58.5' : 'e.g. 58.5'}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Couleur des yeux' : 'Eye color'}</label>
                    <select value={(form as any).eye_color ?? ''}
                      onChange={e => setForm(f => ({ ...f, eye_color: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors">
                      <option value="">--</option>
                      {[['brun','Brown'],['bleu','Blue'],['vert','Green'],['gris','Gray'],['noisette','Hazel'],['noir','Dark'],['autre','Other']].map(([fr, en]) => (
                        <option key={fr} value={fr}>{lang === 'fr' ? fr.charAt(0).toUpperCase() + fr.slice(1) : en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Couleur des cheveux' : 'Hair color'}</label>
                    <select value={(form as any).hair_color ?? ''}
                      onChange={e => setForm(f => ({ ...f, hair_color: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors">
                      <option value="">--</option>
                      {[['noir','Black'],['brun','Brown'],['chatain','Chestnut'],['blond','Blonde'],['roux','Red'],['gris','Gray'],['blanc','White'],['colore','Colored']].map(([fr, en]) => (
                        <option key={fr} value={fr}>{lang === 'fr' ? fr.charAt(0).toUpperCase() + fr.slice(1) : en}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Longueur cheveux' : 'Hair length'}</label>
                    <select value={(form as any).hair_length ?? ''}
                      onChange={e => setForm(f => ({ ...f, hair_length: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors">
                      <option value="">--</option>
                      {[['court','Short'],['mi-long','Medium'],['long','Long'],['tres-long','Very long']].map(([fr, en]) => (
                        <option key={fr} value={fr}>{lang === 'fr' ? fr : en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Teint' : 'Skin tone'}</label>
                    <select value={(form as any).skin_tone ?? ''}
                      onChange={e => setForm(f => ({ ...f, skin_tone: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors">
                      <option value="">--</option>
                      {[['clair','Fair'],['moyen','Medium'],['olive','Olive'],['fonce','Dark'],['tres-fonce','Very dark']].map(([fr, en]) => (
                        <option key={fr} value={fr}>{lang === 'fr' ? fr : en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Pointure' : 'Shoe size'}</label>
                    <input value={(form as any).shoe_size ?? ''}
                      onChange={e => setForm(f => ({ ...f, shoe_size: e.target.value }))}
                      placeholder={lang === 'fr' ? 'Ex: 38' : 'e.g. 38'}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Taille vetement' : 'Clothing size'}</label>
                    <input value={(form as any).clothing_size ?? ''}
                      onChange={e => setForm(f => ({ ...f, clothing_size: e.target.value }))}
                      placeholder={lang === 'fr' ? 'Ex: S, M, 36...' : 'e.g. S, M, 36...'}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Langues parlees' : 'Languages spoken'}</label>
                    <input value={((form as any).languages ?? []).join(', ')}
                      onChange={e => setForm(f => ({ ...f, languages: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))}
                      placeholder={lang === 'fr' ? 'francais, anglais...' : 'French, English...'}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">{lang === 'fr' ? 'Competences speciales' : 'Special skills'}</label>
                  <textarea
                    value={(form as any).special_skills ?? ''}
                    onChange={e => setForm(f => ({ ...f, special_skills: e.target.value }))}
                    onInput={(e: React.FormEvent<HTMLTextAreaElement>) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                    placeholder={lang === 'fr' ? 'Ex: danse, equitation, plongee, conduite...' : 'e.g. dancing, horseback riding, diving, driving...'}
                    style={{ minHeight: '72px', overflow: 'hidden' }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors resize-none" />
                </div>
              </div>

              {/* Bio */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">{t.bio_label}</p>
                  <span className="text-xs text-gray-600">{(form.bio ?? '').length} {lang === 'fr' ? 'car.' : 'chars'}</span>
                </div>
                <textarea
                  value={form.bio ?? ''}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  onInput={(e: React.FormEvent<HTMLTextAreaElement>) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                  placeholder={t.bio_ph}
                  style={{ minHeight: '120px', overflow: 'hidden' }}
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
            </div>{/* end col 2 */}

            {/* ── COL 3: Reseaux + UDA + Actions ── */}
            <div className="space-y-4 min-w-0 md:col-span-2 md:row-start-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">

              {/* Reseaux sociaux */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-4">
                <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">
                  {lang === 'fr' ? 'Reseaux sociaux' : 'Social media'}
                </p>

                <div>
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.ig_url}</label>
                  <div className="relative">
                    <Instagram size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400/60" />
                    <input value={form.instagram_url ?? ''} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                      placeholder={t.ig_ph}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">{t.tt_url}</label>
                  <input value={form.tiktok_url ?? ''} onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))}
                    placeholder={t.tt_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              {/* UDA */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
                <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">UDA</p>
                <div>
                  <label className="text-xs text-gray-200 mb-1.5 block font-medium">
                    {t.uda} <span className="text-gray-600 font-normal">{t.uda_desc}</span>
                  </label>
                  <input value={(form as any).uda_number ?? ''} onChange={e => setForm(f => ({ ...f, uda_number: e.target.value }))}
                    placeholder={t.uda_ph}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
                </div>
              </div>

              {/* Actions desktop */}
              <div className="hidden lg:block bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
                <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">
                  {lang === 'fr' ? 'Actions' : 'Actions'}
                </p>

                {profile.slug && (
                  <button onClick={() => setShareOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl text-sm font-medium transition-colors">
                    <Share2 size={15} /> {lang === 'fr' ? 'Partager le portfolio' : 'Share portfolio'}
                  </button>
                )}

                <button onClick={saveProfile} disabled={saving || autoSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all
                    bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" /> {t.saving}</>
                    : autoSaving
                      ? <><Loader2 size={16} className="animate-spin text-pink-200" /> {lang === 'fr' ? 'Sauvegarde auto...' : 'Auto-saving...'}</>
                      : saved
                        ? <><Check size={16} /> {t.saved}</>
                        : <><Save size={16} /> {t.save}</>
                  }
                </button>

                {autoSaving && (
                  <p className="text-xs text-gray-600 text-center flex items-center justify-center gap-1">
                    <Loader2 size={10} className="animate-spin" />
                    {lang === 'fr' ? 'Sauvegarde automatique active' : 'Auto-save active'}
                  </p>
                )}
              </div>

              {saveError && (
                <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}
            </div>{/* end col 3 */}
          </div>
        )}

        {/* ── PHOTOS ── */}
        {activeSection === 'photos' && (
          <div className="space-y-5">
            {/* Upload buttons: photo (incl. camera via OS dialog) + video */}
            <div className="grid grid-cols-2 gap-3">
              {/* Photo — no capture: OS shows native picker (camera + gallery) */}
              <label className="flex flex-col items-center gap-2.5 cursor-pointer border-2 border-dashed border-gray-700 hover:border-pink-500 rounded-2xl py-8 text-center transition-colors group">
                <div className="w-12 h-12 rounded-full bg-pink-600/10 group-hover:bg-pink-600/20 flex items-center justify-center transition-colors">
                  <Camera size={20} className="text-pink-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{lang === 'fr' ? 'Ajouter une photo' : 'Add a photo'}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{lang === 'fr' ? 'Camera ou galerie' : 'Camera or gallery'}</p>
                </div>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => {
                    Array.from(e.target.files ?? []).forEach(f => uploadItemPhoto(f))
                    ;(e.target as HTMLInputElement).value = ''
                  }} />
              </label>

              {/* Video */}
              <label className="flex flex-col items-center gap-2.5 cursor-pointer border-2 border-dashed border-blue-800/50 hover:border-blue-500 rounded-2xl py-8 text-center transition-colors group">
                <div className="w-12 h-12 rounded-full bg-blue-600/10 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors">
                  <Play size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{lang === 'fr' ? 'Ajouter une video' : 'Add a video'}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{lang === 'fr' ? 'MP4 / MOV (100 MB max)' : 'MP4 / MOV (100 MB max)'}</p>
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

            {/* Mon portfolio public */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
              <p className="text-xs text-gray-300 uppercase tracking-widest font-medium flex items-center gap-1.5">
                <Globe size={11} /> {lang === 'fr' ? 'Mon portfolio public' : 'My public portfolio'}
              </p>

              <button onClick={togglePublish}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  profile.is_published
                    ? 'bg-emerald-900/20 border-emerald-700/40'
                    : 'bg-gray-800 border-gray-700'
                }`}>
                <span className={`flex items-center gap-2 text-sm font-medium ${profile.is_published ? 'text-emerald-300' : 'text-gray-400'}`}>
                  <Eye size={15} />
                  {profile.is_published
                    ? (lang === 'fr' ? 'Visible par les agences' : 'Visible to agencies')
                    : (lang === 'fr' ? 'Portfolio cache (prive)' : 'Hidden portfolio (private)')
                  }
                </span>
                <div className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${profile.is_published ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform duration-200 ${profile.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {profile.slug && (
                <div className="bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Globe size={13} className="text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate flex-1">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/{profile.slug}
                  </span>
                  <button onClick={copyUrl} className="flex-shrink-0 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-gray-300" />}
                  </button>
                  <a href={publicUrl} target="_blank" rel="noopener"
                    className="flex-shrink-0 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                    <ExternalLink size={13} className="text-gray-300" />
                  </a>
                </div>
              )}

              <div className={`grid gap-2 ${typeof navigator !== 'undefined' && 'share' in navigator ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button onClick={shareProfile}
                    className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity">
                    <Share2 size={15} /> {lang === 'fr' ? 'Partager' : 'Share'}
                  </button>
                )}
                <button onClick={exportPDF} disabled={pdfExporting}
                  className="flex items-center justify-center gap-2 py-3 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/50 text-purple-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                  {pdfExporting
                    ? <><Loader2 size={15} className="animate-spin" /> PDF...</>
                    : <><FileDown size={15} /> PDF</>
                  }
                </button>
              </div>
            </div>

            {/* Installer l'app */}
            {!appInstalled ? (
              <div className="bg-gradient-to-br from-indigo-950/80 to-gray-900 rounded-2xl border border-indigo-800/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-900/30">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{lang === 'fr' ? 'Installer l\'app Portfolio' : 'Install Portfolio App'}</p>
                    <p className="text-gray-400 text-xs">{lang === 'fr' ? 'Acces rapide depuis ton ecran d\'accueil' : 'Quick access from your home screen'}</p>
                  </div>
                </div>
                {installPrompt ? (
                  <button
                    onClick={async () => {
                      installPrompt.prompt()
                      const { outcome } = await installPrompt.userChoice
                      if (outcome === 'accepted') setAppInstalled(true)
                      setInstallPrompt(null)
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                    {lang === 'fr' ? 'Installer maintenant' : 'Install now'}
                  </button>
                ) : typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                  <div className="bg-blue-950/50 border border-blue-800/50 rounded-xl p-3 space-y-1.5 text-xs text-blue-200">
                    <p className="font-semibold text-blue-100">{lang === 'fr' ? 'Ajouter a l\'ecran d\'accueil (iOS Safari)' : 'Add to Home Screen (iOS Safari)'}</p>
                    <p>1. {lang === 'fr' ? 'Appuie sur' : 'Tap'} <strong>{lang === 'fr' ? 'Partager' : 'Share'}</strong> <span className="font-bold">⬆</span> {lang === 'fr' ? 'en bas de Safari' : 'at the bottom of Safari'}</p>
                    <p>2. {lang === 'fr' ? 'Selectionne' : 'Select'} <strong>&ldquo;{lang === 'fr' ? 'Sur l\'ecran d\'accueil' : 'Add to Home Screen'}&rdquo;</strong></p>
                    <p>3. {lang === 'fr' ? 'Appuie sur' : 'Tap'} <strong>&ldquo;{lang === 'fr' ? 'Ajouter' : 'Add'}&rdquo;</strong></p>
                  </div>
                ) : (
                  <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-xs text-gray-400 space-y-1.5">
                    <p className="font-medium text-gray-300">{lang === 'fr' ? 'Installer depuis Chrome Android' : 'Install from Chrome Android'}</p>
                    <p>{lang === 'fr' ? 'Ouvre ce lien dans Chrome, puis appuie sur' : 'Open in Chrome, then tap'} <strong>{lang === 'fr' ? 'le menu ⋮' : 'the ⋮ menu'}</strong> → <strong>&ldquo;{lang === 'fr' ? 'Ajouter a l\'ecran d\'accueil' : 'Add to Home Screen'}&rdquo;</strong></p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-300 font-semibold text-sm">{lang === 'fr' ? 'App installee' : 'App installed'}</p>
                  <p className="text-gray-500 text-xs">{lang === 'fr' ? 'Disponible depuis ton ecran d\'accueil' : 'Available from your home screen'}</p>
                </div>
              </div>
            )}

            {/* Mes services / Tarifs */}
            <ServiceSection
              services={services}
              lang={lang}
              onAdd={addService}
              onDelete={deleteItem}
            />

          </div>
        )}
      </div>
      </div>{/* end lg:overflow-y-auto */}

      {/* ── MODAL PARTAGE ── */}
      {shareOpen && profile.slug && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={() => setShareOpen(false)}>
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-sm p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-sm">{lang === 'fr' ? 'Partager mon portfolio' : 'Share my portfolio'}</h3>
              <button onClick={() => setShareOpen(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>

            {/* Apercu URL */}
            <div className="bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
              <Globe size={13} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate flex-1">{typeof window !== 'undefined' ? window.location.origin : ''}/portfolio/{profile.slug}</span>
              <button onClick={copyUrl} className="flex-shrink-0 p-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-gray-300" />}
              </button>
            </div>

            {/* Boutons actions */}
            <div className="grid grid-cols-2 gap-2">
              <a href={publicUrl} target="_blank"
                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl text-sm transition-colors">
                <ExternalLink size={15} /> {lang === 'fr' ? 'Voir profil' : 'View profile'}
              </a>
              <button onClick={exportPDF} disabled={pdfExporting}
                className="flex items-center justify-center gap-2 py-3 bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/50 text-purple-300 rounded-xl text-sm transition-colors disabled:opacity-50">
                {pdfExporting
                  ? <><Loader2 size={15} className="animate-spin" /> PDF...</>
                  : <><FileDown size={15} /> {lang === 'fr' ? 'Telecharger PDF' : 'Download PDF'}</>
                }
              </button>
            </div>

            {/* Publier / cacher */}
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-2">
                {lang === 'fr' ? 'Visibilite' : 'Visibility'} — {profile.is_published
                  ? <span className="text-emerald-400">{lang === 'fr' ? 'Portfolio public (visible aux agences)' : 'Public (visible to agencies)'}</span>
                  : <span className="text-gray-500">{lang === 'fr' ? 'Portfolio prive (non visible)' : 'Private (not visible)'}</span>
                }
              </p>
              <button onClick={togglePublish}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border ${
                  profile.is_published
                    ? 'bg-red-900/30 hover:bg-red-800/40 border-red-700/50 text-red-300'
                    : 'bg-emerald-900/30 hover:bg-emerald-800/40 border-emerald-700/50 text-emerald-300'
                }`}>
                {profile.is_published
                  ? <><Eye size={15} className="line-through opacity-60" /> {lang === 'fr' ? 'Cacher le portfolio' : 'Hide portfolio'}</>
                  : <><Eye size={15} /> {lang === 'fr' ? 'Publier le portfolio' : 'Publish portfolio'}</>
                }
              </button>
            </div>

            {!appInstalled && installPrompt && (
              <button
                onClick={async () => {
                  installPrompt.prompt()
                  const { outcome } = await installPrompt.userChoice
                  if (outcome === 'accepted') setAppInstalled(true)
                  setInstallPrompt(null)
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-700/50 text-indigo-300 rounded-xl text-sm font-semibold transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" /></svg>
                {lang === 'fr' ? 'Installer l\'app Portfolio' : 'Install Portfolio app'}
              </button>
            )}
            {!appInstalled && !installPrompt && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) && (
              <div className="w-full p-3 bg-blue-950/50 border border-blue-800/50 rounded-xl text-xs text-blue-200 space-y-1">
                <p className="font-semibold text-blue-100">
                  {lang === 'fr' ? 'Ajouter a l\'ecran d\'accueil (iOS)' : 'Add to Home Screen (iOS)'}
                </p>
                <p>1. {lang === 'fr' ? 'Appuyez sur' : 'Tap'} <span className="font-bold">{lang === 'fr' ? 'Partager' : 'Share'}</span> <span className="inline-block rotate-90 font-bold">⬆</span> {lang === 'fr' ? 'en bas de Safari' : 'at the bottom of Safari'}</p>
                <p>2. {lang === 'fr' ? 'Selectionnez' : 'Select'} <span className="font-bold">{lang === 'fr' ? '"Sur l\'ecran d\'accueil"' : '"Add to Home Screen"'}</span></p>
                <p>3. {lang === 'fr' ? 'Appuyez sur' : 'Tap'} <span className="font-bold">{lang === 'fr' ? '"Ajouter"' : '"Add"'}</span></p>
                <p className="text-blue-400 text-xs pt-1">
                  {lang === 'fr' ? 'Fonctionne uniquement dans Safari (pas Chrome iOS).' : 'Works in Safari only (not Chrome iOS).'}
                </p>
              </div>
            )}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={async () => { await shareProfile(); setShareOpen(false) }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white rounded-xl text-sm font-semibold transition-opacity">
                <Share2 size={15} /> {lang === 'fr' ? 'Partager via...' : 'Share via...'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SAVE BAR: fixed mobile, hidden desktop on profil (save is in col 3 there) ── */}
      {activeSection !== 'boutique' && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-gray-800/60 px-4 py-3${activeSection === 'profil' ? ' lg:hidden' : ' lg:static lg:bottom-auto lg:left-auto lg:right-auto'}`}>
          <div className="max-w-3xl mx-auto lg:max-w-none flex items-center gap-3">
            {autoSaving && (
              <span className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Loader2 size={11} className="animate-spin" />
                <span className="hidden sm:inline">{lang === 'fr' ? 'Auto-save...' : 'Auto-saving...'}</span>
              </span>
            )}
            {profile.slug && !autoSaving && (
              <button onClick={() => setShareOpen(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2.5 rounded-xl transition-colors flex-shrink-0">
                <Share2 size={13} /> {lang === 'fr' ? 'Partager' : 'Share'}
              </button>
            )}
            <button onClick={saveProfile} disabled={saving || autoSaving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all
                bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white disabled:opacity-60 disabled:cursor-not-allowed">
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> {t.saving}</>
                : autoSaving
                  ? <><Loader2 size={16} className="animate-spin text-pink-200" /> {lang === 'fr' ? 'Sauvegarde auto...' : 'Auto-saving...'}</>
                  : saved
                    ? <><Check size={16} /> {t.saved}</>
                    : <><Save size={16} /> {t.save}</>
              }
            </button>
          </div>
        </div>
      )}

      </div>{/* end right panel */}
      </div>{/* end split wrapper */}

    </main>
  )
}

function ServiceSection({
  services, lang, onAdd, onDelete
}: {
  services: PortfolioItem[]
  lang: 'fr' | 'en'
  onAdd: (name: string, rate: string) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 space-y-3">
      <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">
        {lang === 'fr' ? 'Mes services & tarifs' : 'My services & rates'}
      </p>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={lang === 'fr' ? 'Ex: Shooting beaute, Placement produit...' : 'e.g. Beauty shoot, Product placement...'}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
        <input value={rate} onChange={e => setRate(e.target.value)}
          placeholder={lang === 'fr' ? 'Tarif' : 'Rate'}
          className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors" />
      </div>
      <button
        onClick={() => { if (name.trim()) { onAdd(name, rate); setName(''); setRate('') } }}
        disabled={!name.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-pink-600/80 to-purple-600/80 hover:opacity-90 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-opacity">
        <Plus size={15} /> {lang === 'fr' ? 'Ajouter' : 'Add'}
      </button>

      {services.length > 0 && (
        <div className="space-y-2 pt-1">
          {services.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{s.title}</p>
                {s.category && <p className="text-pink-400 text-xs">{s.category}</p>}
              </div>
              <button onClick={() => onDelete(s.id)} className="p-1.5 text-gray-700 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
        <p className="text-xs text-gray-300 uppercase tracking-widest font-medium">{t.add_link}</p>
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
