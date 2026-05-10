/**
 * /api/commerce/agent/analyze
 *
 * Moteur d'analyse de l'agent autonome Amazon.
 *   1. Charge le contexte (keywords + search_terms + listings depuis Supabase)
 *   2. Pour chaque regle activee dans amazon_agent_settings, appelle rule.evaluate()
 *   3. Filtre les propositions deja en pending (via dedupe_key)
 *   4. Hard guards (bid 0.20-5$, marge mini, MAP) — voir lib/commerce/agent/guards
 *   5. Insert les nouvelles propositions dans amazon_pending_actions
 *   6. Si global_mode='mixed' et qu'une politique matche, execute immediatement
 *
 * Squelette pour l'instant : la lecture du contexte fonctionne, les regles
 * sont vides (a implementer dans lib/commerce/agent/rules/). Permet de tester
 * la plomberie meme sans donnees Amazon.
 *
 * Auth : Vercel cron ou Bearer ADMIN_API_TOKEN.
 *
 * Query :
 *   ?dry_run=true  → genere les propositions sans les inserer (pour debug)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeCronOrAdmin } from '@/lib/amazon/route-auth'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const fail = authorizeCronOrAdmin(req)
  if (fail) return fail

  const url    = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === 'true'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // ── 1. Charger le contexte (parallele) ──────────────────────
  const [keywordsRes, searchTermsRes, listingsRes, settingsRes, globalStateRes] = await Promise.all([
    supabase.from('amazon_ads_keywords').select('*').eq('state', 'enabled'),
    supabase.from('amazon_search_terms').select('*')
      .gte('date', new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10)),
    supabase.from('amazon_listings').select('*'),
    supabase.from('amazon_agent_settings').select('*'),
    supabase.from('amazon_agent_global_state').select('global_mode').eq('id', 1).maybeSingle(),
  ])

  const context = {
    keywords:     keywordsRes.data    ?? [],
    searchTerms:  searchTermsRes.data ?? [],
    listings:     listingsRes.data    ?? [],
    settings:     settingsRes.data    ?? [],
  }
  const globalMode = globalStateRes.data?.global_mode ?? 'manual'

  // Source data manquante : on bail tot pour aider le debug
  const totalSources = context.keywords.length + context.searchTerms.length + context.listings.length
  if (totalSources === 0) {
    return NextResponse.json({
      ok:        true,
      generated: 0,
      inserted:  0,
      mode:      globalMode,
      message:   'no source data — run /api/amazon/sync/* first',
      counts: {
        keywords:    0,
        searchTerms: 0,
        listings:    0,
      },
    })
  }

  // ── 2. Charger les regles activees ──────────────────────────
  const enabledRules = new Set(
    (context.settings as Array<{ rule_name: string; enabled: boolean }>)
      .filter(s => s.enabled)
      .map(s => s.rule_name),
  )

  if (enabledRules.size === 0) {
    return NextResponse.json({
      ok:        true,
      generated: 0,
      inserted:  0,
      mode:      globalMode,
      message:   'no rules enabled in amazon_agent_settings',
    })
  }

  // ── 3. TODO : appliquer les regles ──────────────────────────
  // const proposals: ProposedAction[] = []
  // for (const rule of rules) {
  //   if (!enabledRules.has(rule.name)) continue
  //   proposals.push(...await rule.evaluate(context, params))
  // }
  //
  // Hard guards + dedupe + insert dans amazon_pending_actions
  // Si globalMode='mixed' : findMatchingPolicy + execution immediate.
  //
  // Voir references/agent-architecture.md + analysis-rules.md du skill.
  // A implementer dans lib/commerce/agent/rules/{bid-bleeder,negative-harvest,...}.ts

  return NextResponse.json({
    ok:           true,
    generated:    0,
    inserted:     0,
    mode:         globalMode,
    dry_run:      dryRun,
    message:      'agent skeleton — rules not yet implemented',
    enabled_rules: Array.from(enabledRules),
    counts: {
      keywords:    context.keywords.length,
      searchTerms: context.searchTerms.length,
      listings:    context.listings.length,
    },
  })
}

export async function GET(req: NextRequest) { return POST(req) }
