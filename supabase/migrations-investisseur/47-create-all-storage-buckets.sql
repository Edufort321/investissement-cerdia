-- =====================================================
-- SCRIPT 47: CRÉATION AUTOMATIQUE DE TOUS LES BUCKETS
--
-- Ce script crée automatiquement TOUS les buckets de stockage
-- nécessaires pour l'application, sans intervention manuelle.
--
-- Buckets créés:
-- 1. documents (public) - Documents généraux
-- 2. scenario-documents (privé) - Photos et documents des scénarios
-- 3. property-attachments (privé) - Photos et documents des projets
-- 4. transaction-attachments (privé) - Reçus et documents des transactions
--
-- Date: 2025-01-24
-- Auteur: System Migration
-- =====================================================

-- =====================================================
-- BUCKET 1: documents (PUBLIC)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Public bucket
  52428800, -- 50 MB en bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- =====================================================
-- BUCKET 2: scenario-documents (PRIVÉ)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scenario-documents',
  'scenario-documents',
  false, -- Private bucket
  52428800, -- 50 MB en bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

-- =====================================================
-- BUCKET 3: property-attachments (PRIVÉ)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-attachments',
  'property-attachments',
  false, -- Private bucket
  104857600, -- 100 MB en bytes (projets peuvent avoir plus de docs)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed'
  ];

-- =====================================================
-- BUCKET 4: transaction-attachments (PRIVÉ)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-attachments',
  'transaction-attachments',
  false, -- Private bucket
  52428800, -- 50 MB en bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- =====================================================
-- BUCKET 5: voyage-photos (PRIVÉ)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voyage-photos',
  'voyage-photos',
  false, -- Private bucket
  5242880, -- 5 MB en bytes (photos de voyage)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

-- =====================================================
-- VÉRIFICATION ET CONFIRMATION
-- =====================================================

-- Afficher tous les buckets créés
SELECT
  '✅ MIGRATION 47 TERMINEE - Tous les buckets créés automatiquement' AS status;

SELECT
  id AS "Bucket ID",
  name AS "Nom",
  CASE WHEN public THEN 'Public' ELSE 'Privé' END AS "Visibilité",
  file_size_limit / 1048576 AS "Limite (MB)",
  array_length(allowed_mime_types, 1) AS "Types de fichiers autorisés",
  created_at AS "Créé le"
FROM storage.buckets
WHERE id IN ('documents', 'scenario-documents', 'property-attachments', 'transaction-attachments', 'voyage-photos')
ORDER BY id;

-- =====================================================
-- RÉSUMÉ DES BUCKETS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📦 BUCKETS DE STOCKAGE CRÉÉS:';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣  documents (PUBLIC)';
  RAISE NOTICE '   - Documents généraux';
  RAISE NOTICE '   - Limite: 50 MB';
  RAISE NOTICE '   - Types: Images, PDF, Office';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣  scenario-documents (PRIVÉ)';
  RAISE NOTICE '   - Photos et documents des scénarios';
  RAISE NOTICE '   - Limite: 50 MB';
  RAISE NOTICE '   - Types: Images, PDF, Office, PowerPoint';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣  property-attachments (PRIVÉ)';
  RAISE NOTICE '   - Photos et documents des projets';
  RAISE NOTICE '   - Limite: 100 MB';
  RAISE NOTICE '   - Types: Images, PDF, Office, ZIP';
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣  transaction-attachments (PRIVÉ)';
  RAISE NOTICE '   - Reçus et documents des transactions';
  RAISE NOTICE '   - Limite: 50 MB';
  RAISE NOTICE '   - Types: Images, PDF, Office';
  RAISE NOTICE '';
  RAISE NOTICE '5️⃣  voyage-photos (PRIVÉ)';
  RAISE NOTICE '   - Photos de voyage Mon Voyage CERDIA';
  RAISE NOTICE '   - Limite: 5 MB';
  RAISE NOTICE '   - Types: Images (JPEG, PNG, WebP), PDF';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tous les buckets sont prêts à être utilisés!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  RAPPEL: Les policies RLS doivent aussi être exécutées:';
  RAISE NOTICE '   - Script 7: policies pour documents';
  RAISE NOTICE '   - Script 17: policies pour property/transaction-attachments';
  RAISE NOTICE '   - Script 21: policies pour scenario-documents';
  RAISE NOTICE '   - Migrations Mon Voyage: policies pour voyage-photos';
  RAISE NOTICE '';
END $$;
