export interface PortfolioTheme {
  primary: string    // main accent hex
  soft: string       // primary at ~13% opacity for backgrounds
  border: string     // primary at ~25% opacity for borders
  ring: string       // primary at ~40% opacity for rings
  text: string       // primary at full for text
  gradFrom: string   // gradient start
  gradTo: string     // gradient end
  bgTint: string     // subtle page bg tint
}

const PRESETS: Record<string, PortfolioTheme> = {
  rose: {
    primary: '#ec4899',
    soft:    'rgba(236,72,153,0.13)',
    border:  'rgba(236,72,153,0.25)',
    ring:    'rgba(236,72,153,0.40)',
    text:    '#ec4899',
    gradFrom:'#7e1d4e',
    gradTo:  '#4c1d6e',
    bgTint:  '#0a0508',
  },
  or: {
    primary: '#d4af37',
    soft:    'rgba(212,175,55,0.13)',
    border:  'rgba(212,175,55,0.25)',
    ring:    'rgba(212,175,55,0.40)',
    text:    '#d4af37',
    gradFrom:'#4a3800',
    gradTo:  '#1a1200',
    bgTint:  '#080700',
  },
  argent: {
    primary: '#94a3b8',
    soft:    'rgba(148,163,184,0.12)',
    border:  'rgba(148,163,184,0.22)',
    ring:    'rgba(148,163,184,0.38)',
    text:    '#cbd5e1',
    gradFrom:'#1e2433',
    gradTo:  '#0a0e1a',
    bgTint:  '#060810',
  },
  bleu: {
    primary: '#3b82f6',
    soft:    'rgba(59,130,246,0.13)',
    border:  'rgba(59,130,246,0.25)',
    ring:    'rgba(59,130,246,0.40)',
    text:    '#60a5fa',
    gradFrom:'#1e3a8a',
    gradTo:  '#1e1b4b',
    bgTint:  '#030614',
  },
  nature: {
    primary: '#22c55e',
    soft:    'rgba(34,197,94,0.12)',
    border:  'rgba(34,197,94,0.22)',
    ring:    'rgba(34,197,94,0.38)',
    text:    '#4ade80',
    gradFrom:'#14532d',
    gradTo:  '#052e16',
    bgTint:  '#030a04',
  },
}

export function getTheme(
  themeName?: string | null,
  customPrimary?: string | null,
  customAccent?: string | null
): PortfolioTheme {
  if (themeName === 'custom' && customPrimary) {
    const p = customPrimary
    return {
      primary:  p,
      soft:     hexToRgba(p, 0.13),
      border:   hexToRgba(p, 0.25),
      ring:     hexToRgba(p, 0.40),
      text:     customAccent || p,
      gradFrom: darken(p, 0.7),
      gradTo:   '#0a0a0a',
      bgTint:   '#080808',
    }
  }
  return PRESETS[themeName || 'rose'] ?? PRESETS.rose
}

// Default theme per gender for new profiles
export function defaultThemeForGender(gender?: string | null): string {
  if (gender === 'homme') return 'bleu'
  if (gender === 'femme') return 'rose'
  return 'rose'
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16) || 0
  const g = parseInt(clean.substring(2, 4), 16) || 0
  const b = parseInt(clean.substring(4, 6), 16) || 0
  return `rgba(${r},${g},${b},${alpha})`
}

function darken(hex: string, factor: number): string {
  const clean = hex.replace('#', '')
  const r = Math.round((parseInt(clean.substring(0, 2), 16) || 0) * (1 - factor))
  const g = Math.round((parseInt(clean.substring(2, 4), 16) || 0) * (1 - factor))
  const b = Math.round((parseInt(clean.substring(4, 6), 16) || 0) * (1 - factor))
  return `rgb(${r},${g},${b})`
}

export const THEME_LABELS: Record<string, { fr: string; en: string; preview: string }> = {
  rose:   { fr: 'Rose',     en: 'Rose',   preview: '#ec4899' },
  or:     { fr: 'Or',       en: 'Gold',   preview: '#d4af37' },
  argent: { fr: 'Argent',   en: 'Silver', preview: '#94a3b8' },
  bleu:   { fr: 'Bleu',     en: 'Blue',   preview: '#3b82f6' },
  nature: { fr: 'Nature',   en: 'Nature', preview: '#22c55e' },
  custom: { fr: 'Personnalise', en: 'Custom', preview: '#ffffff' },
}

export const GENDER_LABELS: Record<string, { fr: string; en: string }> = {
  femme:       { fr: 'Femme',       en: 'Woman'     },
  homme:       { fr: 'Homme',       en: 'Man'       },
  'non-binaire': { fr: 'Non-binaire', en: 'Non-binary' },
}

export const AGE_CLASS_LABELS: Record<string, { fr: string; en: string; range: string }> = {
  enfant: { fr: 'Enfant',   en: 'Child',  range: '4-12 ans' },
  ado:    { fr: 'Adolescent', en: 'Teen', range: '13-17 ans' },
  adulte: { fr: 'Adulte',   en: 'Adult',  range: '18-59 ans' },
  senior: { fr: 'Senior',   en: 'Senior', range: '60+ ans' },
}
