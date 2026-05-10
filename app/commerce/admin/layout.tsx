/**
 * Layout server-side de /commerce/admin
 *
 * Bloque l'acces si l'utilisateur n'est pas authentifie ou n'a pas role
 * 'owner' / 'admin'. Remplace l'ancien gate par mot de passe partage
 * (sessionStorage 'commerce_admin_auth') qui etait insuffisant pour
 * tracer triggered_by='manual:<user_id>' dans amazon_optimization_log.
 *
 * Pre-requis : migration 139 (profiles + roles), avec eric.dufort@cerdia.ai
 * seede en role='owner'.
 */

import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/auth/admin'

export default async function CommerceAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getAdminContext()
  if (!ctx) {
    redirect('/connexion?redirect=/commerce/admin')
  }
  return <>{children}</>
}
