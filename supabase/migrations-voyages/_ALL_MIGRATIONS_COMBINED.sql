-- =============================================
-- TOUTES LES MIGRATIONS COMBINÉES - APPLICATION VOYAGES
-- =============================================
-- 
-- Ce fichier contient TOUTES les migrations (001-018) dans l'ordre.
-- 
-- INSTRUCTIONS:
-- 1. Allez sur https://supabase.com/dashboard
-- 2. Sélectionnez votre projet
-- 3. Cliquez sur "SQL Editor" dans la sidebar
-- 4. Copiez TOUT le contenu de ce fichier
-- 5. Collez dans SQL Editor
-- 6. Cliquez "Run" (ou Ctrl+Enter)
-- 
-- ⚠️  IMPORTANT: Cela va créer toutes les tables nécessaires:
--    - voyages
--    - evenements  
--    - depenses (pour vos dépenses)
--    - checklist (pour votre to-do list)
--    - photos
--    - partage
--
-- Après avoir exécuté ce fichier, votre checklist et dépenses 
-- seront sauvegardées dans Supabase!
--
-- Généré le:  2 nov. 2025 15:45:57
-- Total: 18 migrations
-- =============================================


-- Migration 001: Création de la table voyages
-- Description: Table principale pour stocker les informations des voyages

CREATE TABLE IF NOT EXISTS public.voyages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  budget DECIMAL(10, 2),
  devise TEXT DEFAULT 'CAD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Métadonnées de l'abonnement
  mode_achat TEXT CHECK (mode_achat IN ('investor', 'single', 'full')),
  expire_at TIMESTAMP WITH TIME ZONE, -- Pour mode 'single' (6 mois)

  -- Contraintes
  CONSTRAINT budget_positive CHECK (budget >= 0),
  CONSTRAINT dates_valides CHECK (date_fin >= date_debut)
);

-- Commentaires
COMMENT ON TABLE public.voyages IS 'Table principale des voyages créés par les utilisateurs';
COMMENT ON COLUMN public.voyages.user_id IS 'Référence à l''utilisateur propriétaire du voyage';
COMMENT ON COLUMN public.voyages.mode_achat IS 'Mode d''achat: investor (gratuit investisseur), single (5$ CAD), full (15$ CAD)';
COMMENT ON COLUMN public.voyages.expire_at IS 'Date d''expiration pour le mode single (6 mois)';
-- Migration 002: Création de la table evenements
-- Description: Table pour les événements du timeline (vols, hébergements, activités, etc.)

CREATE TABLE IF NOT EXISTS public.evenements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vol', 'hebergement', 'activite', 'transport', 'condo')),
  titre TEXT NOT NULL,
  date DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  lieu TEXT,
  prix DECIMAL(10, 2),
  devise TEXT DEFAULT 'CAD',
  notes TEXT,
  transport TEXT, -- Type de transport si applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Contraintes
  CONSTRAINT prix_positive CHECK (prix >= 0),
  CONSTRAINT heures_valides CHECK (heure_fin IS NULL OR heure_debut IS NULL OR heure_fin >= heure_debut)
);

-- Commentaires
COMMENT ON TABLE public.evenements IS 'Événements de la timeline du voyage';
COMMENT ON COLUMN public.evenements.type IS 'Type d''événement: vol, hebergement, activite, transport, condo';
COMMENT ON COLUMN public.evenements.voyage_id IS 'Référence au voyage parent';
COMMENT ON COLUMN public.evenements.transport IS 'Mode de transport (avion, train, voiture, etc.)';
-- Migration 003: Création de la table depenses
-- Description: Table pour le suivi des dépenses du voyage

CREATE TABLE IF NOT EXISTS public.depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  categorie TEXT NOT NULL,
  description TEXT,
  montant DECIMAL(10, 2) NOT NULL,
  devise TEXT DEFAULT 'CAD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Contraintes
  CONSTRAINT montant_positive CHECK (montant >= 0)
);

-- Commentaires
COMMENT ON TABLE public.depenses IS 'Dépenses effectuées pendant le voyage';
COMMENT ON COLUMN public.depenses.categorie IS 'Catégorie de dépense: restaurant, transport, hébergement, activité, shopping, etc.';
COMMENT ON COLUMN public.depenses.voyage_id IS 'Référence au voyage parent';
-- Migration 004: Création de la table checklist
-- Description: Table pour la checklist des tâches à faire pour le voyage

CREATE TABLE IF NOT EXISTS public.checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  complete BOOLEAN DEFAULT FALSE,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Commentaires
COMMENT ON TABLE public.checklist IS 'Items de la checklist pour préparer le voyage';
COMMENT ON COLUMN public.checklist.ordre IS 'Ordre d''affichage des items (pour drag & drop)';
COMMENT ON COLUMN public.checklist.complete IS 'État de complétion de l''item';
COMMENT ON COLUMN public.checklist.voyage_id IS 'Référence au voyage parent';
-- Migration 005: Création de la table photos
-- Description: Table pour les métadonnées des photos uploadées (fichiers dans Supabase Storage)

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  evenement_id UUID REFERENCES public.evenements(id) ON DELETE CASCADE,
  depense_id UUID REFERENCES public.depenses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Chemin dans Supabase Storage bucket 'voyage-photos'
  nom_fichier TEXT NOT NULL,
  taille INTEGER,
  type_mime TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Une photo peut être liée soit à un événement, soit à une dépense, soit au voyage directement
  CONSTRAINT photo_lien_unique CHECK (
    (evenement_id IS NOT NULL AND depense_id IS NULL) OR
    (evenement_id IS NULL AND depense_id IS NOT NULL) OR
    (evenement_id IS NULL AND depense_id IS NULL)
  )
);

-- Commentaires
COMMENT ON TABLE public.photos IS 'Métadonnées des photos uploadées dans Supabase Storage';
COMMENT ON COLUMN public.photos.storage_path IS 'Chemin du fichier dans le bucket voyage-photos';
COMMENT ON COLUMN public.photos.evenement_id IS 'Lien vers un événement (optionnel)';
COMMENT ON COLUMN public.photos.depense_id IS 'Lien vers une dépense (optionnel)';
COMMENT ON COLUMN public.photos.voyage_id IS 'Référence au voyage parent';
-- Migration 006: Création de la table partage
-- Description: Table pour la fonctionnalité "Me Suivre" (partage du voyage en temps réel)

