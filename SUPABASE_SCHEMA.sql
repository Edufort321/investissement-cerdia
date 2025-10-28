-- ============================================
-- SCHÉMA SUPABASE POUR MON VOYAGE
-- ============================================

-- Table: voyages
-- Stocke les informations principales de chaque voyage
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

  -- Métadonnées
  mode_achat TEXT CHECK (mode_achat IN ('investor', 'single', 'full')),
  expire_at TIMESTAMP WITH TIME ZONE, -- Pour mode 'single' (6 mois)

  CONSTRAINT budget_positive CHECK (budget >= 0)
);

-- Table: evenements
-- Stocke les événements du timeline (vols, hébergements, activités, etc.)
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
  transport TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT prix_positive CHECK (prix >= 0)
);

-- Table: depenses
-- Stocke les dépenses du voyage
CREATE TABLE IF NOT EXISTS public.depenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  categorie TEXT NOT NULL,
  description TEXT,
  montant DECIMAL(10, 2) NOT NULL,
  devise TEXT DEFAULT 'CAD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT montant_positive CHECK (montant >= 0)
);

-- Table: checklist
-- Stocke les items de la checklist
CREATE TABLE IF NOT EXISTS public.checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  texte TEXT NOT NULL,
  complete BOOLEAN DEFAULT FALSE,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Table: photos
-- Stocke les métadonnées des photos uploadées (fichiers dans Supabase Storage)
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  evenement_id UUID REFERENCES public.evenements(id) ON DELETE CASCADE,
  depense_id UUID REFERENCES public.depenses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Chemin dans Supabase Storage
  nom_fichier TEXT NOT NULL,
  taille INTEGER,
  type_mime TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Table: partage
-- Stocke les informations de partage "Me Suivre"
CREATE TABLE IF NOT EXISTS public.partage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voyage_id UUID NOT NULL REFERENCES public.voyages(id) ON DELETE CASCADE,
  actif BOOLEAN DEFAULT FALSE,
  lien_partage TEXT UNIQUE NOT NULL,
  en_direct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  CONSTRAINT unique_voyage_partage UNIQUE (voyage_id)
);

-- ============================================
-- INDEX POUR PERFORMANCES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_voyages_user_id ON public.voyages(user_id);
CREATE INDEX IF NOT EXISTS idx_evenements_voyage_id ON public.evenements(voyage_id);
CREATE INDEX IF NOT EXISTS idx_depenses_voyage_id ON public.depenses(voyage_id);
CREATE INDEX IF NOT EXISTS idx_checklist_voyage_id ON public.checklist(voyage_id);
CREATE INDEX IF NOT EXISTS idx_photos_voyage_id ON public.photos(voyage_id);
CREATE INDEX IF NOT EXISTS idx_photos_evenement_id ON public.photos(evenement_id);
CREATE INDEX IF NOT EXISTS idx_photos_depense_id ON public.photos(depense_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.voyages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partage ENABLE ROW LEVEL SECURITY;

-- Politiques pour voyages
CREATE POLICY "Les utilisateurs peuvent voir leurs propres voyages"
  ON public.voyages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs propres voyages"
  ON public.voyages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres voyages"
  ON public.voyages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres voyages"
  ON public.voyages FOR DELETE
  USING (auth.uid() = user_id);

-- Politiques pour evenements
CREATE POLICY "Les utilisateurs peuvent voir les événements de leurs voyages"
  ON public.evenements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = evenements.voyage_id
    AND voyages.user_id = auth.uid()
  ));

CREATE POLICY "Les utilisateurs peuvent créer des événements dans leurs voyages"
  ON public.evenements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = evenements.voyage_id
    AND voyages.user_id = auth.uid()
  ));

CREATE POLICY "Les utilisateurs peuvent modifier les événements de leurs voyages"
  ON public.evenements FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = evenements.voyage_id
    AND voyages.user_id = auth.uid()
  ));

CREATE POLICY "Les utilisateurs peuvent supprimer les événements de leurs voyages"
  ON public.evenements FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.voyages
    WHERE voyages.id = evenements.voyage_id
    AND voyages.user_id = auth.uid()
  ));

