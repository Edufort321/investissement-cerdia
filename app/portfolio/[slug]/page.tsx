'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getTheme } from '@/lib/portfolioTheme'
import { Instagram, Mail, Phone, MapPin, ExternalLink, Link2, ChevronLeft, ChevronRight, X } from 'lucide-react'

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
  description: string
  url: string
  thumbnail_url: string
  category: string
  sort_order: number
}

export default function PortfolioPublicPage() {
  const { slug } = useParams()
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [items, setItems]             = useState<PortfolioItem[]>([])
  const [loading, setLoading]         = useState(true)
  const [lightbox, setLightbox]       = useState<number | null>(null)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const [scrolled, setScrolled]       = useState(false)
  const carouselTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { if (slug) load(slug as string) }, [slug])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const load = async (s: string) => {
    const { data: p } = await supabase
      .from('portfolio_profiles').select('*').eq('slug', s).eq('is_published', true).single()
    if (!p) { setLoading(false); return }
    setProfile(p)
    const { data: its } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', p.id).order('sort_order').order('created_at')
    setItems(its || [])
    setLoading(false)
  }

  const photos    = items.filter(i => i.type === 'photo')
  const videos    = items.filter(i => i.type === 'video')
  const links     = items.filter(i => i.type === 'link')
  const services  = items.filter(i => i.type === 'service')

  const carouselPhotos = photos.length > 0
    ? photos
    : profile?.cover_url
      ? [{ url: profile.cover_url, id: 'cover', type: 'photo', title: '', description: '', thumbnail_url: '', category: '', sort_order: 0 } as PortfolioItem]
      : []

  const advanceCarousel = useCallback(() => {
    setCarouselIdx(i => carouselPhotos.length > 0 ? (i + 1) % carouselPhotos.length : 0)
  }, [carouselPhotos.length])

  useEffect(() => {
    if (carouselPhotos.length <= 1) return
    carouselTimer.current = setInterval(advanceCarousel, 5000)
    return () => { if (carouselTimer.current) clearInterval(carouselTimer.current) }
  }, [carouselPhotos.length, advanceCarousel])

  const prevCarousel = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current)
    setCarouselIdx(i => (i - 1 + carouselPhotos.length) % carouselPhotos.length)
    carouselTimer.current = setInterval(advanceCarousel, 5000)
  }
  const nextCarousel = () => {
    if (carouselTimer.current) clearInterval(carouselTimer.current)
    setCarouselIdx(i => (i + 1) % carouselPhotos.length)
    carouselTimer.current = setInterval(advanceCarousel, 5000)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (lightbox === null) return
      if (e.key === 'ArrowLeft')  setLightbox(l => l !== null ? Math.max(0, l - 1) : null)
      if (e.key === 'ArrowRight') setLightbox(l => l !== null ? Math.min(photos.length - 1, l + 1) : null)
      if (e.key === 'Escape')     setLightbox(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [lightbox, photos.length])

  if (loading) return (
    <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ec4899', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!profile) return (
    <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-6xl mb-4">✦</p>
        <h1 className="text-2xl font-bold text-white mb-2">Portfolio introuvable</h1>
        <p className="text-gray-500">Ce portfolio n&apos;existe pas ou n&apos;est pas public.</p>
      </div>
    </div>
  )

  const th = getTheme(profile.theme, profile.theme_primary, profile.theme_accent)

  return (
    <main className="min-h-[100dvh] text-white font-sans" style={{ backgroundColor: profile.theme === 'or' ? '#080700' : '#030303' }}>

      {/* ── Lightbox ── */}
      {lightbox !== null && photos[lightbox] && (
        <div className="fixed inset-0 z-50 bg-black/97 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0">
            <span className="text-white/30 text-xs tracking-widest">{lightbox + 1} / {photos.length}</span>
            <button onClick={() => setLightbox(null)} className="text-white/50 hover:text-white transition-colors p-1">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 relative min-h-0">
            <button onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? Math.max(0, l - 1) : null) }}
              className="absolute left-3 md:left-6 z-10 p-2.5 bg-black/30 hover:bg-black/60 rounded-full text-white/60 hover:text-white transition-all">
              <ChevronLeft size={24} />
            </button>
            <img src={photos[lightbox].url} alt={photos[lightbox].title || ''}
              className="max-h-full max-w-full object-contain rounded-xl select-none"
              style={{ imageRendering: 'auto' }}
              onClick={e => e.stopPropagation()} draggable={false} />
            <button onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? Math.min(photos.length - 1, l + 1) : null) }}
              className="absolute right-3 md:right-6 z-10 p-2.5 bg-black/30 hover:bg-black/60 rounded-full text-white/60 hover:text-white transition-all">
              <ChevronRight size={24} />
            </button>
          </div>
          {photos[lightbox].title && (
            <div className="text-center pb-6 pt-3 flex-shrink-0">
              <p className="text-white/70 text-sm">{photos[lightbox].title}</p>
            </div>
          )}
        </div>
      )}

      {/* ══ STICKY HEADER ══ */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-5 transition-all duration-500
        ${scrolled ? 'bg-black/90 backdrop-blur-lg border-b shadow-lg' : 'bg-gradient-to-b from-black/50 to-transparent border-transparent'}`}
        style={{ borderColor: scrolled ? th.border : 'transparent' }}>
        <span className="text-[10px] tracking-[0.5em] uppercase font-light select-none" style={{ color: th.primary + '80' }}>
          ✦ Portfolio
        </span>
        <span className="text-white/90 text-sm font-semibold tracking-wider"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {profile.name}
        </span>
        <div className="flex items-center gap-4">
          {profile.instagram_url && (
            <a href={profile.instagram_url} target="_blank" rel="noopener"
              className="text-white/40 transition-colors hover:opacity-80"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => (e.currentTarget.style.color = th.primary)}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
              <Instagram size={16} />
            </a>
          )}
          {profile.contact_email && (
            <a href={`mailto:${profile.contact_email}`}
              className="text-white/40 hover:text-white transition-colors">
              <Mail size={16} />
            </a>
          )}
        </div>
      </header>

      {/* ══ HERO — Carousel plein ecran, sans texte ══ */}
      <section className="relative h-[100dvh] overflow-hidden">
        {carouselPhotos.length > 0 ? (
          <>
            {carouselPhotos.map((photo, idx) => (
              <img key={photo.id} src={photo.url} alt="" draggable={false}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 select-none
                  ${idx === carouselIdx ? 'opacity-100' : 'opacity-0'}`}
                style={{ imageRendering: 'auto' }}
              />
            ))}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.40)_100%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#030303] to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${th.gradFrom}, #030303)` }} />
        )}

        {carouselPhotos.length > 1 && (
          <>
            <button onClick={prevCarousel}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/50 hover:text-white transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextCarousel}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full text-white/50 hover:text-white transition-all">
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {carouselPhotos.map((_, idx) => (
                <button key={idx} onClick={() => setCarouselIdx(idx)}
                  className="h-0.5 rounded-full transition-all duration-300"
                  style={{ width: idx === carouselIdx ? 32 : 8, backgroundColor: idx === carouselIdx ? th.primary : 'rgba(255,255,255,0.25)' }}
                />
              ))}
            </div>
          </>
        )}

        {/* Name overlay at hero bottom */}
        <div className="absolute bottom-16 left-0 right-0 z-20 text-center px-6 pointer-events-none">
          <p className="text-[9px] tracking-[0.6em] uppercase mb-2 font-light select-none" style={{ color: th.primary + '90' }}>
            ✦ Portfolio Artistique
          </p>
          <h2 className="text-4xl md:text-6xl font-bold text-white leading-none drop-shadow-2xl select-none"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em', textShadow: '0 2px 24px rgba(0,0,0,0.7)' }}>
            {profile.name}
          </h2>
          {profile.tagline && (
            <p className="text-sm md:text-base tracking-[0.25em] uppercase mt-2 font-light select-none"
               style={{ color: th.text + 'bb', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
              {profile.tagline}
            </p>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 animate-bounce opacity-30 pointer-events-none">
          <div className="w-5 h-8 rounded-full border border-white/30 flex items-start justify-center pt-1.5">
            <div className="w-1 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* ══ IDENTITY ══ */}
      <section className="relative max-w-3xl mx-auto px-6 py-14">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">

          {profile.headshot_url && (
            <div className="flex-shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-2xl"
                   style={{
                     outline: `2px solid ${th.ring}`,
                     outlineOffset: 4,
                     boxShadow: `0 8px 40px ${th.soft}`,
                   }}>
                <img src={profile.headshot_url} alt={profile.name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }} />
              </div>
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] tracking-[0.5em] uppercase mb-2.5 font-light" style={{ color: th.primary + '70' }}>
              ✦ {profile.tagline ? 'Artiste' : 'Portfolio'}
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-none mb-3"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.02em' }}>
              {profile.name}
            </h1>
            {profile.tagline && (
              <p className="text-sm md:text-base tracking-[0.2em] uppercase mb-4 font-light"
                 style={{ color: th.text + 'cc' }}>
                {profile.tagline}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-white/40 text-xs mb-5 justify-center sm:justify-start">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} /> {profile.location}
                </span>
              )}
              {profile.age_class && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  {{enfant:'4-12 ans', ado:'13-17 ans', adulte:'Adulte', senior:'Senior'}[profile.age_class] ?? profile.age_class}
                </span>
              )}
              {profile.uda_number && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  UDA {profile.uda_number}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {profile.instagram_url && (
                <a href={profile.instagram_url} target="_blank" rel="noopener"
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full text-white/70 hover:text-white transition-all active:scale-95"
                  style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                  <Instagram size={12} /> Instagram
                </a>
              )}
              {profile.tiktok_url && (
                <a href={profile.tiktok_url} target="_blank" rel="noopener"
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full text-white/60 hover:text-white transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <ExternalLink size={12} /> TikTok
                </a>
              )}
              {profile.contact_email && (
                <a href={`mailto:${profile.contact_email}`}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full text-white/60 hover:text-white transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <Mail size={12} /> Contacter
                </a>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full text-white/60 hover:text-white transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <Phone size={12} /> {profile.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ BIO ══ */}
      {profile.bio && (
        <section className="max-w-2xl mx-auto px-6 pb-14 pt-6" style={{ borderTop: `1px solid ${th.border}` }}>
          <div className="flex items-start gap-5">
            <div className="w-0.5 flex-shrink-0 rounded-full mt-1" style={{ minHeight: 40, background: `linear-gradient(to bottom, ${th.primary}60, transparent)` }} />
            <p className="text-gray-300/80 leading-relaxed text-base"
               style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {profile.bio}
            </p>
          </div>
        </section>
      )}

      {/* ══ FICHE PHYSIQUE ══ */}
      {(profile.height_cm || profile.weight_kg || profile.eye_color || profile.hair_color ||
        profile.clothing_size || profile.skin_tone || profile.shoe_size || profile.languages?.length > 0) && (
        <section className="max-w-2xl mx-auto px-6 pb-12">
          <SectionDivider label="Fiche physique" theme={th} />
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {profile.height_cm && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Taille</p>
                <p className="text-white font-semibold text-sm">{profile.height_cm} cm</p>
              </div>
            )}
            {profile.weight_kg && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Poids</p>
                <p className="text-white font-semibold text-sm">{profile.weight_kg} kg</p>
              </div>
            )}
            {profile.eye_color && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Yeux</p>
                <p className="text-white font-semibold text-sm capitalize">{profile.eye_color}</p>
              </div>
            )}
            {profile.hair_color && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Cheveux</p>
                <p className="text-white font-semibold text-sm capitalize">{profile.hair_color}{profile.hair_length ? ' / ' + profile.hair_length : ''}</p>
              </div>
            )}
            {profile.skin_tone && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Teint</p>
                <p className="text-white font-semibold text-sm capitalize">{profile.skin_tone}</p>
              </div>
            )}
            {profile.clothing_size && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Vetements</p>
                <p className="text-white font-semibold text-sm">{profile.clothing_size}</p>
              </div>
            )}
            {profile.shoe_size && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Pointure</p>
                <p className="text-white font-semibold text-sm">{profile.shoe_size}</p>
              </div>
            )}
            {profile.languages?.length > 0 && (
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: th.text + '70' }}>Langues</p>
                <p className="text-white font-semibold text-sm">{(profile.languages || []).join(', ')}</p>
              </div>
            )}
          </div>
          {profile.special_skills && (
            <p className="text-center text-xs mt-3 italic" style={{ color: th.text + '80' }}>{profile.special_skills}</p>
          )}
        </section>
      )}

      {/* ══ GALLERY ══ */}
      {photos.length > 0 && (
        <section className="px-3 md:px-6 py-12 max-w-6xl mx-auto">
          <SectionDivider label="Galerie" theme={th} />
          <div className="mt-8 columns-2 sm:columns-3 md:columns-4 gap-2 md:gap-3 space-y-2 md:space-y-3">
            {photos.map((photo, idx) => (
              <div key={photo.id}
                className="break-inside-avoid relative group cursor-pointer rounded-xl overflow-hidden bg-gray-900"
                onClick={() => setLightbox(idx)}>
                <img src={photo.url} alt={photo.title || ''}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105 group-active:scale-[1.02]"
                  style={{ imageRendering: 'auto' }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 group-active:bg-black/30 transition-all flex items-end p-3 opacity-0 group-hover:opacity-100">
                  {photo.title && <p className="text-white text-xs font-medium drop-shadow-lg">{photo.title}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ VIDEOS ══ */}
      {videos.length > 0 && (
        <section className="px-3 md:px-6 py-8 max-w-4xl mx-auto">
          <SectionDivider label="Videos" theme={th} />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map(video => (
              <div key={video.id} className="rounded-xl overflow-hidden bg-gray-900 border" style={{ borderColor: th.border }}>
                <video controls preload="metadata" className="w-full" poster={video.thumbnail_url || undefined}>
                  <source src={video.url} />
                </video>
                {video.title && (
                  <div className="px-3 py-2">
                    <p className="text-white text-sm font-medium">{video.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ LINKS ══ */}
      {links.length > 0 && (
        <section className="px-4 py-10 max-w-2xl mx-auto">
          <SectionDivider label="Liens & Projets" theme={th} />
          <div className="mt-6 space-y-3">
            {links.map(link => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener"
                className="flex items-center gap-4 p-4 rounded-2xl group transition-all active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${th.border}` }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = th.ring)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = th.border)}>
                {link.thumbnail_url
                  ? <img src={link.thumbnail_url} alt={link.title || ''} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                      <Link2 size={18} style={{ color: th.text }} />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{link.title || link.url}</p>
                  {link.description && <p className="text-gray-500 text-xs truncate mt-0.5">{link.description}</p>}
                </div>
                <ExternalLink size={15} className="text-gray-600 group-hover:text-white transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ══ SERVICES ══ */}
      {services.length > 0 && (
        <section className="px-4 py-10 max-w-2xl mx-auto">
          <SectionDivider label="Services & Tarifs" theme={th} />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map(s => (
              <div key={s.id} className="px-5 py-4 rounded-2xl flex items-center justify-between gap-3"
                style={{ background: th.soft, border: `1px solid ${th.border}` }}>
                <p className="text-white font-medium text-sm">{s.title}</p>
                {s.category && (
                  <span className="text-xs font-semibold flex-shrink-0 px-2.5 py-1 rounded-full"
                    style={{ background: th.ring, color: th.primary }}>
                    {s.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ FOOTER ══ */}
      <footer className="py-16 px-6 text-center mt-8" style={{ borderTop: `1px solid ${th.border}30` }}>
        <div className="text-2xl mb-3 select-none" style={{ color: th.primary + '40' }}>✦</div>
        <p className="text-[10px] tracking-[0.4em] text-gray-600 uppercase mb-6 font-light">Contact & Collaboration</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {profile.contact_email && (
            <a href={`mailto:${profile.contact_email}`}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm active:opacity-70">
              <Mail size={15} /> {profile.contact_email}
            </a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm active:opacity-70">
              <Phone size={15} /> {profile.phone}
            </a>
          )}
          {profile.instagram_url && (
            <a href={profile.instagram_url} target="_blank" rel="noopener"
              className="flex items-center gap-2 text-gray-500 transition-colors text-sm active:opacity-70"
              style={{ color: undefined }}
              onMouseEnter={e => (e.currentTarget.style.color = th.primary)}
              onMouseLeave={e => (e.currentTarget.style.color = '')}>
              <Instagram size={15} /> Instagram
            </a>
          )}
          {profile.tiktok_url && (
            <a href={profile.tiktok_url} target="_blank" rel="noopener"
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm active:opacity-70">
              <ExternalLink size={15} /> TikTok
            </a>
          )}
        </div>
        <p className="text-gray-800 text-xs mt-10 select-none">
          {profile.name} &copy; {new Date().getFullYear()}
        </p>
        <div className="mt-6 flex items-center justify-center gap-1.5">
          <span className="text-gray-800 text-[9px] tracking-[0.35em] uppercase select-none">Portfolio par</span>
          <span className="text-gray-700 text-[9px] tracking-[0.35em] uppercase font-semibold select-none">CERDIA</span>
        </div>
      </footer>
    </main>
  )
}

function SectionDivider({ label, theme }: { label: string; theme: ReturnType<typeof getTheme> }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${theme.primary}30)` }} />
      <h2 className="text-[10px] tracking-[0.45em] uppercase font-light" style={{ color: theme.text + 'aa' }}>{label}</h2>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${theme.primary}30)` }} />
    </div>
  )
}