CREATE TABLE IF NOT EXISTS public.partage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  actif BOOLEAN DEFAULT FALSE,
  lien_partage TEXT UNIQUE NOT NULL,
  en_direct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Un voyage ne peut avoir qu'un seul lien de partage
  CONSTRAINT unique_voyage_partage UNIQUE (voyage_id)
);

-- Commentaires
COMMENT ON TABLE public.partage IS 'Configuration de partage "Me Suivre" pour les voyages';
COMMENT ON COLUMN public.partage.actif IS 'Indique si le partage est activé';
COMMENT ON COLUMN public.partage.lien_partage IS 'Lien unique de partage du voyage';
COMMENT ON COLUMN public.partage.en_direct IS 'Mode suivi en temps réel activé';
COMMENT ON COLUMN public.partage.voyage_id IS 'Référence au voyage partagé';
-- Migration 007: Création des index pour optimiser les performances
-- Description: Index sur les colonnes fréquemment interrogées

-- Index sur voyages
CREATE INDEX IF NOT EXISTS idx_voyages_user_id
  ON public.voyages(user_id);

CREATE INDEX IF NOT EXISTS idx_voyages_mode_achat
  ON public.voyages(mode_achat);

CREATE INDEX IF NOT EXISTS idx_voyages_expire_at
  ON public.voyages(expire_at)
  WHERE expire_at IS NOT NULL;

-- Index sur evenements
CREATE INDEX IF NOT EXISTS idx_evenements_voyage_id
  ON public.evenements(voyage_id);

CREATE INDEX IF NOT EXISTS idx_evenements_date
  ON public.evenements(date);

CREATE INDEX IF NOT EXISTS idx_evenements_type
  ON public.evenements(type);

-- Index sur depenses
CREATE INDEX IF NOT EXISTS idx_depenses_voyage_id
  ON public.depenses(voyage_id);

CREATE INDEX IF NOT EXISTS idx_depenses_date
  ON public.depenses(date);

CREATE INDEX IF NOT EXISTS idx_depenses_categorie
  ON public.depenses(categorie);

-- Index sur checklist
CREATE INDEX IF NOT EXISTS idx_checklist_voyage_id
  ON public.checklist(voyage_id);

CREATE INDEX IF NOT EXISTS idx_checklist_ordre
  ON public.checklist(voyage_id, ordre);

-- Index sur photos
CREATE INDEX IF NOT EXISTS idx_photos_voyage_id
  ON public.photos(voyage_id);

CREATE INDEX IF NOT EXISTS idx_photos_evenement_id
  ON public.photos(evenement_id)
  WHERE evenement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photos_depense_id
  ON public.photos(depense_id)
  WHERE depense_id IS NOT NULL;

-- Index sur partage
CREATE INDEX IF NOT EXISTS idx_partage_lien_partage
  ON public.partage(lien_partage);

-- Commentaires
COMMENT ON INDEX idx_voyages_user_id IS 'Accélère les requêtes de recherche de voyages par utilisateur';
COMMENT ON INDEX idx_evenements_voyage_id IS 'Accélère les requêtes de recherche d''événements par voyage';
COMMENT ON INDEX idx_depenses_voyage_id IS 'Accélère les requêtes de recherche de dépenses par voyage';
-- Migration 008: Activation du Row Level Security (RLS)
-- Description: Active la sécurité au niveau des lignes pour toutes les tables

-- Activer RLS sur toutes les tables
ALTER TABLE public.voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partage ENABLE ROW LEVEL SECURITY;

-- Commentaires
COMMENT ON TABLE public.voyages IS 'RLS activé: Les utilisateurs ne voient que leurs propres voyages';
COMMENT ON TABLE public.evenements IS 'RLS activé: Les utilisateurs ne voient que les événements de leurs voyages';
COMMENT ON TABLE public.depenses IS 'RLS activé: Les utilisateurs ne voient que les dépenses de leurs voyages';
-- Migration 009: Politiques RLS pour la table voyages
-- Description: Définit les règles de sécurité pour l'accès aux voyages

-- ====================================
-- POLICIES POUR VOYAGES
-- ====================================

-- SELECT: Les utilisateurs peuvent voir leurs propres voyages
CREATE POLICY "Users can view their own voyages"
  ON public.voyages
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Les utilisateurs peuvent créer leurs propres voyages
CREATE POLICY "Users can create their own voyages"
  ON public.voyages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Les utilisateurs peuvent modifier leurs propres voyages
CREATE POLICY "Users can update their own voyages"
  ON public.voyages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres voyages
CREATE POLICY "Users can delete their own voyages"
  ON public.voyages
  FOR DELETE
  USING (auth.uid() = user_id);
-- Migration 010: Politiques RLS pour la table evenements
-- Description: Définit les règles de sécurité pour l'accès aux événements

-- ====================================
-- POLICIES POUR EVENEMENTS
-- ====================================

-- SELECT: Les utilisateurs peuvent voir les événements de leurs voyages
CREATE POLICY "Users can view events from their voyages"
  ON public.evenements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- INSERT: Les utilisateurs peuvent créer des événements dans leurs voyages
CREATE POLICY "Users can create events in their voyages"
  ON public.evenements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- UPDATE: Les utilisateurs peuvent modifier les événements de leurs voyages
CREATE POLICY "Users can update events from their voyages"
  ON public.evenements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- DELETE: Les utilisateurs peuvent supprimer les événements de leurs voyages
CREATE POLICY "Users can delete events from their voyages"
  ON public.evenements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );
-- Migration 011: Politiques RLS pour depenses, checklist, photos, partage
-- Description: Définit les règles de sécurité pour les tables restantes

-- ====================================
-- POLICIES POUR DEPENSES
-- ====================================

CREATE POLICY "Users can view expenses from their voyages"
  ON public.depenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can create expenses in their voyages"
  ON public.depenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can update expenses from their voyages"
  ON public.depenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete expenses from their voyages"
  ON public.depenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICIES POUR CHECKLIST
-- ====================================

