'use client'

// Garde central : un administrateur de rôle `org_commerce` (admin COMMERCE seulement) n'a PAS accès à la
// zone investisseur. S'il navigue ailleurs que /commerce, on le redirige vers /commerce/admin.
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useOrganization } from '@/contexts/OrganizationContext'

export function CommerceRoleGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useOrganization() as any
  const pathname = usePathname() || ''
  const router = useRouter()

  useEffect(() => {
    if (profile?.role !== 'org_commerce') return
    const allowed = pathname.startsWith('/commerce') || pathname.startsWith('/connexion')
      || pathname.startsWith('/onboarding') || pathname.startsWith('/scan') || pathname === '/'
    if (!allowed) router.replace('/commerce/admin')
  }, [profile?.role, pathname, router])

  return <>{children}</>
}
