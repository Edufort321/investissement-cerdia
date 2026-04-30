-- Migration 124: Ajouter pdf_storage_path à monthly_verifications
-- Stocke le chemin Supabase Storage du PDF généré automatiquement lors de la validation

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 MIGRATION 124: pdf_storage_path sur monthly_verifications';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

ALTER TABLE monthly_verifications
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

COMMENT ON COLUMN monthly_verifications.pdf_storage_path IS
  'Chemin Supabase Storage du PDF de contrôle (bucket: transaction-attachments)';

DO $$
BEGIN
  RAISE NOTICE '✅ Colonne pdf_storage_path ajoutée à monthly_verifications';
  RAISE NOTICE '✅ MIGRATION 124 TERMINÉE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

SELECT '✅ MIGRATION 124 — pdf_storage_path ajouté à monthly_verifications' AS status;
