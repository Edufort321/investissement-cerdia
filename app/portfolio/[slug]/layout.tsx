import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { data } = await sb
    .from('portfolio_profiles')
    .select('name, tagline, bio, headshot_url, cover_url, slug')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!data) return { title: 'Portfolio Artistique' }

  const imageUrl = data.cover_url || data.headshot_url || null
  const description = data.tagline || (data.bio ? data.bio.slice(0, 155) : 'Portfolio artistique professionnel')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cerdia.ai'
  const pageUrl = `${siteUrl}/portfolio/${data.slug}`

  return {
    title: `${data.name} | Portfolio Artistique`,
    description,
    openGraph: {
      title: data.name,
      description,
      url: pageUrl,
      siteName: 'Portfolio Artistique',
      type: 'profile',
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 450, alt: data.name }],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: data.name,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  }
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
