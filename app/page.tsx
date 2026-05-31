'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, MapPin, TrendingUp, Shield, Globe, Sparkles } from 'lucide-react'
import PublicChatWidget from '@/components/PublicChatWidget'

const SLIDES_FALLBACK = [
  {
    image: '/cerdia-slide-immobilier.png',
    flag: '🇩🇴',
    location: 'République Dominicaine',
    sub: 'Punta Cana · Cabarete · Las Terrenas',
    stat: '6–12 %',
    label_fr: 'rendement locatif annuel',
    label_en: 'annual rental yield',
  },
  {
    image: '/cerdia-slide-location.png',
    flag: '🇲🇽',
    location: 'Riviera Maya',
    sub: 'Tulum · Playa del Carmen · Cancún',
    stat: '8–15 %',
    label_fr: 'rendement locatif annuel',
    label_en: 'annual rental yield',
  },
  {
    image: '/cerdia-slide-intelligence.png',
    flag: '🇺🇸',
    location: 'Floride',
    sub: 'Miami · Fort Lauderdale · Tampa',
    stat: '5–9 %',
    label_fr: 'appréciation annuelle du capital',
    label_en: 'annual capital appreciation',
  },
]

export default function Home() {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [saasProducts, setSaasProducts] = useState<{ title: string; price: number | null; currency: string; description?: string }[]>([])
  // Prix annuel de la plateforme (organizations.settings.saas_pricing) — affiché en public.
  const [platformPrice, setPlatformPrice] = useState<{ annual: number; currency: string } | null>(null)
  const [dbSlides, setDbSlides] = useState<typeof SLIDES_FALLBACK | null>(null)
  const [platformImages, setPlatformImages] = useState<string[]>([])
  const [platformIdx, setPlatformIdx] = useState(0)

  useEffect(() => {
    supabase
      .from('commerce_products')
      .select('title, price, currency, description')
      .eq('category', 'saas')
      .eq('active', true)
      .order('price', { ascending: true })
      .then(({ data }) => { if (data) setSaasProducts(data) })

    // Prix annuel de la plateforme via la vue publique dédiée (n'expose que le prix).
    supabase
      .from('platform_public_pricing')
      .select('annual_amount_cad, currency')
      .maybeSingle()
      .then(({ data }) => {
        const amt = Number(data?.annual_amount_cad)
        if (data && amt > 0) setPlatformPrice({ annual: amt, currency: data.currency || 'CAD' })
      })

    supabase
      .from('home_slides')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return
        const hero = data.filter((d: any) => d.type === 'hero' || !d.type)
        const platform = data.filter((d: any) => d.type === 'platform')
        if (hero.length > 0) {
          const hasContent = hero.some((d: any) => d.location?.trim())
          if (hasContent) {
            // La DB porte le contenu → on affiche TOUS les slides de la DB
            // (le fallback ne sert que de valeurs par défaut champ par champ).
            setDbSlides(hero.map((db: any, i: number) => {
              const s = SLIDES_FALLBACK[i % SLIDES_FALLBACK.length]
              return {
                image: db.image_url,
                flag: db.flag || '',
                location: db.location || s.location,
                sub: db.sub || s.sub,
                stat: db.stat || s.stat,
                label_fr: db.label_fr || s.label_fr,
                label_en: db.label_en || s.label_en,
              }
            }))
          } else {
            // Pas de contenu en DB → on garde le texte du fallback et on remplace
            // seulement les images, dans l'ordre, pour TOUS les slides DB fournis.
            setDbSlides(hero.map((db: any, i: number) => ({
              ...SLIDES_FALLBACK[i % SLIDES_FALLBACK.length],
              image: db.image_url,
            })))
          }
        }
        if (platform.length > 0) {
          setPlatformImages(platform.map((d: any) => d.image_url))
        }
      })
  }, [])

  useEffect(() => {
    if (platformImages.length < 2) return
    const t = setInterval(() => setPlatformIdx(i => (i + 1) % platformImages.length), 4000)
    return () => clearInterval(t)
  }, [platformImages])

  const SLIDES = dbSlides ?? SLIDES_FALLBACK

  // Dépend de SLIDES.length : quand les slides DB arrivent (3 fallback → 8),
  // le timer doit reboucler sur le bon nombre (sinon l'auto-défilement reste à 3).
  const advance = useCallback(() => setIdx(i => (i + 1) % SLIDES.length), [SLIDES.length])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(advance, 5000)
  }, [advance])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  const handleNext = () => { setIdx(i => (i + 1) % SLIDES.length); resetTimer() }
  const handlePrev = () => { setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length); resetTimer() }
  const goTo = (i: number) => { setIdx(i); resetTimer() }

  const s = SLIDES[idx]

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white">

      {/* ── HERO CAROUSEL ─────────────────────────────────────────────── */}
      <section className="relative h-screen overflow-hidden select-none">
        {/* Flèches coins — discrètes */}
        <button onClick={handlePrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 text-white/30 hover:text-white/80 transition-colors">
          <ChevronLeft size={28} strokeWidth={1.5} />
        </button>
        <button onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 text-white/30 hover:text-white/80 transition-colors">
          <ChevronRight size={28} strokeWidth={1.5} />
        </button>
        {/* Background slides */}
        {SLIDES.map((slide, i) => (
          <div key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
          >
            <div className="absolute inset-0 scale-[1.04]"
              style={{
                backgroundImage: `url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.55) saturate(1.08)',
              }}
            />
          </div>
        ))}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e]/70 via-transparent to-transparent pointer-events-none" />

        {/* Sélecteur d'intention — style épuré sans bulle, à la manière du hero */}
        <div className="absolute top-24 sm:top-28 inset-x-0 z-20 px-6 flex flex-col items-center gap-4 text-center pointer-events-none">
          <p className="pointer-events-auto text-amber-400 text-xs tracking-[0.25em] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
            {fr ? 'Vous cherchez à…' : 'You are looking to…'}
          </p>
          <div className="pointer-events-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-8">
            <a href="#plateforme" className="group flex items-center gap-2.5 text-white text-lg sm:text-xl font-serif font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:text-amber-300 transition-colors">
              <span className="text-base">🏢</span>
              <span className="border-b border-white/25 group-hover:border-amber-300 pb-1 transition-colors">
                {fr ? 'Gérer mon parc immobilier' : 'Manage my real estate'}
              </span>
            </a>
            <span className="hidden sm:block text-amber-400/50 text-xl">·</span>
            <a href="#investisseur" className="group flex items-center gap-2.5 text-white text-lg sm:text-xl font-serif font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:text-amber-300 transition-colors">
              <span className="text-base">📈</span>
              <span className="border-b border-white/25 group-hover:border-amber-300 pb-1 transition-colors">
                {fr ? 'Devenir investisseur' : 'Become an investor'}
              </span>
            </a>
          </div>
        </div>

        {/* Slide content */}
        <div className="relative z-10 h-full flex flex-col justify-end pb-20 px-8 md:px-16 max-w-7xl mx-auto">
          <div key={idx} className="flex flex-col gap-5">
            {s.sub && (
              <p className="text-amber-400 text-xs font-medium tracking-[0.25em] uppercase">
                {s.sub}
              </p>
            )}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold font-serif leading-none text-white">
              {s.location}
            </h1>
            {s.stat && (
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">
                  {fr ? s.label_fr : s.label_en}
                </p>
                <p className="text-3xl md:text-4xl font-bold text-amber-400 leading-none">{s.stat}</p>
              </div>
            )}
            <Link href="/investir">
              <button className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-3 rounded-full text-sm tracking-wide transition-all hover:shadow-lg hover:shadow-amber-400/25 mt-2">
                {fr ? 'Investir maintenant' : 'Invest now'}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-[#111115]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { val: '3',     lf: 'marchés internationaux',      le: 'international markets'   },
            { val: '83 %',  lf: "taux d'occupation — Tulum",   le: 'occupancy rate — Tulum'  },
            { val: '8–15 %',lf: 'rendement locatif cible',     le: 'target rental yield'     },
            { val: '100 %', lf: 'autofinancé — zéro dette',    le: 'self-funded — zero debt' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-2xl md:text-3xl font-bold text-amber-400">{s.val}</p>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">{fr ? s.lf : s.le}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DESTINATIONS ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-amber-400 text-xs tracking-[0.25em] uppercase mb-3">
          {fr ? 'Nos marchés cibles' : 'Our target markets'}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-12 text-white">
          {fr ? 'Opportunités à haut rendement' : 'High-yield opportunities'}
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              flag: '🇩🇴', name: 'République Dominicaine', sub: 'Punta Cana · Cabarete',
              stat: '6–12 %', active: true,
              df: "3 unités déjà sécurisées. Croissance touristique +9% en 2024 (11M visiteurs). Régime CONFOTUR : 15 ans d'exonération fiscale totale. Rendement locatif brut parmi les plus compétitifs des Caraïbes.",
              de: '3 units already secured. +9% tourism growth in 2024 (11M visitors). CONFOTUR regime: 15-year full tax exemption. Among the most competitive gross rental yields in the Caribbean.',
            },
            {
              flag: '🇲🇽', name: 'Riviera Maya', sub: 'Tulum · Playa del Carmen',
              stat: '8–15 %', active: false,
              df: "Taux d'occupation annuel de 83% à Tulum. Prix 60–70% inférieurs à Miami pour des biens équivalents. Marché résidentiel en hausse de 8.8% en 2025. Demande locative saisonnière exceptionnelle.",
              de: '83% annual occupancy rate in Tulum. Prices 60–70% below Miami for equivalent properties. Residential market up 8.8% in 2025. Exceptional seasonal rental demand.',
            },
            {
              flag: '🇺🇸', name: 'Floride', sub: 'Miami · Fort Lauderdale · Tampa',
              stat: '5–9 %', active: false,
              df: "Appréciation du capital soutenue. Aucun impôt sur le revenu de l'État. Marché locatif robuste alimenté par une migration constante. Déploiement CERDIA prévu — liste d'attente ouverte.",
              de: 'Sustained capital appreciation. No state income tax. Robust rental market fueled by steady migration. CERDIA deployment planned — waitlist open.',
            },
          ].map((d, i) => (
            <div key={i}
              className={`rounded-2xl p-6 border flex flex-col gap-4 transition-colors ${d.active
                ? 'border-amber-400/20 bg-[#111115] hover:border-amber-400/40'
                : 'border-white/5 bg-[#0f0f12]'}`}>
              <div className="flex items-start justify-between">
                <span className="text-3xl">{d.flag ?? ''}</span>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${d.active
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'bg-white/5 text-gray-600'}`}>
                  {d.active ? (fr ? 'Actif' : 'Active') : (fr ? 'Bientôt' : 'Coming soon')}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white">{d.name}</h3>
                <p className="text-gray-600 text-xs uppercase tracking-widest mt-0.5">{d.sub}</p>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">{fr ? d.df : d.de}</p>
              <div className="pt-2 border-t border-white/5">
                <p className="text-2xl font-bold text-amber-400">{d.stat}</p>
                <p className="text-gray-600 text-xs mt-0.5">{fr ? 'rendement cible' : 'target yield'}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── APPROCHE CERDIA ──────────────────────────────────────────── */}
      <section className="bg-[#111115] py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-amber-400 text-xs tracking-[0.25em] uppercase mb-3">
            {fr ? 'Notre approche' : 'Our approach'}
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-14 max-w-xl leading-tight text-white">
            {fr ? "L'investissement immobilier, réinventé" : 'Real estate investment, reinvented'}
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                Icon: Shield,
                tf: 'Sélection rigoureuse',
                te: 'Rigorous selection',
                df: "Chaque marché est analysé selon des critères stricts : emplacement, taux d'occupation, potentiel d'appréciation et rendement net projeté à 10 ans.",
                de: 'Each market is analyzed against strict criteria: location, occupancy rate, appreciation potential and projected 10-year net yield.',
              },
              {
                Icon: TrendingUp,
                tf: 'Optimisation par IA',
                te: 'AI optimization',
                df: "Intelligence artificielle appliquée à la gestion locative : tarification dynamique, détection des opportunités et maximisation du rendement saison par saison.",
                de: 'Artificial intelligence applied to rental management: dynamic pricing, opportunity detection and return maximization season by season.',
              },
              {
                Icon: Globe,
                tf: 'Portefeuille international',
                te: 'International portfolio',
                df: "Diversification sur 3 marchés à fort potentiel. Objectif 2045 : 15 à 25 propriétés, valeur nette projetée 12–18 M$, 100% autofinancé sans dette bancaire.",
                de: 'Diversification across 3 high-potential markets. 2045 goal: 15 to 25 properties, projected net value $12–18M, 100% self-funded with no bank debt.',
              },
            ].map(({ Icon, tf, te, df, de }, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-semibold text-white">{fr ? tf : te}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{fr ? df : de}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATEFORME MULTI-TENANT ──────────────────────────────────── */}
      <section id="plateforme" className="relative overflow-hidden py-20 scroll-mt-24">

        {/* Carrousel de fond — section plateforme */}
        {platformImages.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {platformImages.map((url, i) => (
              <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === platformIdx ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0" style={{
                  backgroundImage: `url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'brightness(0.55) saturate(1.08)',
                }} />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e]/85 via-[#0c0c0e]/55 to-[#0c0c0e]/30" />
          </div>
        )}

        <div className="relative max-w-7xl mx-auto px-6">
        <p className="text-amber-400 text-xs tracking-[0.25em] uppercase mb-3">
          {fr ? 'Pour les organisations' : 'For organizations'}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-3 text-white">
          {fr ? 'Plateforme de gestion immobilière' : 'Real estate management platform'}
        </h2>
        <p className="text-gray-300 text-base mb-4 max-w-2xl leading-relaxed">
          {fr
            ? "Pilotez l'ensemble de votre parc immobilier international depuis un seul tableau de bord. CERDIA réunit la gestion des propriétés, le suivi des investisseurs, la valeur nette par part (NAV), la trésorerie et la conformité fiscale multi-juridiction — le tout automatisé et assisté par intelligence artificielle."
            : "Manage your entire international real estate portfolio from a single dashboard. CERDIA brings together property management, investor tracking, net asset value (NAV), treasury and multi-jurisdiction tax compliance — all automated and AI-assisted."}
        </p>
        <p className="text-gray-400 text-sm mb-10 max-w-2xl leading-relaxed">
          {fr
            ? "Conçue pour les sociétés de gestion, family offices et groupes d'investisseurs qui détiennent des actifs au Canada, en République Dominicaine, aux États-Unis et au Mexique. Architecture multi-tenant sécurisée : chaque organisation est totalement isolée."
            : "Built for management companies, family offices and investor groups holding assets in Canada, the Dominican Republic, the United States and Mexico. Secure multi-tenant architecture: every organization is fully isolated."}
        </p>

        {/* Bénéfices clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12 max-w-4xl">
          {(fr ? [
            { t: 'Suivi de portefeuille en temps réel', d: 'Valeur des propriétés, NAV par part, rendements et appréciation — actualisés en continu.' },
            { t: 'Multi-devise automatique', d: 'CAD, USD, DOP, MXN, EUR convertis aux taux de la Banque du Canada en direct.' },
            { t: 'Conformité fiscale intégrée', d: 'T1135, T2209, IRNR, ITBIS, FIRPTA, TDT — calculés et révisés selon chaque juridiction.' },
            { t: 'Gestion des investisseurs', d: 'Parts, classes d\'actions, votes sur scénarios, dividendes et relevés T5.' },
            { t: 'Trésorerie & rapports', d: 'Compte courant, flux, échéanciers de paiement et rapports comptables exportables.' },
            { t: 'Assistant IA intégré', d: 'Un agent vous guide dans la plateforme et la saisie, en toute confidentialité.' },
          ] : [
            { t: 'Real-time portfolio tracking', d: 'Property values, NAV per share, yields and appreciation — continuously updated.' },
            { t: 'Automatic multi-currency', d: 'CAD, USD, DOP, MXN, EUR converted at live Bank of Canada rates.' },
            { t: 'Built-in tax compliance', d: 'T1135, T2209, IRNR, ITBIS, FIRPTA, TDT — computed and reviewed per jurisdiction.' },
            { t: 'Investor management', d: 'Shares, share classes, scenario voting, dividends and T5 slips.' },
            { t: 'Treasury & reports', d: 'Current account, cash flow, payment schedules and exportable accounting reports.' },
            { t: 'Built-in AI assistant', d: 'An agent guides you through the platform and data entry, fully privately.' },
          ]).map((b) => (
            <div key={b.t} className="rounded-xl border border-white/10 bg-[#111115] p-4">
              <p className="text-white text-sm font-semibold mb-1.5 flex items-center gap-2">
                <span className="text-amber-400">✓</span> {b.t}
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
          {/* Demo CTA */}
          <Link href="/demo">
            <div className="rounded-2xl border border-white/10 bg-[#111115] hover:border-amber-400/30 p-6 h-full cursor-pointer transition-colors group flex flex-col justify-between gap-6">
              <div>
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center mb-4">
                  <Sparkles size={17} className="text-amber-400" />
                </div>
                <p className="text-white font-semibold mb-2">{fr ? 'Essai gratuit' : 'Free trial'}</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {fr
                    ? "Explorez la plateforme sans engagement. Accès complet au tableau de bord démo avec données réelles."
                    : "Explore the platform with no commitment. Full access to demo dashboard with real data."}
                </p>
              </div>
              <span className="text-amber-400 text-xs font-semibold flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                {fr ? 'Démarrer la démo' : 'Start demo'} <ChevronRight size={13} />
              </span>
            </div>
          </Link>

          {/* Prix d'abonnement plateforme (organizations.settings) ou produit SaaS commerce */}
          {(() => {
            // Priorité au prix annuel de la plateforme ; sinon premier produit SaaS commerce.
            const annual = platformPrice?.annual ?? null
            const curr = platformPrice?.currency || saasProducts[0]?.currency || 'CAD'
            const hasPrice = annual !== null || (saasProducts.length > 0 && saasProducts[0].price != null)
            const amount = annual !== null ? annual : (saasProducts[0]?.price ?? null)
            const period = annual !== null ? (fr ? 'an' : 'yr') : (fr ? 'mois' : 'mo')
            return (
              <div className={`rounded-2xl border p-6 flex flex-col justify-between gap-6 ${hasPrice ? 'border-amber-400/25 bg-[#111115]' : 'border-white/5 bg-[#0f0f12] opacity-60'}`}>
                <div>
                  <p className="text-amber-400 text-xs uppercase tracking-widest mb-1">{fr ? 'Abonnement plateforme' : 'Platform subscription'}</p>
                  <p className="text-white/50 text-xs mb-4">
                    {fr ? 'Plateforme Multi-Tenant — Organisation' : 'Multi-Tenant Platform — Organization'}
                  </p>
                  <p className="text-4xl font-bold text-white leading-none">
                    {amount != null
                      ? amount.toLocaleString(fr ? 'fr-CA' : 'en-CA', { style: 'currency', currency: curr, minimumFractionDigits: 0 })
                      : '—'}
                    <span className="text-gray-500 text-sm font-normal ml-1">/ {period}</span>
                  </p>
                  <p className="text-gray-400 text-xs leading-relaxed mt-3">
                    {fr
                      ? 'Portefeuilles, locataires, rendements, rapports fiscaux et IA — tout inclus, par organisation.'
                      : 'Portfolios, tenants, yields, tax reports and AI — all included, per organization.'}
                  </p>
                </div>
                <Link href="/investir" className="block">
                  <button className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold py-2.5 rounded-full text-xs tracking-wide transition-all">
                    {fr ? 'Nous contacter' : 'Contact us'}
                  </button>
                </Link>
              </div>
            )
          })()}
        </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────── */}
      <section id="investisseur" className="py-28 px-6 text-center scroll-mt-24">
        <div className="max-w-3xl mx-auto">
          <p className="text-amber-400 text-xs tracking-[0.25em] uppercase mb-5">
            {fr ? 'Accès investisseur' : 'Investor access'}
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight text-white">
            {fr
              ? "Construisez votre patrimoine à l'international"
              : 'Build your international wealth'}
          </h2>
          <p className="text-gray-300 mb-4 leading-relaxed text-base">
            {fr
              ? "Rejoignez un réseau sélect d'investisseurs et accédez à des opportunités immobilières exclusives en République Dominicaine, au Mexique et en Floride — des marchés à fort potentiel locatif et d'appréciation, sélectionnés et optimisés par CERDIA."
              : "Join a select network of investors and access exclusive real estate opportunities in the Dominican Republic, Mexico and Florida — high-potential rental and appreciation markets, selected and optimized by CERDIA."}
          </p>
          <p className="text-gray-400 mb-10 leading-relaxed text-sm">
            {fr
              ? "Vous investissez dans des projets concrets, suivez la valeur de vos parts en temps réel, recevez des rapports transparents et bénéficiez d'une structure fiscale conforme — sans gérer les opérations vous-même."
              : "You invest in concrete projects, track the value of your shares in real time, receive transparent reports and benefit from a compliant tax structure — without managing operations yourself."}
          </p>

          {/* Arguments investisseur */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left">
            {(fr ? [
              { t: 'Opportunités sélectionnées', d: 'Projets analysés et optimisés avant d\'être proposés — qualité avant quantité.' },
              { t: 'Transparence totale', d: 'Valeur de vos parts (NAV), rapports et performance accessibles en continu.' },
              { t: 'Gestion clé en main', d: 'Acquisition, location et revente prises en charge. Vous restez passif.' },
            ] : [
              { t: 'Curated opportunities', d: 'Projects analyzed and optimized before being offered — quality over quantity.' },
              { t: 'Full transparency', d: 'Your share value (NAV), reports and performance available continuously.' },
              { t: 'Turnkey management', d: 'Acquisition, rental and resale handled for you. You stay passive.' },
            ]).map((b) => (
              <div key={b.t} className="rounded-xl border border-white/10 bg-[#111115] p-4">
                <p className="text-white text-sm font-semibold mb-1.5 flex items-center gap-2">
                  <span className="text-amber-400">✓</span> {b.t}
                </p>
                <p className="text-gray-400 text-xs leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>

          <Link href="/investir">
            <button className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-12 py-4 rounded-full text-sm tracking-wide transition-all hover:shadow-xl hover:shadow-amber-400/20">
              {fr ? 'Devenir investisseur' : 'Become an investor'}
            </button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© 2025 CERDIA. {fr ? 'Tous droits réservés.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">
              {fr ? 'Confidentialité' : 'Privacy'}
            </Link>
            <Link href="/vision-cerdia" className="hover:text-gray-400 transition-colors">
              {fr ? 'Notre vision' : 'Our vision'}
            </Link>
          </div>
        </div>
      </footer>

      {/* Chatbot public marketing — info plateforme + orientation démo/courriel */}
      <PublicChatWidget />
    </div>
  )
}