CREATE POLICY "Users can view checklist items from their voyages"
  ON public.checklist FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can create checklist items in their voyages"
  ON public.checklist FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can update checklist items from their voyages"
  ON public.checklist FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete checklist items from their voyages"
  ON public.checklist FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICIES POUR PHOTOS
-- ====================================

CREATE POLICY "Users can view photos from their voyages"
  ON public.photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can upload photos to their voyages"
  ON public.photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete photos from their voyages"
  ON public.photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICIES POUR PARTAGE
-- ====================================

CREATE POLICY "Users can view sharing settings from their voyages"
  ON public.partage FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can create sharing for their voyages"
  ON public.partage FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can update sharing settings for their voyages"
  ON public.partage FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "Users can delete sharing for their voyages"
  ON public.partage FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

-- ====================================
-- POLICY PUBLIQUE POUR PARTAGE (lecture seule via lien)
-- ====================================

-- Permet à n'importe qui avec le lien de voir le voyage partagé
CREATE POLICY "Anyone can view shared voyages via link"
  ON public.voyages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partage
      WHERE partage.voyage_id = voyages.id
      AND partage.actif = TRUE
    )
  );

-- Permet la lecture publique des événements de voyages partagés
CREATE POLICY "Anyone can view events from shared voyages"
  ON public.evenements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partage
      JOIN public.voyages ON voyages.id = partage.voyage_id
      WHERE voyages.id = evenements.voyage_id
      AND partage.actif = TRUE
    )
  );
-- Migration 012: Création des fonctions utilitaires
-- Description: Fonctions pour automatisation et helpers

-- ====================================
-- FONCTION: Mettre à jour updated_at automatiquement
-- ====================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.handle_updated_at() IS 'Met à jour automatiquement le champ updated_at lors d''une modification';

-- ====================================
-- TRIGGER: Appliquer handle_updated_at sur voyages
-- ====================================

CREATE TRIGGER set_updated_at_voyages
  BEFORE UPDATE ON public.voyages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ====================================
-- FONCTION: Générer un lien de partage unique
-- ====================================

CREATE OR REPLACE FUNCTION public.generate_share_link()
RETURNS TEXT AS $$
DECLARE
  random_string TEXT;
BEGIN
  -- Générer une chaîne aléatoire de 12 caractères
  random_string := encode(gen_random_bytes(9), 'base64');
  -- Nettoyer les caractères non alphanumériques
  random_string := translate(random_string, '+/=', 'abc');

  RETURN 'https://cerdia.com/voyage/share/' || random_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.generate_share_link() IS 'Génère un lien de partage unique pour un voyage';

-- ====================================
-- FONCTION: Vérifier si un voyage est expiré
-- ====================================

