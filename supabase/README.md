# 🗄️ Migrations Supabase - Plateforme CERDIA

Ce dossier contient toutes les migrations SQL pour les deux applications de la plateforme CERDIA.

## 🏗️ Architecture - Deux applications distinctes

Ce projet contient **deux applications indépendantes** qui partagent la même base de données Supabase :

### 1. 💼 **Application Investissement** (`/migrations-investisseur`)
- Gestion de portefeuille immobilier
- Suivi des investisseurs et parts
- Transactions financières multi-devises
- Échéanciers de paiement
- Rapports fiscaux (T1135, T2209)
- Performance ROI

### 2. ✈️ **Application Mes Voyages** (`/migrations-voyages`)
- Planification de voyages
- Gestion d'événements
- Suivi des dépenses
- Checklist de voyage
- Galerie photos
- Partage de localisation en temps réel

## 📁 Structure des dossiers

```
supabase/
├── migrations-investisseur/      # 🏢 Application Investissement
│   ├── README.md                  # Documentation investisseur
│   ├── 1-cleanup.sql              # Nettoyage initial
│   ├── 2-create-tables.sql        # Tables principales
│   ├── ...                        # Migrations numérotées
│   ├── 018_add_payment_completion_status.sql
│   └── 99-*.sql                   # Scripts de correction
│
├── migrations-voyages/            # ✈️ Application Mes Voyages
│   ├── README.md                  # Documentation voyages
│   ├── 001_create_voyages_table.sql
│   ├── 002_create_evenements_table.sql
│   └── ...                        # Migrations numérotées
│
├── guides/                        # Documentation et guides
├── README.md                      # Ce fichier
├── QUICK_START.md                 # Guide démarrage rapide
└── MANIFEST.md                    # Manifeste des migrations
```

## 🚀 Installation

### Pour l'Application Investissement 💼

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Exécutez les migrations dans l'ordre :
   ```bash
   migrations-investisseur/
   ├── 1-cleanup.sql              # Commencez ici
   ├── 2-create-tables.sql
   ├── 3-create-indexes.sql
   └── ...                        # Continuez dans l'ordre
   ```

📖 **Documentation complète** : Voir `/migrations-investisseur/README.md`

### Pour l'Application Mes Voyages ✈️

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Exécutez les migrations dans l'ordre :
   ```bash
   migrations-voyages/
   ├── 001_create_voyages_table.sql    # Commencez ici
   ├── 002_create_evenements_table.sql
   ├── 003_create_depenses_table.sql
   └── ...                             # Continuez dans l'ordre
   ```

📖 **Documentation complète** : Voir `/migrations-voyages/README.md`

## ⚠️ Important

- **Ne pas mélanger** les migrations des deux applications
- Chaque application a son propre ordre d'exécution
- Les deux applications partagent la même base de données
- Consulter le README de chaque dossier pour les détails

## 📚 Guides disponibles

- [`QUICK_START.md`](./QUICK_START.md) - Guide de démarrage rapide
- [`MANIFEST.md`](./MANIFEST.md) - Manifeste des migrations
- [`SETUP_AUTOMATIQUE.md`](./SETUP_AUTOMATIQUE.md) - Configuration automatique

---

**Plateforme:** CERDIA
**Applications:** Investissement + Mes Voyages
**Version:** 2.0.0