-- Politiques similaires pour depenses, checklist, photos, partage
-- (Simplifiées pour la lisibilité, mais suivent le même pattern)

CREATE POLICY "RLS depenses SELECT" ON public.depenses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS depenses INSERT" ON public.depenses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS depenses UPDATE" ON public.depenses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS depenses DELETE" ON public.depenses FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = depenses.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "RLS checklist SELECT" ON public.checklist FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS checklist INSERT" ON public.checklist FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS checklist UPDATE" ON public.checklist FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS checklist DELETE" ON public.checklist FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = checklist.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "RLS photos SELECT" ON public.photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS photos INSERT" ON public.photos FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS photos DELETE" ON public.photos FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = photos.voyage_id AND voyages.user_id = auth.uid()));

CREATE POLICY "RLS partage SELECT" ON public.partage FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS partage INSERT" ON public.partage FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));
CREATE POLICY "RLS partage UPDATE" ON public.partage FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.voyages WHERE voyages.id = partage.voyage_id AND voyages.user_id = auth.uid()));

-- ============================================
-- BUCKET SUPABASE STORAGE POUR PHOTOS
-- ============================================

-- Créer le bucket dans Supabase Dashboard > Storage
-- Nom: voyage-photos
-- Public: false
-- Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
-- Max file size: 5MB

-- Policy pour le bucket (à exécuter via l'interface Supabase Storage Policies):
-- INSERT: auth.uid() = (storage.objects.bucket_id = 'voyage-photos')
-- SELECT: auth.uid() = (storage.objects.bucket_id = 'voyage-photos')
-- DELETE: auth.uid() = (storage.objects.bucket_id = 'voyage-photos')

-- ============================================
-- FONCTION TRIGGER: Mettre à jour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.voyages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STORAGE: Policies pour voyage-photos
-- ============================================
-- Note: Le bucket "voyage-photos" doit être créé AVANT d'exécuter ces policies
-- Utilisez le script: supabase/47-create-all-storage-buckets.sql

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can upload their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their voyage photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their voyage photos" ON storage.objects;

-- Policy INSERT: Upload de photos
CREATE POLICY "Users can upload their voyage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voyage-photos'
  AND auth.uid() IS NOT NULL
);

-- Policy SELECT: Téléchargement (uniquement SES photos)
CREATE POLICY "Users can view their voyage photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy DELETE: Suppression (uniquement SES photos)
CREATE POLICY "Users can delete their voyage photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voyage-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy UPDATE: Modification métadonnées (uniquement SES photos)
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

-- Fonctions helper pour Storage
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

-- ============================================
-- INSTRUCTIONS D'INSTALLATION
-- ============================================

/*
Pour appliquer ce schéma dans votre projet Supabase :

MÉTHODE RECOMMANDÉE: Utilisez les fichiers de migration individuels
dans supabase/migrations/ (001 → 014) pour un déploiement modulaire.

MÉTHODE ALTERNATIVE: Fichier consolidé (ce fichier)

1. Connectez-vous à votre dashboard Supabase : https://app.supabase.com/
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"

4. IMPORTANT: Créez d'abord le bucket Storage
   - Exécutez le script: supabase/47-create-all-storage-buckets.sql
   - Cela créera automatiquement le bucket "voyage-photos" et 4 autres

5. Ensuite, exécutez ce fichier consolidé
   - Nouvelle query
   - Copiez-collez tout ce fichier
   - Cliquez sur "RUN"

VÉRIFICATION:
- Tables: SELECT * FROM voyages LIMIT 1;
- Bucket: SELECT * FROM public.check_voyage_photos_bucket();
- Policies Storage: SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

NOTES DE SÉCURITÉ:
- Toutes les tables utilisent Row Level Security (RLS)
- Les utilisateurs ne peuvent accéder qu'à leurs propres données
- Les fichiers uploadés sont privés et accessibles uniquement par le propriétaire
- Les clés étrangères garantissent l'intégrité des données
- Structure des chemins: voyage-photos/{user_id}/{voyage_id}/{filename}
*/