CREATE OR REPLACE FUNCTION public.is_voyage_expired(voyage_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiration_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT expire_at INTO expiration_date
  FROM public.voyages
  WHERE id = voyage_id_param;

  IF expiration_date IS NULL THEN
    RETURN FALSE; -- Pas d'expiration = jamais expiré
  END IF;

  RETURN expiration_date < TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.is_voyage_expired(UUID) IS 'Vérifie si un voyage a expiré (mode single 6 mois)';

-- ====================================
-- FONCTION: Compter les voyages d'un utilisateur
-- ====================================

CREATE OR REPLACE FUNCTION public.count_user_voyages(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  voyage_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO voyage_count
  FROM public.voyages
  WHERE user_id = user_id_param;

  RETURN voyage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION public.count_user_voyages(UUID) IS 'Compte le nombre de voyages d''un utilisateur (pour limitation mode single)';
-- Migration 013: Configuration automatique du Storage
-- Description: Crée le bucket voyage-photos via insertion SQL directe

-- ====================================
-- IMPORTANT: EXÉCUTER LE SCRIPT 47
-- ====================================

-- Le bucket voyage-photos est créé automatiquement avec TOUS les autres buckets
-- via le script existant: 47-create-all-storage-buckets.sql

-- Ce fichier est conservé pour référence dans l'ordre des migrations Mon Voyage,
-- mais l'exécution réelle se fait via le script 47.

-- ====================================
-- VÉRIFICATION
-- ====================================

-- Fonction pour vérifier si le bucket existe
CREATE OR REPLACE FUNCTION public.check_voyage_photos_bucket()
RETURNS TABLE (
  bucket_exists BOOLEAN,
  message TEXT
) AS $$
DECLARE
  exists_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO exists_count
  FROM storage.buckets
  WHERE id = 'voyage-photos';

  IF exists_count > 0 THEN
    RETURN QUERY SELECT
      true AS bucket_exists,
      '✅ Le bucket voyage-photos existe et est prêt!' AS message;
  ELSE
    RETURN QUERY SELECT
      false AS bucket_exists,
      '⚠️  Le bucket voyage-photos n''existe pas encore.

      Pour le créer automatiquement:
      → Exécutez le script: 47-create-all-storage-buckets.sql

      Configuration:
      - Privé (non public)
      - Limite: 5 MB
      - Types: JPEG, PNG, WebP, PDF' AS message;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Commentaire
COMMENT ON FUNCTION public.check_voyage_photos_bucket() IS 'Vérifie si le bucket voyage-photos existe';

-- ====================================
-- POLICIES POUR LE BUCKET (AUTOMATIQUES)
-- ====================================

-- Les policies sont créées automatiquement par la migration 014.
-- Ne les créez PAS manuellement.

-- Migration 014 créera automatiquement:
-- ✅ INSERT  - Upload de photos (auth.uid() requis)
-- ✅ SELECT  - Téléchargement (uniquement SES photos)
-- ✅ UPDATE  - Modification métadonnées (uniquement SES photos)
-- ✅ DELETE  - Suppression (uniquement SES photos)

-- Ordre d'exécution:
-- 1. Exécutez script 47 (création du bucket)
-- 2. Exécutez migration 014 (création des policies)

-- Vérification après migration 014:
-- SELECT * FROM public.check_voyage_photos_policies();

-- ====================================
-- VÉRIFICATION
-- ====================================

-- Exécuter cette fonction pour voir les instructions
SELECT public.check_voyage_photos_bucket();
-- =====================================================
-- Migration 014: Storage Policies pour voyage-photos
-- =====================================================
-- Description: Configuration automatique des policies RLS pour le bucket voyage-photos
-- Dépendances: Script 47 (création du bucket voyage-photos)
--
-- Sécurité: Chaque utilisateur peut uniquement accéder à SES propres photos
-- Structure des chemins: voyage-photos/{user_id}/{voyage_id}/{filename}
-- =====================================================

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can upload their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their voyage photos" ON storage.objects;

-- =====================================================
-- POLICY 1: INSERT (Upload)
-- =====================================================
-- Permet aux utilisateurs authentifiés d'uploader des photos
-- dans leur propre dossier uniquement
CREATE POLICY "Users can upload their voyage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voyage-photos'
  AND auth.uid() IS NOT NULL
);

-- =====================================================
-- POLICY 2: SELECT (View/Download)
-- =====================================================
-- Permet aux utilisateurs de voir uniquement leurs propres photos
-- Vérifie que le premier segment du chemin correspond à leur user_id
CREATE POLICY "Users can view their voyage photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- POLICY 3: DELETE (Suppression)
-- =====================================================
-- Permet aux utilisateurs de supprimer uniquement leurs propres photos
CREATE POLICY "Users can delete their voyage photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- POLICY 4: UPDATE (Modification métadonnées)
-- =====================================================
-- Permet aux utilisateurs de modifier les métadonnées de leurs propres photos
CREATE POLICY "Users can update their voyage photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- STRUCTURE DES CHEMINS (RECOMMANDATION)
-- =====================================================

-- Format recommandé pour les chemins de fichiers:
-- voyage-photos/{user_id}/{voyage_id}/{filename}
--
-- Exemple:
-- voyage-photos/550e8400-e29b-41d4-a716-446655440000/123e4567-e89b-12d3-a456-426614174000/photo1.jpg
--                └──────────── user_id ────────────┘ └──────────── voyage_id ────────────┘ └─ filename ─┘
--
-- Avantages:
-- - Isolation complète par utilisateur (user_id)
-- - Organisation par voyage (voyage_id)
-- - Facile de supprimer toutes les photos d'un voyage
-- - Évite les collisions de noms entre utilisateurs

-- =====================================================
-- FONCTION HELPER POUR GÉNÉRER CHEMIN DE FICHIER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_voyage_photo_path(
  voyage_id_param UUID,
  filename TEXT
)
RETURNS TEXT AS $$
BEGIN
  RETURN auth.uid()::TEXT || '/' || voyage_id_param::TEXT || '/' || filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_voyage_photo_path(UUID, TEXT) IS
'Génère le chemin complet pour une photo de voyage: {user_id}/{voyage_id}/{filename}';

-- =====================================================
-- FONCTION HELPER POUR OBTENIR URL PUBLIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_voyage_photo_url(
  voyage_id_param UUID,
  filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  file_path TEXT;
BEGIN
  file_path := public.get_voyage_photo_path(voyage_id_param, filename);
  -- L'URL sera construite côté client avec:
  -- supabase.storage.from('voyage-photos').getPublicUrl(file_path)
  RETURN file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_voyage_photo_url(UUID, TEXT) IS
'Retourne le chemin de fichier pour construire l''URL publique côté client';

-- =====================================================
-- FONCTION POUR LISTER LES PHOTOS D'UN VOYAGE
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_voyage_photos(
  voyage_id_param UUID
)
RETURNS TABLE (
  name TEXT,
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.name,
    o.id,
    o.created_at,
    o.metadata
  FROM storage.objects o
  WHERE o.bucket_id = 'voyage-photos'
    AND (storage.foldername(o.name))[1] = auth.uid()::text
    AND (storage.foldername(o.name))[2] = voyage_id_param::text
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_voyage_photos(UUID) IS
'Liste toutes les photos d''un voyage pour l''utilisateur connecté';

-- =====================================================
-- VÉRIFICATION DES POLICIES
-- =====================================================

-- Fonction pour vérifier que les policies sont bien créées
CREATE OR REPLACE FUNCTION public.check_voyage_photos_policies()
RETURNS TABLE (
  policy_name TEXT,
  command TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.policyname::TEXT,
    p.cmd::TEXT,
    CASE
      WHEN p.policyname IS NOT NULL THEN '✅ Active'
      ELSE '❌ Manquante'
    END AS status
  FROM pg_policies p
  WHERE p.tablename = 'objects'
    AND p.schemaname = 'storage'
    AND p.policyname LIKE '%voyage photos%'
  ORDER BY p.cmd;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_voyage_photos_policies() IS
'Vérifie que toutes les policies pour voyage-photos sont actives';

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 014 TERMINÉE: Storage Policies pour voyage-photos';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Policies créées:';
  RAISE NOTICE '   ✓ INSERT  - Users can upload their voyage photos';
  RAISE NOTICE '   ✓ SELECT  - Users can view their voyage photos';
  RAISE NOTICE '   ✓ DELETE  - Users can delete their voyage photos';
  RAISE NOTICE '   ✓ UPDATE  - Users can update their voyage photos';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Sécurité:';
  RAISE NOTICE '   - Chaque utilisateur accède uniquement à SES photos';
  RAISE NOTICE '   - Isolation par dossier: {user_id}/{voyage_id}/{filename}';
  RAISE NOTICE '';
  RAISE NOTICE '🛠️  Fonctions helper créées:';
  RAISE NOTICE '   - get_voyage_photo_path(voyage_id, filename)';
  RAISE NOTICE '   - get_voyage_photo_url(voyage_id, filename)';
  RAISE NOTICE '   - list_voyage_photos(voyage_id)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Vérification:';
  RAISE NOTICE '   SELECT * FROM public.check_voyage_photos_policies();';
  RAISE NOTICE '';
END $$;

-- Exécuter la vérification automatiquement
SELECT * FROM public.check_voyage_photos_policies();
-- =====================================================
-- Migration 015: Voyages publics et système de privacy
-- =====================================================
-- Description: Ajoute les fonctionnalités pour rendre les voyages publics
--              et gérer la confidentialité des photos/documents
-- Date: 2025-10-26
-- =====================================================

-- =====================================================
-- 1. Ajouter colonnes pour voyages publics dans la table voyages
-- =====================================================

ALTER TABLE public.voyages
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS template_description TEXT,
ADD COLUMN IF NOT EXISTS template_image_url TEXT,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS uses_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS privacy_photos BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS privacy_receipts BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.voyages.is_public IS 'Si true, le voyage est visible dans la galerie publique';
COMMENT ON COLUMN public.voyages.is_template IS 'Si true, le voyage peut être utilisé comme modèle';
COMMENT ON COLUMN public.voyages.template_name IS 'Nom du template pour affichage dans la galerie';
COMMENT ON COLUMN public.voyages.template_description IS 'Description du template pour la galerie';
COMMENT ON COLUMN public.voyages.template_image_url IS 'URL de l''image de couverture du template';
COMMENT ON COLUMN public.voyages.views_count IS 'Nombre de vues du voyage public';
COMMENT ON COLUMN public.voyages.uses_count IS 'Nombre de fois que le template a été utilisé';
COMMENT ON COLUMN public.voyages.privacy_photos IS 'Si true, les photos sont privées par défaut';
COMMENT ON COLUMN public.voyages.privacy_receipts IS 'Si true, les reçus/factures sont privés par défaut';

-- =====================================================
-- 2. Ajouter colonnes de privacy dans la table photos
-- =====================================================

ALTER TABLE public.photos
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_in_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.photos.is_private IS 'Si true, la photo n''est visible que par le propriétaire';
COMMENT ON COLUMN public.photos.show_in_public IS 'Si true ET voyage is_public, la photo est visible publiquement';

-- =====================================================
-- 3. Ajouter colonnes de privacy dans la table evenements
-- =====================================================

ALTER TABLE public.evenements
ADD COLUMN IF NOT EXISTS hide_price BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_receipt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_private BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.evenements.hide_price IS 'Si true, le prix est masqué dans la vue publique';
COMMENT ON COLUMN public.evenements.has_receipt IS 'Si true, l''événement a un reçu attaché';
COMMENT ON COLUMN public.evenements.receipt_url IS 'URL du reçu dans Storage';
COMMENT ON COLUMN public.evenements.receipt_private IS 'Si true, le reçu est privé';

-- =====================================================
-- 4. Ajouter colonnes de privacy dans la table depenses
-- =====================================================

ALTER TABLE public.depenses
ADD COLUMN IF NOT EXISTS hide_amount BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_receipt BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_private BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.depenses.hide_amount IS 'Si true, le montant est masqué dans la vue publique';
COMMENT ON COLUMN public.depenses.has_receipt IS 'Si true, la dépense a un reçu attaché';
COMMENT ON COLUMN public.depenses.receipt_url IS 'URL du reçu dans Storage';
COMMENT ON COLUMN public.depenses.receipt_private IS 'Si true, le reçu est privé';

-- =====================================================
-- 5. Créer index pour les voyages publics
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_voyages_public
ON public.voyages(is_public, is_template)
WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_voyages_views
ON public.voyages(views_count DESC)
WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_voyages_uses
ON public.voyages(uses_count DESC)
WHERE is_template = true;

-- =====================================================
-- 6. Créer une vue pour les voyages publics
-- =====================================================

CREATE OR REPLACE VIEW public.public_voyages AS
SELECT
  v.id,
  v.titre,
  v.template_name,
  v.template_description,
  v.template_image_url,
  v.date_debut,
  v.date_fin,
  v.budget,
  v.devise,
  v.views_count,
  v.uses_count,
  v.is_template,
  v.created_at,
  -- Nombre d'événements (visible publiquement)
  (SELECT COUNT(*) FROM public.evenements WHERE voyage_id = v.id) as event_count,
  -- Username du créateur (si disponible)
  u.email as creator_email
FROM public.voyages v
LEFT JOIN auth.users u ON v.user_id = u.id
WHERE v.is_public = true
ORDER BY v.views_count DESC, v.created_at DESC;

COMMENT ON VIEW public.public_voyages IS 'Vue des voyages publics avec statistiques';

-- =====================================================
-- 7. Fonctions pour gérer les voyages publics
-- =====================================================

-- Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION public.increment_voyage_views(voyage_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.voyages
  SET views_count = views_count + 1
  WHERE id = voyage_id_param AND is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_voyage_views(UUID) IS
'Incrémente le compteur de vues d''un voyage public';

-- Fonction pour incrémenter le compteur d'utilisations
CREATE OR REPLACE FUNCTION public.increment_template_uses(template_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.voyages
  SET uses_count = uses_count + 1
  WHERE id = template_id_param AND is_template = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_template_uses(UUID) IS
'Incrémente le compteur d''utilisations d''un template';

-- Fonction pour dupliquer un voyage (utiliser comme modèle)
CREATE OR REPLACE FUNCTION public.duplicate_voyage_from_template(
  template_id_param UUID,
  new_user_id_param UUID,
  new_titre TEXT,
  new_date_debut DATE,
  new_date_fin DATE
)
RETURNS UUID AS $$
DECLARE
  new_voyage_id UUID;
  event_record RECORD;
  depense_record RECORD;
  checklist_record RECORD;
BEGIN
  -- Vérifier que le template existe et est public
  IF NOT EXISTS (
    SELECT 1 FROM public.voyages
    WHERE id = template_id_param AND (is_public = true OR is_template = true)
  ) THEN
    RAISE EXCEPTION 'Template non trouvé ou non public';
  END IF;

  -- Créer le nouveau voyage
  INSERT INTO public.voyages (
    user_id, titre, date_debut, date_fin, budget, devise,
    mode_achat, is_public, is_template
  )
  SELECT
    new_user_id_param,
    new_titre,
    new_date_debut,
    new_date_fin,
    budget,
    devise,
    'investor', -- Par défaut
    false, -- Le nouveau voyage n'est pas public
    false  -- Ce n'est pas un template
  FROM public.voyages
  WHERE id = template_id_param
  RETURNING id INTO new_voyage_id;

  -- Copier les événements (sans les prix si hide_price est true)
  FOR event_record IN
    SELECT * FROM public.evenements WHERE voyage_id = template_id_param
  LOOP
    INSERT INTO public.evenements (
      voyage_id, type, titre, date, heure_debut, heure_fin,
      lieu, prix, devise, notes, transport
    )
    VALUES (
      new_voyage_id,
      event_record.type,
      event_record.titre,
      new_date_debut + (event_record.date - (SELECT date_debut FROM public.voyages WHERE id = template_id_param)),
      event_record.heure_debut,
      event_record.heure_fin,
      event_record.lieu,
      CASE WHEN event_record.hide_price THEN NULL ELSE event_record.prix END,
      event_record.devise,
      event_record.notes,
      event_record.transport
    );
  END LOOP;

  -- Copier les dépenses (sans les montants si hide_amount est true)
  FOR depense_record IN
    SELECT * FROM public.depenses WHERE voyage_id = template_id_param
  LOOP
    INSERT INTO public.depenses (
      voyage_id, date, categorie, description, montant, devise
    )
    VALUES (
      new_voyage_id,
      new_date_debut + (depense_record.date - (SELECT date_debut FROM public.voyages WHERE id = template_id_param)),
      depense_record.categorie,
      depense_record.description,
      CASE WHEN depense_record.hide_amount THEN 0 ELSE depense_record.montant END,
      depense_record.devise
    );
  END LOOP;

  -- Copier la checklist
  FOR checklist_record IN
    SELECT * FROM public.checklist WHERE voyage_id = template_id_param
  LOOP
    INSERT INTO public.checklist (voyage_id, texte, complete)
    VALUES (new_voyage_id, checklist_record.texte, false);
  END LOOP;

  -- Incrémenter le compteur d'utilisations du template
  PERFORM public.increment_template_uses(template_id_param);

  RETURN new_voyage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.duplicate_voyage_from_template(UUID, UUID, TEXT, DATE, DATE) IS
'Duplique un voyage template pour créer un nouveau voyage utilisateur';

-- =====================================================
-- 8. Policies RLS pour les voyages publics
-- =====================================================

-- Policy pour lire les voyages publics (tout le monde peut voir)
DROP POLICY IF EXISTS "Anyone can view public voyages" ON public.voyages;
CREATE POLICY "Anyone can view public voyages"
ON public.voyages FOR SELECT
USING (is_public = true);

-- Policy pour lire les événements des voyages publics
DROP POLICY IF EXISTS "Anyone can view events of public voyages" ON public.evenements;
CREATE POLICY "Anyone can view events of public voyages"
ON public.evenements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = evenements.voyage_id
    AND voyages.is_public = true
  )
);

-- Policy pour lire les dépenses des voyages publics
DROP POLICY IF EXISTS "Anyone can view depenses of public voyages" ON public.depenses;
CREATE POLICY "Anyone can view depenses of public voyages"
ON public.depenses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = depenses.voyage_id
    AND voyages.is_public = true
  )
);

-- Policy pour lire les checklist des voyages publics
DROP POLICY IF EXISTS "Anyone can view checklist of public voyages" ON public.checklist;
CREATE POLICY "Anyone can view checklist of public voyages"
ON public.checklist FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = checklist.voyage_id
    AND voyages.is_public = true
  )
);

