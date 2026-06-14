-- 219 — Archivage + envoi du certificat de souscription d'actions (Livre d'entreprise).
-- Le PDF signé (avec logo) est téléversé dans le bucket `corporate-documents` puis
-- envoyé par courriel à l'actionnaire (route /api/commerce/shareholder/send-certificate).
-- On garde la trace du chemin du fichier archivé + l'horodatage d'envoi.

alter table public.company_shareholders
  add column if not exists certificate_path    text,        -- chemin storage du PDF archivé
  add column if not exists certificate_sent_at timestamptz, -- date d'envoi par courriel
  add column if not exists certificate_sent_to text;        -- courriel destinataire

-- Note : le bucket `corporate-documents` existe déjà (migration 61). L'upload se fait
-- côté serveur via service_role (route API), donc aucune policy storage à ajouter ici.
