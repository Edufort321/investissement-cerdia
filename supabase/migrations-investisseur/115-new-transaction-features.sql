-- Migration 115: Nouveaux types et colonnes pour les transactions
--
-- 1. loyer_locatif  — revenu locatif avec compte destination
-- 2. transfert      — transfert entre compte courant et CAPEX
-- 3. target_account — compte destination (compte_courant | capex)
-- 4. transfer_source — compte source pour un transfert

-- ─── Contrainte des types ────────────────────────────────────────────────────

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    -- ENTRÉES
    'investissement',
    'loyer',
    'loyer_locatif',        -- Revenu locatif avec compte destination (NOUVEAU)
    'dividende',
    'revenu',

    -- SORTIES
    'paiement',
    'achat_propriete',
    'depense',
    'capex',
    'maintenance',
    'admin',
    'remboursement_investisseur',
    'courant',
    'rnd',

    -- TRANSFERT
    'transfert'             -- Transfert entre compte courant et CAPEX (NOUVEAU)
  ));

-- ─── Nouvelles colonnes ──────────────────────────────────────────────────────

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS target_account TEXT
    CHECK (target_account IN ('compte_courant', 'capex')),
  ADD COLUMN IF NOT EXISTS transfer_source TEXT
    CHECK (transfer_source IN ('compte_courant', 'capex'));

-- ─── Message ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION 115 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '  + Type loyer_locatif (revenu locatif avec compte dest.)';
  RAISE NOTICE '  + Type transfert (entre compte courant et CAPEX)';
  RAISE NOTICE '  + Colonne target_account (compte_courant | capex)';
  RAISE NOTICE '  + Colonne transfer_source (compte_courant | capex)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
