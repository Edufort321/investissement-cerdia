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
