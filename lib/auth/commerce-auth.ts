import { type NextRequest } from 'next/server'
import { requireAdminToken } from './require-admin-token'

// Autorisation des endpoints du pont commerce C-Secur360.
// Deux voies acceptées :
//   1) Secret de pont (serveur→serveur) : Bearer CSECUR360_SYNC_SECRET — utilisé par C-Secur360 pour
//      pousser/tirer les données, et par la route /sync pour appeler C-Secur360.
//   2) Session admin connectée : un token Supabase valide dont le rôle est admin (super_admin, owner,
//      org_admin, admin OU **org_commerce**). C'est ce qui permet à l'admin COMMERCE de lire/agir
//      depuis /commerce/admin sans dépendre d'un secret embarqué dans le navigateur.
// Fail-secure : sans secret configuré, seule la session admin est acceptée.
const SYNC_SECRET = process.env.CSECUR360_SYNC_SECRET

export function isSyncSecret(req: NextRequest): boolean {
  return !!SYNC_SECRET && req.headers.get('authorization') === `Bearer ${SYNC_SECRET}`
}

export async function authorizeCommerce(req: NextRequest): Promise<boolean> {
  if (isSyncSecret(req)) return true
  try { await requireAdminToken(req); return true } catch { return false }
}