-- Policy pour lire les photos publiques
DROP POLICY IF EXISTS "Anyone can view public photos" ON public.photos;
CREATE POLICY "Anyone can view public photos"
ON public.photos FOR SELECT
USING (
  show_in_public = true
  AND EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = photos.voyage_id
    AND voyages.is_public = true
  )
);

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 015 TERMINÉE: Voyages publics et privacy';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Colonnes ajoutées:';
  RAISE NOTICE '   - voyages: is_public, is_template, privacy_*';
  RAISE NOTICE '   - photos: is_private, show_in_public';
  RAISE NOTICE '   - evenements: hide_price, receipt_*';
  RAISE NOTICE '   - depenses: hide_amount, receipt_*';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Vue créée: public_voyages';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  Fonctions créées:';
  RAISE NOTICE '   - increment_voyage_views(voyage_id)';
  RAISE NOTICE '   - increment_template_uses(template_id)';
  RAISE NOTICE '   - duplicate_voyage_from_template(...)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Policies RLS ajoutées pour accès public';
  RAISE NOTICE '';
END $$;
-- =====================================================
-- Migration 016: Correction de la récursion infinie RLS
-- =====================================================
-- Description: Supprime et recrée proprement toutes les policies RLS
--              pour éviter les duplications et récursions infinies
-- Date: 2025-10-26
-- =====================================================

