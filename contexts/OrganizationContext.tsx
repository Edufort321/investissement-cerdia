'use client'

/**
 * OrganizationContext — context tenant pour la plateforme multi-tenant.
 *
 * Charge le profil étendu (profiles.organization_id, role) + l'organisation
 * (table organizations) du user authentifié. Expose le branding (nom, logo,
 * settings) et le statut super_admin pour le support technique cross-tenant.
 *
 * Workflow :
 *   1. useAuth() fournit supabaseUser
 *   2. On fetch profiles WHERE id = supabaseUser.id → { organization_id, role, ... }
 *   3. On fetch organizations WHERE id = profile.organization_id → branding + settings
 *   4. Si super_admin + override dans localStorage (cerdia_org_override) → on fetch
 *      cet autre tenant et on l'expose comme `organization` (vue support).
 *      `realOrganization` garde toujours le vrai tenant du user.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'org_admin' | 'org_investor' | 'org_user' | 'org_viewer'

export interface Organization {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  settings: Record<string, any>
  features: Record<string, any>
  plan: 'basic' | 'pro' | 'enterprise' | 'demo' | 'internal'
  status: 'active' | 'suspended' | 'archived'
  is_demo: boolean
  onboarding_completed: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  organization_id: string
  role: UserRole
  full_name: string | null
  onboarding_completed: boolean
}

interface OrganizationContextType {
  /** L'organisation actuellement affichée (peut être un override si super_admin). */
  organization: Organization | null
  /** L'organisation réelle du user (jamais surchargée — utile pour savoir où il appartient vraiment). */
  realOrganization: Organization | null
  /** Profil étendu (rôle, organization_id, etc.). */
  profile: UserProfile | null
  /** Chargement en cours. */
  loading: boolean
  /** True si le user a le rôle super_admin. */
  isSuperAdmin: boolean
  /** True si super_admin et qu'un override d'organisation est actif. */
  isViewingAsOther: boolean
  /** Pour super_admin : voir comme une autre organisation. */
  switchOrg: (orgId: string) => Promise<void>
  /** Restaurer la vue normale (sortir du mode "View as..."). */
  clearOverride: () => void
  /** Re-fetch profile + organisation (utile après un update). */
  refresh: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

const OVERRIDE_KEY = 'cerdia_org_override'

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useOrganization = () => {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization must be used within an OrganizationProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { supabaseUser, loading: authLoading } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [realOrganization, setRealOrganization] = useState<Organization | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchOrgById = useCallback(async (orgId: string): Promise<Organization | null> => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url, settings, features, plan, status, is_demo, onboarding_completed, created_at')
      .eq('id', orgId)
      .maybeSingle()
    if (error) {
      console.error('[OrgContext] fetchOrgById failed:', error)
      return null
    }
    return data as Organization | null
  }, [])

  const loadFor = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      const { data: profileRow, error: profileErr } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, onboarding_completed')
        .eq('id', userId)
        .maybeSingle()

      if (profileErr || !profileRow) {
        console.error('[OrgContext] profile fetch failed:', profileErr)
        setProfile(null)
        setRealOrganization(null)
        setOrganization(null)
        return
      }

      const p = profileRow as UserProfile
      setProfile(p)

      // Charge l'organisation réelle du user
      const realOrg = await fetchOrgById(p.organization_id)
      setRealOrganization(realOrg)

      // Si super_admin avec un override actif → charge l'org override comme vue active
      if (p.role === 'super_admin') {
        const overrideId = typeof window !== 'undefined' ? localStorage.getItem(OVERRIDE_KEY) : null
        if (overrideId && overrideId !== p.organization_id) {
          const overrideOrg = await fetchOrgById(overrideId)
          if (overrideOrg) {
            setOrganization(overrideOrg)
            return
          }
          // Override invalide → on le clear
          localStorage.removeItem(OVERRIDE_KEY)
        }
      }

      setOrganization(realOrg)
    } finally {
      setLoading(false)
    }
  }, [fetchOrgById])

  useEffect(() => {
    if (authLoading) return
    if (!supabaseUser) {
      setProfile(null)
      setRealOrganization(null)
      setOrganization(null)
      setLoading(false)
      return
    }
    loadFor(supabaseUser.id)
  }, [supabaseUser, authLoading, loadFor])

  const switchOrg = useCallback(async (orgId: string) => {
    if (profile?.role !== 'super_admin') {
      console.warn('[OrgContext] switchOrg refused: not super_admin')
      return
    }
    const target = await fetchOrgById(orgId)
    if (!target) {
      console.error('[OrgContext] switchOrg: organisation introuvable', orgId)
      return
    }
    localStorage.setItem(OVERRIDE_KEY, orgId)
    setOrganization(target)
  }, [profile, fetchOrgById])

  const clearOverride = useCallback(() => {
    localStorage.removeItem(OVERRIDE_KEY)
    setOrganization(realOrganization)
  }, [realOrganization])

  const refresh = useCallback(async () => {
    if (supabaseUser) await loadFor(supabaseUser.id)
  }, [supabaseUser, loadFor])

  const isSuperAdmin = profile?.role === 'super_admin'
  const isViewingAsOther =
    !!isSuperAdmin && !!organization && !!realOrganization && organization.id !== realOrganization.id

  const value: OrganizationContextType = {
    organization,
    realOrganization,
    profile,
    loading: authLoading || loading,
    isSuperAdmin,
    isViewingAsOther,
    switchOrg,
    clearOverride,
    refresh,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export default OrganizationContext
