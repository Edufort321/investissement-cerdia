# Migrations - Application Investissement

Ce dossier contient toutes les migrations SQL pour l'application **Gestion d'Investissements Immobiliers**.

## Structure de l'application

### Tables principales
- `investors` - Investisseurs et leurs informations
- `properties` - Propriétés immobilières
- `transactions` - Transactions financières
- `payment_schedules` - Échéanciers de paiement
- `exchange_rates` - Taux de change
- `scenarios` - Scénarios d'évaluation
- `company_settings` - Paramètres de l'entreprise
- `corporate_book` - Livre d'entreprise
- Et bien d'autres...

## Ordre d'exécution

Les migrations doivent être exécutées dans l'ordre suivant :

### Migrations de base (1-10)
1. `1-cleanup.sql` - Nettoyage initial
2. `2-create-tables.sql` - Création des tables principales
3. `3-create-indexes.sql` - Index pour performance
4. `4-create-triggers.sql` - Triggers automatiques
5. `5-enable-rls.sql` - Activation de la sécurité RLS
6. `6-insert-data.sql` - Données initiales
7. `7-storage-policies.sql` - Politiques de storage
8. `8-add-currency-support.sql` - Support multi-devises
9. `9-add-payment-schedules.sql` - Échéanciers de paiement
10. `10-add-compte-courant-SIMPLIFIE.sql` - Compte courant

### Migrations fonctionnelles (11-50)
- `11-add-property-attachments.sql` - Pièces jointes propriétés
- `12-add-international-tax-fields.sql` - Fiscalité internationale
- `13-add-roi-performance-tracking.sql` - Suivi performance ROI
- `14-enhance-payment-schedules.sql` - Amélioration échéanciers
- `15-link-payments-to-transactions.sql` - Liaison paiements/transactions
- `16-add-transaction-fees-and-effective-rate.sql` - Frais et taux effectif
- `17-setup-storage-policies.sql` - Configuration storage
- `18-create-investor-investments.sql` - Investissements
- `19-create-company-settings.sql` - Paramètres société
- `20-create-scenarios.sql` - Scénarios d'évaluation
- Et plus...

### Migrations récentes
- `018_add_payment_completion_status.sql` - Statut paiement complet/partiel
- `20250122_notes_and_todos.sql` - Notes et todos
- `20250127_add_to_total_initial_fees.sql` - Frais initiaux
- `20250127_add_to_total_properties.sql` - Total propriétés

## Fichiers de déploiement

- `APPLY_ADD_TO_TOTAL.sql` - Appliquer les modifications add_to_total
- `apply_all_migrations.sql` - Appliquer toutes les migrations
- `DEPLOY_ALL.sql` - Script de déploiement complet
- `DEPLOY-ALL-CRITICAL.sql` - Déploiement critique

## Guides

- `00-DEPLOY-GUIDE.md` - Guide de déploiement
- `README-CORPORATE-BOOK.md` - Documentation livre d'entreprise
- `README-TRANSACTION-ATTACHMENTS.md` - Documentation pièces jointes

## Notes importantes

⚠️ **ATTENTION** : Ces migrations sont pour l'application **Investissement** uniquement.
Pour les migrations de l'application **Mes Voyages**, voir le dossier `migrations-voyages/`.

## Ordre d'exécution recommandé

1. Exécuter les migrations de base (1-10) dans l'ordre
2. Exécuter les migrations fonctionnelles selon les besoins
3. En cas de problème, consulter les fichiers `99-FIX-*.sql`

## Support

Pour toute question, consulter la documentation principale dans `/supabase/README.md`
