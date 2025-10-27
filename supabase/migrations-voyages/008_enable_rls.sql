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
