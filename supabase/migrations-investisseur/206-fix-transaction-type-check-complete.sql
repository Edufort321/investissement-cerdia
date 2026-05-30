-- Migration 206 : CORRIGE transactions_type_check (régression migration 204)
-- =====================================================================
-- PROBLÈME : la migration 204 a reconstruit la contrainte avec une liste codée
-- en dur INCOMPLÈTE. Des types réellement insérés par le code en étaient absents
-- (notamment 'achat_propriete' inséré par markPaymentAsPaid). Résultat : quand on
-- entre une transaction d'un de ces types, l'INSERT est REJETÉ par la contrainte,
-- l'erreur est avalée côté UI, et le compte courant ne se met PAS à jour.
--
-- SOLUTION : reconstruire la contrainte avec la liste COMPLÈTE des types utilisés
-- par l'application (extraite du code), UNION les types déjà présents en base
-- (anti-violation). Robuste et idempotent.
-- =====================================================================

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

DO $$
DECLARE
  v_list text;
BEGIN
  SELECT string_agg(quote_literal(t), ', ')
    INTO v_list
  FROM (
    -- 1) Types réellement présents dans les données (jamais violer l'existant)
    SELECT DISTINCT type AS t FROM transactions WHERE type IS NOT NULL
    UNION
    -- 2) Liste COMPLÈTE des types émis par le code applicatif
    SELECT unnest(ARRAY[
      -- Investissements / parts
      'investissement', 'apport', 'achat_parts', 'share_issuance',
      -- Achats immobiliers / paiements programmés
      'achat_propriete', 'property_acquisition', 'paiement',
      -- Revenus
      'loyer', 'loyer_locatif', 'revenu', 'dividende', 'interet',
      -- Distributions
      'reinvestissement_dividende', 'remboursement_investisseur',
      -- Dettes / prêts
      'dette_a_rembourser', 'remboursement_pret', 'pret', 'mortgage',
      'contractor_payment',
      -- Dépenses / exploitation
      'depense', 'maintenance', 'maintenance_repair', 'admin',
      'capex', 'other_capex', 'taxe', 'assurance', 'commission', 'frais',
      -- Ventes / transferts / divers
      'achat', 'vente', 'transfert', 'remboursement', 'autre'
    ])
  ) s;

  EXECUTE format(
    'ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN (%s))',
    v_list
  );
END $$;

-- Vérification : affiche la définition finale de la contrainte (contrôle visuel).
-- On vérifie que 'achat_propriete' (type clé du compte courant) y figure.
SELECT
  'transactions_type_check' AS contrainte,
  pg_get_constraintdef(oid) LIKE '%achat_propriete%' AS achat_propriete_accepte,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname = 'transactions_type_check';
