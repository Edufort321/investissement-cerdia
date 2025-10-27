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