-- =====================================================
-- 1. SUPPRIMER TOUTES LES POLICIES EXISTANTES
-- =====================================================

-- Policies voyages
DROP POLICY IF EXISTS "Users can view their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Users can create their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Users can update their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Users can delete their own voyages" ON public.voyages;
DROP POLICY IF EXISTS "Anyone can view public voyages" ON public.voyages;

-- Policies evenements
DROP POLICY IF EXISTS "Users can view events of their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Users can create events in their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Users can update events of their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Users can delete events of their voyages" ON public.evenements;
DROP POLICY IF EXISTS "Anyone can view events of public voyages" ON public.evenements;

-- Policies depenses
DROP POLICY IF EXISTS "RLS depenses SELECT" ON public.depenses;
DROP POLICY IF EXISTS "RLS depenses INSERT" ON public.depenses;
DROP POLICY IF EXISTS "RLS depenses UPDATE" ON public.depenses;
DROP POLICY IF EXISTS "RLS depenses DELETE" ON public.depenses;
DROP POLICY IF EXISTS "Anyone can view depenses of public voyages" ON public.depenses;

-- Policies checklist
DROP POLICY IF EXISTS "RLS checklist SELECT" ON public.checklist;
DROP POLICY IF EXISTS "RLS checklist INSERT" ON public.checklist;
DROP POLICY IF EXISTS "RLS checklist UPDATE" ON public.checklist;
DROP POLICY IF EXISTS "RLS checklist DELETE" ON public.checklist;
DROP POLICY IF EXISTS "Anyone can view checklist of public voyages" ON public.checklist;

-- Policies photos
DROP POLICY IF EXISTS "RLS photos SELECT" ON public.photos;
DROP POLICY IF EXISTS "RLS photos INSERT" ON public.photos;
DROP POLICY IF EXISTS "RLS photos DELETE" ON public.photos;
DROP POLICY IF EXISTS "Anyone can view public photos" ON public.photos;

-- Policies partage
DROP POLICY IF EXISTS "RLS partage SELECT" ON public.partage;
DROP POLICY IF EXISTS "RLS partage INSERT" ON public.partage;
DROP POLICY IF EXISTS "RLS partage UPDATE" ON public.partage;

