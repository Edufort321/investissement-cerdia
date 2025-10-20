-- ==========================================
-- MIGRATION 19: TABLE COMPANY SETTINGS
-- Paramètres globaux de l'entreprise (valeur des parts, etc.)
-- ==========================================

-- Table pour paramètres de l'entreprise
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  last_updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide par clé
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_settings_key
  ON public.company_settings(setting_key);

-- RLS (Row Level Security)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs authentifiés peuvent tout faire
CREATE POLICY "Enable all access for authenticated users"
  ON public.company_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Insérer les paramètres par défaut
INSERT INTO public.company_settings (setting_key, setting_value, setting_type, description)
VALUES
  ('nominal_share_value', '1.00', 'number', 'Valeur nominale d''une part (prix de vente actuel) en CAD'),
  ('estimated_share_value', '1.00', 'number', 'Valeur estimée d''une part basée sur performance ROI (calculée automatiquement)'),
  ('company_name', 'CERDIA Investment Platform', 'string', 'Nom de l''entreprise'),
  ('share_calculation_method', 'weighted_roi', 'string', 'Méthode de calcul valeur estimée: weighted_roi, simple_average, property_value'),
  ('last_share_value_calculation', NOW()::TEXT, 'string', 'Date dernière mise à jour valeur estimée des parts')
ON CONFLICT (setting_key) DO NOTHING;

-- Fonction helper pour récupérer une valeur
CREATE OR REPLACE FUNCTION get_setting(key_name VARCHAR)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT setting_value INTO result
  FROM public.company_settings
  WHERE setting_key = key_name;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction helper pour mettre à jour une valeur
CREATE OR REPLACE FUNCTION update_setting(key_name VARCHAR, new_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.company_settings
  SET setting_value = new_value,
      updated_at = NOW()
  WHERE setting_key = key_name;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Vue pour accès facile aux settings principaux
CREATE OR REPLACE VIEW public.share_settings AS
SELECT
  get_setting('nominal_share_value')::DECIMAL(10, 4) AS nominal_share_value,
  get_setting('estimated_share_value')::DECIMAL(10, 4) AS estimated_share_value,
  get_setting('company_name') AS company_name,
  get_setting('share_calculation_method') AS calculation_method,
  get_setting('last_share_value_calculation')::TIMESTAMP AS last_calculation_date;

-- Commentaires
COMMENT ON TABLE public.company_settings IS 'Paramètres globaux de l''entreprise (valeur parts, configuration)';
COMMENT ON COLUMN public.company_settings.setting_key IS 'Clé unique du paramètre';
COMMENT ON COLUMN public.company_settings.setting_value IS 'Valeur du paramètre (stockée en texte)';
COMMENT ON COLUMN public.company_settings.setting_type IS 'Type de donnée: string, number, boolean, json';

-- Message de confirmation
SELECT '✅ Table company_settings créée avec valeurs par défaut!' AS message;
SELECT 'Valeur nominale par part: ' || get_setting('nominal_share_value') || ' CAD' AS info;
