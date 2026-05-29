# 📋 CERDIA — TODO & État du Système
**Dernière mise à jour:** 2026-05-29 (révision complète — état réel vérifié par lecture du code + build)

> ⚠️ Cette révision remplace la version du 2026-04-22, qui était périmée :
> elle listait C1/C2 comme bloquants (résolus depuis), disait « migrations à 137 »
> (rendu à **204**), et ignorait tout le travail fiscal/dividendes des 27-28 mai.

---

## 🗺️ SOURCE UNIQUE DE VÉRITÉ

```
TABLE transactions
  ├─→ Dashboard KPIs          (SQL get_financial_summary — aligné cash_balance, mig. 108)
  ├─→ NAV (SQL)               (calculate_realistic_nav_v2 — v5, mig. 171)
  ├─→ Bilan Financier         (PropertyFinancialSummary — par propriété)
  ├─→ Performance ROI         (investor_performance_metrics — MOIC/DPI/RVPI, mig. 171)
  ├─→ Trésorerie              (cash_balance, flux entrants/sortants)
  └─→ Rapports fiscaux        (foreign_tax_paid, source_country, fiscal_category)

TABLE property_valuations     → NAV (current_property_values → appréciation composée)
TABLE investor_investments    → Parts totales (total_shares → nav_per_share)
TABLE payment_schedules       → Dashboard (échéances), ProjetTab (progression)
TABLE liabilities             → NAV (total_liabilities, mig. 121/171)  ← passifs inclus
TABLE tax_jurisdiction_rates  → PropertyFiscalPanel (IRNR/ITBIS/FIRPTA/TDT…, mig. 193)
TABLE dividend_declarations   → AdministrationTab (distribution fin d'année, mig. 202)
TABLE investor_report_requests→ Rapports trimestriels + cron Vercel (mig. 203)
```

---

## ✅ COMPLÉTÉ ET VÉRIFIÉ

### Infrastructure & Base
- [x] Supabase Auth + RLS multi-niveaux + multi-tenant (organization_id, mig. 146-152)
- [x] InvestmentContext / ExchangeRateContext (BdC live) / LanguageContext FR-EN

### NAV & Parts
- [x] `calculate_realistic_nav_v2` v5 — anti-double-comptage (mig. 171)
- [x] Multi-devise USD/CAD (mig. 107), construction incluse, appréciation composée
- [x] **Passifs inclus** : `total_liabilities` calculé depuis table `liabilities` (mig. 121/171)
- [x] Snapshots NAV (nav_history) + métriques LP MOIC/DPI/RVPI

### Dashboard / KPIs (ex-C1, RÉSOLU)
- [x] `get_financial_summary()` réécrite avec **formule identique à cash_balance** (mig. 108)
- [x] L'ancien calcul JS divergent `compteCurrentCalcule` **n'existe plus** dans le code
- [x] FinancialKPIs + CompteCourantDashboard branchés sur la fonction SQL
- [x] **Activité récente** (RecentActivity) : fix hauteur + tooltip hover sur description (2026-05-29)

### Fiscal (travail 27-28 mai) — STRUCTURE CONFORME ✅
- [x] Table `tax_jurisdiction_rates` (mig. 193) — taux vérifiés corrects :
  - IRNR RD 27 % · ITBIS RD 18 % · FIRPTA US 15 % · TDT Floride 6 % ·
    Retenue fédérale US 30 % · Plafond T2209 15 % · CGT RD 27 % · Seuil T1135 100 000 $
- [x] PropertyFiscalPanel — lit les taux depuis la DB + fallbacks alignés
- [x] Champs propriété : country_code, property_type, FIRPTA (mig. 197)
- [x] W-8BEN / W-8ECI (dates sanitizées), CCA/cca_class + barème FNACC (mig. 198)
- [x] T2209 carryback + historique (mig. 199), T1135 méthode auto
- [x] IRNR auto-save sur transaction RD, TDT auto-save, ITBIS multi-juridiction (mig. 200)
- [x] Rapports T1135 / T2209 PDF (TaxReports, style rapport comptable)