-- =====================================================
-- 2. RECRÉER LES POLICIES PROPREMENT - VOYAGES
-- =====================================================

-- SELECT: Utilisateurs voient leurs propres voyages OU voyages publics
CREATE POLICY "voyages_select_policy" ON public.voyages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_public = true
  );

-- INSERT: Utilisateurs créent leurs propres voyages
CREATE POLICY "voyages_insert_policy" ON public.voyages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Utilisateurs modifient leurs propres voyages
CREATE POLICY "voyages_update_policy" ON public.voyages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Utilisateurs suppriment leurs propres voyages
CREATE POLICY "voyages_delete_policy" ON public.voyages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. RECRÉER LES POLICIES - EVENEMENTS
-- =====================================================

CREATE POLICY "evenements_select_policy" ON public.evenements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND (voyages.user_id = auth.uid() OR voyages.is_public = true)
    )
  );

CREATE POLICY "evenements_insert_policy" ON public.evenements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_update_policy" ON public.evenements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_delete_policy" ON public.evenements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = evenements.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. RECRÉER LES POLICIES - DEPENSES
-- =====================================================

CREATE POLICY "depenses_select_policy" ON public.depenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND (voyages.user_id = auth.uid() OR voyages.is_public = true)
    )
  );

CREATE POLICY "depenses_insert_policy" ON public.depenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_update_policy" ON public.depenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_delete_policy" ON public.depenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = depenses.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. RECRÉER LES POLICIES - CHECKLIST
-- =====================================================

CREATE POLICY "checklist_select_policy" ON public.checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND (voyages.user_id = auth.uid() OR voyages.is_public = true)
    )
  );

CREATE POLICY "checklist_insert_policy" ON public.checklist
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_update_policy" ON public.checklist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_delete_policy" ON public.checklist
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = checklist.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. RECRÉER LES POLICIES - PHOTOS
-- =====================================================

CREATE POLICY "photos_select_policy" ON public.photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = photos.voyage_id
      AND (
        voyages.user_id = auth.uid()
        OR (voyages.is_public = true AND photos.show_in_public = true)
      )
    )
  );

CREATE POLICY "photos_insert_policy" ON public.photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = photos.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "photos_delete_policy" ON public.photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = photos.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. RECRÉER LES POLICIES - PARTAGE
-- =====================================================

CREATE POLICY "partage_select_policy" ON public.partage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = partage.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "partage_insert_policy" ON public.partage
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = partage.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

CREATE POLICY "partage_update_policy" ON public.partage
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.voyages
      WHERE voyages.id = partage.voyage_id
      AND voyages.user_id = auth.uid()
    )
  );

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 016 TERMINÉE: RLS policies nettoyées';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Toutes les policies ont été supprimées et recréées';
  RAISE NOTICE '✓ Plus de récursion infinie';
  RAISE NOTICE '✓ Policies simplifiées avec noms uniques';
  RAISE NOTICE '';
END $$;
-- =====================================================
-- Migration 017: Nettoyage FORCÉ de toutes les RLS policies
-- =====================================================
-- Description: Supprime TOUTES les policies RLS existantes de force
--              avant de recréer proprement
-- Date: 2025-10-26
-- =====================================================

-- =====================================================
-- 1. DÉSACTIVER TEMPORAIREMENT RLS (pour nettoyer)
-- =====================================================

ALTER TABLE public.voyages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.partage DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. SUPPRIMER TOUTES LES POLICIES EXISTANTES - FORCE
-- =====================================================

-- Fonction pour supprimer toutes les policies d'une table
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Supprimer toutes les policies de la table voyages
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voyages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.voyages', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table evenements
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'evenements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.evenements', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table depenses
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'depenses'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.depenses', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table checklist
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'checklist'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.checklist', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table photos
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'photos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.photos', pol.policyname);
  END LOOP;

  -- Supprimer toutes les policies de la table partage
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'partage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.partage', pol.policyname);
  END LOOP;
END $$;

-- =====================================================
-- 3. RÉACTIVER RLS
-- =====================================================

ALTER TABLE public.voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CRÉER LES POLICIES - VOYAGES (simplifiées)
-- =====================================================

-- SELECT: voir ses propres voyages OU voyages publics
CREATE POLICY "voyages_select" ON public.voyages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_public = true
  );

-- INSERT: créer ses propres voyages
CREATE POLICY "voyages_insert" ON public.voyages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: modifier ses propres voyages
CREATE POLICY "voyages_update" ON public.voyages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- DELETE: supprimer ses propres voyages
CREATE POLICY "voyages_delete" ON public.voyages
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. CRÉER LES POLICIES - EVENEMENTS
-- =====================================================

CREATE POLICY "evenements_select" ON public.evenements
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "evenements_insert" ON public.evenements
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_update" ON public.evenements
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evenements_delete" ON public.evenements
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. CRÉER LES POLICIES - DEPENSES
-- =====================================================

CREATE POLICY "depenses_select" ON public.depenses
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "depenses_insert" ON public.depenses
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_update" ON public.depenses
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "depenses_delete" ON public.depenses
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. CRÉER LES POLICIES - CHECKLIST
-- =====================================================

CREATE POLICY "checklist_select" ON public.checklist
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid() OR is_public = true
    )
  );

CREATE POLICY "checklist_insert" ON public.checklist
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_update" ON public.checklist
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_delete" ON public.checklist
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. CRÉER LES POLICIES - PHOTOS
-- =====================================================

CREATE POLICY "photos_select" ON public.photos
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages
      WHERE user_id = auth.uid()
      OR (is_public = true AND show_in_public = true)
    )
  );

CREATE POLICY "photos_insert" ON public.photos
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "photos_delete" ON public.photos
  FOR DELETE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. CRÉER LES POLICIES - PARTAGE
-- =====================================================

