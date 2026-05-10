# CERDIA Security Policy

## Incident Response
- Rôle de responsable sécurité : Eric Dufort (eric.dufort@cerdia.ai)
- Évaluations de sécurité : semestrielles (mai et novembre)
- Notifications d'incidents : disponibles 24/7 via eric.dufort@cerdia.ai
- Tout incident impliquant des données Amazon est signalé à security@amazon.com dans les 24 heures suivant sa détection.

## Password Policy
- Longueur minimale : 12 caractères
- Caractères spéciaux requis
- MFA obligatoire sur tous les comptes admin (AWS, Supabase, GitHub, Vercel, Amazon Seller)
- Expiration : 365 jours
- Rotation annuelle obligatoire

## Data Protection
- Chiffrement au repos : AES-256-GCM (refresh tokens), Postgres native (autres données)
- Chiffrement en transit : TLS 1.3 partout
- Accès aux données Amazon : limité aux administrateurs via RLS Supabase
- Pas de partage avec tiers, pas de revente