### Dividendes & Rapports (travail 28 mai, commit f6e2ab5)
- [x] Déclaration dividende fin d'année + élection Cash/Réinvestir par investisseur (mig. 202)
- [x] Exécution : cash → transaction `dividende` (sortie) ; réinvest → `reinvestissement_dividende`
      + émission de parts au NAV + T5 marqués → statut `executed`
- [x] Rapports trimestriels PDF (NAV/part, valeur portefeuille, perf, transactions, note fiscale)
- [x] Bundle ZIP annuel T1→T4 par investisseur + mode « tous » (JSZip)
- [x] API save-report (service_role) + cron Vercel trimestriel (`0 8 2 1,4,7,10 *`)
- [x] **Migration 204** — restaure `transactions_type_check` avec `reinvestissement_dividende`
      (appliquée en prod 2026-05-29 ; fix de l'erreur 23514)

### Commerce / C-Secur360 (travail 27 mai)
- [x] Modules billables, vendeurs/commissions, sync, profit net par unité, factures Gmail

---

## 🟡 RESTE À FAIRE — non bloquant

### C3 (à AUDITER) — Double représentation des parts
Deux sources coexistent : `investors.number_of_shares` (dénormalisé) **et** la table
`investor_investments` (alimentée par le trigger `auto_create_investor_shares` sur
`type='investissement'`). Historique de bugs de double-comptage (mig. 83, 89, 100-103, 110, 171).
**Action :** requête de contrôle pour confirmer qu'il n'y a pas de doublon résiduel :
```sql
SELECT investor_id, COUNT(*), SUM(number_of_shares)
FROM investor_investments WHERE status='active' GROUP BY investor_id;
-- comparer à investors.number_of_shares
```

### C4 — Lien transaction ↔ payment_schedule
Vérifier que `markPaymentAsPaid()` remplit bien `payment_schedule_id` ET `property_id`
sur la transaction créée (sinon « montant payé » ProjetTab ≠ compte courant).

### D3 — Sync revenus bookings → transactions
`bookings_calendar` confirmés ne créent pas auto de transactions `loyer`. Compléter
BookingRevenueSync (Admin → sync_revenues).

### D4 — Bouton « Convertir scénario → propriété »
Automatiser `origin_scenario_id` / `converted_property_id` / `status='purchased'`.

### Nettoyage
- [ ] Retirer pages `/test`, `/test-supabase`, `/demo` avant audit final
- [ ] `lib/financial-summary-service.ts` : confirmer usage réel (utilisé via useFinancialSummary)
- [ ] Florida TDT 6 % = taux haut ; varie par comté → rendre configurable si plusieurs comtés

---

## 🟢 AMÉLIORATIONS — backlog
- A2. Snapshots NAV automatiques (pg_cron hebdo) — partiellement adressé par cron Vercel
- A3. Notifications email (paiement à venir, éval. biennale, dividende dispo)
- A4. Pagination transactions (InvestmentContext charge tout au démarrage)
- A5. Graphiques dashboard (évolution NAV ✅ NAVTimelineChart ; reste cash flow mensuel)

---

## 📊 MIGRATIONS
Rendu à **204** dans `supabase/migrations-investisseur/`. Toujours prendre le prochain
numéro libre — ne jamais renuméroter. ⚠️ Ne **jamais** recréer `transactions_type_check`
avec une liste devinée : faire l'UNION des types existants (leçon mig. 204 / erreur 23514).

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES
1. Auditer C3 (doublons parts) — requête SQL ci-dessus
2. Vérifier C4 (payment_schedule_id rempli)
3. Compléter D3 (sync revenus bookings)
4. Bouton D4 (convertir scénario → propriété)
5. Nettoyage pages de test avant audit