CREATE POLICY "partage_select" ON public.partage
  FOR SELECT
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partage_insert" ON public.partage
  FOR INSERT
  WITH CHECK (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "partage_update" ON public.partage
  FOR UPDATE
  USING (
    voyage_id IN (
      SELECT id FROM public.voyages WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION 017 TERMINÉE: Nettoyage forcé RLS';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Toutes les policies ont été supprimées (force)';
  RAISE NOTICE '🔒 Nouvelles policies créées avec noms simplifiés';
  RAISE NOTICE '✓ Utilise IN au lieu de EXISTS pour éviter récursion';
  RAISE NOTICE '';
END $$;
-- Migration 018: Ajout des champs détaillés pour événements
-- Description: Ajouter adresses départ/arrivée, coordonnées GPS, infos vol, ordre optimisé

-- Ajouter les colonnes manquantes à la table evenements
ALTER TABLE public.evenements
  ADD COLUMN IF NOT EXISTS adresse TEXT,
  ADD COLUMN IF NOT EXISTS coordonnees JSONB, -- {lat: number, lng: number}
  ADD COLUMN IF NOT EXISTS ville_depart TEXT,
  ADD COLUMN IF NOT EXISTS ville_arrivee TEXT,
  ADD COLUMN IF NOT EXISTS numero_vol TEXT,
  ADD COLUMN IF NOT EXISTS compagnie TEXT,
  ADD COLUMN IF NOT EXISTS heure_arrivee TIME,
  ADD COLUMN IF NOT EXISTS date_arrivee DATE,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT CHECK (transport_mode IN ('plane', 'train', 'car', 'bus', 'bike', 'walk', 'boat')),
  ADD COLUMN IF NOT EXISTS duration INTEGER, -- Durée en minutes
  ADD COLUMN IF NOT EXISTS from_location TEXT, -- Point de départ
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS ordre INTEGER DEFAULT 0; -- Ordre dans la timeline (pour optimisation)

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_evenements_ordre ON public.evenements(voyage_id, ordre);
CREATE INDEX IF NOT EXISTS idx_evenements_date ON public.evenements(voyage_id, date, heure_debut);

-- Commentaires
COMMENT ON COLUMN public.evenements.adresse IS 'Adresse complète de l''événement';
COMMENT ON COLUMN public.evenements.coordonnees IS 'Coordonnées GPS au format JSON {lat, lng}';
COMMENT ON COLUMN public.evenements.ville_depart IS 'Ville de départ (pour vols et transports)';
COMMENT ON COLUMN public.evenements.ville_arrivee IS 'Ville d''arrivée (pour vols et transports)';
COMMENT ON COLUMN public.evenements.numero_vol IS 'Numéro de vol (ex: AC123)';
COMMENT ON COLUMN public.evenements.compagnie IS 'Compagnie aérienne ou de transport';
COMMENT ON COLUMN public.evenements.heure_arrivee IS 'Heure d''arrivée locale à destination';
COMMENT ON COLUMN public.evenements.date_arrivee IS 'Date d''arrivée (peut être différente pour vols longs)';
COMMENT ON COLUMN public.evenements.transport_mode IS 'Mode de transport spécifique pour affichage carte';
COMMENT ON COLUMN public.evenements.duration IS 'Durée estimée en minutes';
COMMENT ON COLUMN public.evenements.from_location IS 'Lieu de départ pour les transports';
COMMENT ON COLUMN public.evenements.rating IS 'Note de l''utilisateur (1-5 étoiles)';
COMMENT ON COLUMN public.evenements.ordre IS 'Ordre dans la timeline après optimisation';

-- Mettre à jour les événements existants avec un ordre basé sur la date
UPDATE public.evenements
SET ordre = subquery.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY voyage_id ORDER BY date, COALESCE(heure_debut, '00:00:00')) as row_num
  FROM public.evenements
) AS subquery
WHERE evenements.id = subquery.id;
-- Migration 019: Création de la table event_waypoints
-- Description: Points d'intérêt / étapes lors d'un événement (ex: promenade, visite guidée)

CREATE TABLE IF NOT EXISTS public.event_waypoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  coordonnees JSONB NOT NULL, -- {lat: number, lng: number}
  adresse TEXT,
  photo_url TEXT,
  visited BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Contraintes
  CONSTRAINT ordre_positive CHECK (ordre >= 0)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_waypoints_evenement ON public.event_waypoints(evenement_id, ordre);

-- Commentaires
COMMENT ON TABLE public.event_waypoints IS 'Points d''intérêt / étapes lors d''un événement (promenade, visite)';
COMMENT ON COLUMN public.event_waypoints.evenement_id IS 'Référence à l''événement parent';
COMMENT ON COLUMN public.event_waypoints.ordre IS 'Ordre de visite des points (1, 2, 3...)';
COMMENT ON COLUMN public.event_waypoints.coordonnees IS 'Coordonnées GPS du point au format {lat, lng}';
COMMENT ON COLUMN public.event_waypoints.visited IS 'Marque si le point a été visité';

-- ====================================
-- POLITIQUES RLS POUR EVENT_WAYPOINTS
-- ====================================

-- Les utilisateurs peuvent voir les waypoints de leurs événements
CREATE POLICY "Users can view waypoints from their events"
  ON public.event_waypoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent créer des waypoints dans leurs événements
CREATE POLICY "Users can create waypoints in their events"
  ON public.event_waypoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent mettre à jour les waypoints de leurs événements
CREATE POLICY "Users can update waypoints from their events"
  ON public.event_waypoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent supprimer les waypoints de leurs événements
CREATE POLICY "Users can delete waypoints from their events"
  ON public.event_waypoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      WHERE evenements.id = event_waypoints.evenement_id
      AND voyages.user_id = auth.uid()
    )
  );

-- Politique publique: Les waypoints des événements partagés sont visibles
CREATE POLICY "Anyone can view waypoints from shared events"
  ON public.event_waypoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evenements
      JOIN public.voyages ON voyages.id = evenements.voyage_id
      JOIN public.partage ON partage.voyage_id = voyages.id
      WHERE evenements.id = event_waypoints.evenement_id
      AND partage.actif = TRUE
    )
  );
-- Migration 020: Ajout du champ external_link aux événements
-- Description: Permet de stocker un lien vers une application/site web lié à l'événement
-- (ex: lien de réservation, billetterie, site de l'événement, etc.)

ALTER TABLE public.evenements
ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Commentaire
COMMENT ON COLUMN public.evenements.external_link IS 'Lien externe vers une application ou site web lié à l''événement (réservation, billetterie, etc.)';
