'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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

const CATEGORY_COLORS: Record<string, string> = {
  editorial:  'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
  commercial: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  beauty:     'bg-pink-400/20 text-pink-300 border-pink-400/30',
  fashion:    'bg-purple-400/20 text-purple-300 border-purple-400/30',
  lifestyle:  'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  portfolio:  'bg-gray-400/20 text-gray-300 border-gray-400/30',
}

export default function PortfolioPublicPage() {
  const { slug } = useParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [carouselIdx, setCarouselIdx] = useState(0)
  const carouselTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (slug) load(slug as string)
  }, [slug])

  const load = async (s: string) => {
    const { data: p } = await supabase.from('portfolio_profiles').select('*').eq('slug', s).eq('is_published', true).single()
    if (!p) { setLoading(false); return }
    setProfile(p)
    const { data: its } = await supabase.from('portfolio_items').select('*')
      .eq('profile_id', p.id).order('sort_order').order('created_at')
    setItems(its || [])
    setLoading(false)
  }

  const photos = items.filter(i => i.type === 'photo')
  const links = items.filter(i => i.type === 'link' || i.type === 'video')

  // Carousel auto-advance every 5s
  const carouselPhotos = photos.length > 0 ? photos : (profile?.cover_url ? [{ url: profile.cover_url, id: 'cover', type: 'photo', title: '', description: '', thumbnail_url: '', category: 'portfolio', sort_order: 0 } as PortfolioItem] : [])

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

  const prevPhoto = () => setLightbox(l => l !== null ? Math.max(0, l - 1) : null)
  const nextPhoto = () => setLightbox(l => l !== null ? Math.min(photos.length - 1, l + 1) : null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightbox !== null) {
        if (e.key === 'ArrowLeft') prevPhoto()
        if (e.key === 'ArrowRight') nextPhoto()
        if (e.key === 'Escape') setLightbox(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightbox])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-6xl mb-4">✦</p>
          <h1 className="text-2xl font-bold text-white mb-2">Portfolio introuvable</h1>
          <p className="text-gray-500">Ce portfolio n&apos;existe pas ou n&apos;est pas public.</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button onClick={() => setLightbox(null)} className="absolute top-5 right-5 text-white/70 hover:text-white">
            <X size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
          >
            <ChevronLeft size={36} />
          </button>
          <img
            src={photos[lightbox].url}
            alt={photos[lightbox].title || ''}
            className="max-h-screen max-w-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/50 hover:text-white transition-colors"
          >
            <ChevronRight size={36} />
          </button>
          {photos[lightbox].title && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
              <p className="text-white font-medium">{photos[lightbox].title}</p>
              {photos[lightbox].category && (
                <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CATEGORY_COLORS[photos[lightbox].category] || CATEGORY_COLORS.portfolio}`}>
                  {photos[lightbox].category}
                </span>
              )}
            </div>
          )}
          <div className="absolute bottom-4 right-6 text-xs text-white/30">
            {lightbox + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* ══════════════ HERO — Carrousel plein écran ══════════════ */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* ── Carousel images ── */}
        {carouselPhotos.length > 0 ? (
          <>
            {carouselPhotos.map((photo, idx) => (
              <img
                key={photo.id}
                src={photo.url}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000
                  ${idx === carouselIdx ? 'opacity-70' : 'opacity-0'}`}
              />
            ))}
            {/* Vignettte edges */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-950 to-black" />
        )}

        {/* Bottom fade to page background */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-950 to-transparent" />
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

        {/* ── Carousel controls ── */}
        {carouselPhotos.length > 1 && (
          <>
            <button
              onClick={prevCarousel}
              className="absolute left-5 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/30 hover:bg-black/60 backdrop-blur-sm rounded-full text-white/60 hover:text-white transition-all"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={nextCarousel}
              className="absolute right-5 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/30 hover:bg-black/60 backdrop-blur-sm rounded-full text-white/60 hover:text-white transition-all"
            >
              <ChevronRight size={22} />
            </button>
            {/* Progress dots */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {carouselPhotos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIdx(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${idx === carouselIdx ? 'bg-pink-400 w-6' : 'bg-white/30 w-2'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* ── TITRE — centré, très visible ── */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto">

          {/* Photo profil en médaillon */}
          {profile.headshot_url && (
            <div className="mb-8 relative">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden ring-2 ring-pink-400/60 ring-offset-4 ring-offset-transparent shadow-2xl">
                <img src={profile.headshot_url} alt={profile.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -inset-1.5 rounded-full border border-white/10" />
            </div>
          )}

          {/* Étiquette discrète */}
          <p className="text-pink-400/70 text-xs tracking-[0.35em] uppercase mb-4 font-light">
            ✦ Portfolio ✦
          </p>

          {/* NOM — grand, avec text-shadow fort */}
          <h1
            className="text-6xl md:text-8xl font-bold text-white mb-3 leading-none"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.6)',
              letterSpacing: '-0.02em'
            }}
          >
            {profile.name}
          </h1>

          {/* Tagline */}
          {profile.tagline && (
            <p
              className="text-pink-300 text-sm md:text-base tracking-[0.25em] uppercase mt-2 font-light"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
            >
              {profile.tagline}
            </p>
          )}

          {/* Lieu */}
          {profile.location && (
            <p
              className="flex items-center gap-1.5 text-white/50 text-xs mt-3"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              <MapPin size={11} /> {profile.location}
            </p>
          )}

          {/* UDA */}
          {profile.uda_number && (
            <p
              className="text-white/40 text-xs mt-1.5"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              UDA {profile.uda_number}
            </p>
          )}

          {/* Liens sociaux */}
          <div className="flex items-center gap-5 mt-6">
            {profile.instagram_url && (
              <a href={profile.instagram_url} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-pink-400 transition-colors backdrop-blur-sm bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                <Instagram size={13} /> Instagram
              </a>
            )}
            {profile.tiktok_url && (
              <a href={profile.tiktok_url} target="_blank" rel="noopener"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-purple-400 transition-colors backdrop-blur-sm bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                <ExternalLink size={13} /> TikTok
              </a>
            )}
            {profile.contact_email && (
              <a href={`mailto:${profile.contact_email}`}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors backdrop-blur-sm bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
                <Mail size={13} /> Contact
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Bio */}
      {profile.bio && (
        <section className="max-w-2xl mx-auto px-6 py-12 text-center border-t border-gray-800/50">
          <div className="text-pink-500/60 text-2xl mb-4">✦</div>
          <p className="text-gray-300 leading-relaxed text-base" style={{ fontFamily: 'Georgia, serif' }}>
            {profile.bio}
          </p>
        </section>
      )}

      {/* Photo gallery */}
      {photos.length > 0 && (
        <section className="px-6 py-12 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />
            <h2 className="text-xs tracking-[0.3em] text-pink-400/80 uppercase">Portfolio</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-pink-500/30 to-transparent" />
          </div>

          {/* Masonry-style grid */}
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="break-inside-avoid relative group cursor-pointer rounded-lg overflow-hidden"
                onClick={() => setLightbox(idx)}
              >
                <img
                  src={photo.url}
                  alt={photo.title || ''}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end p-3 opacity-0 group-hover:opacity-100">
                  {photo.title && <p className="text-white text-xs font-medium">{photo.title}</p>}
                </div>
                {photo.category && photo.category !== 'portfolio' && (
                  <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full border capitalize opacity-0 group-hover:opacity-100 transition-opacity ${CATEGORY_COLORS[photo.category] || CATEGORY_COLORS.portfolio}`}>
                    {photo.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Links */}
      {links.length > 0 && (
        <section className="px-6 py-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            <h2 className="text-xs tracking-[0.3em] text-purple-400/80 uppercase">Liens & Projets</h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-purple-500/30 to-transparent" />
          </div>
          <div className="space-y-3">
            {links.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-4 p-4 bg-gray-900/60 hover:bg-gray-800/60 rounded-xl border border-gray-800 hover:border-gray-600 group transition-all"
              >
                {link.thumbnail_url
                  ? <img src={link.thumbnail_url} alt={link.title || ''} className="w-12 h-12 rounded-lg object-cover" />
                  : <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center border border-purple-500/20">
                      <Link2 size={18} className="text-purple-400" />
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

      {/* Contact footer */}
      <section className="border-t border-gray-800/50 py-16 px-6 text-center mt-8">
        <div className="text-pink-500/40 text-xl mb-3">✦</div>
        <p className="text-xs tracking-[0.3em] text-gray-500 uppercase mb-6">Contact & Collaboration</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {profile.contact_email && (
            <a href={`mailto:${profile.contact_email}`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <Mail size={16} /> {profile.contact_email}
            </a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <Phone size={16} /> {profile.phone}
            </a>
          )}
          {profile.instagram_url && (
            <a href={profile.instagram_url} target="_blank" rel="noopener"
              className="flex items-center gap-2 text-gray-400 hover:text-pink-400 transition-colors text-sm">
              <Instagram size={16} /> Instagram
            </a>
          )}
        </div>
        <p className="text-gray-700 text-xs mt-10">
          {profile.name} &copy; {new Date().getFullYear()}
        </p>
      </section>
    </main>
  )
}
