# 📱 DÉPLOIEMENT MOBILE - CERDIA VOYAGE

Guide complet pour déployer l'application sur **Google Play Store** et **Apple App Store**.

---

## 🎯 ARCHITECTURE

```
investissement-cerdia-main/
├── app/                    # Next.js app
├── components/             # Composants React
├── android/                # Projet Android natif (généré par Capacitor)
├── ios/                    # Projet iOS natif (généré par Capacitor)
├── out/                    # Build statique Next.js (pour Capacitor)
├── capacitor.config.ts     # Configuration Capacitor
├── next.config.js          # Modifié pour export statique avec BUILD_MODE
└── manifest.json           # PWA manifest (déjà existant)
```

**Distribution:**
- **Investisseurs**: PWA web (https://cerdia.com) - Mode gratuit
- **Autres utilisateurs**: Google Play / Apple App Store - Téléchargement requis

---

## ⚡ ÉTAPE 1: INITIALISER CAPACITOR (À FAIRE UNE SEULE FOIS)

### 1.1 Ajouter les plateformes

```bash
# Initialiser Capacitor (déjà fait si capacitor.config.ts existe)
npm run cap:init

# Ajouter Android
npm run cap:add:android

# Ajouter iOS (nécessite un Mac)
npm run cap:add:ios
```

### 1.2 Build initial

```bash
# Build Next.js en mode export statique + sync Capacitor
npm run build:mobile
```

Cette commande va:
1. Exporter Next.js en mode statique dans `/out`
2. Copier les fichiers dans `/android/app/src/main/assets/public` et `/ios/App/App/public`

---

## 📦 ÉTAPE 2: PRÉPARER LES ASSETS

### 2.1 Icône de l'application

Créez une icône **1024x1024px** PNG avec fond:
- Placez-la dans `/public/icon-1024.png`
- Format: PNG, pas de transparence pour iOS
- Contenu: Logo CERDIA + texte "Voyage"

### 2.2 Splash Screen

Créez un splash screen **2732x2732px** PNG:
- Placez-la dans `/public/splash.png`
- Format: PNG
- Fond: #5e5e5e (couleur CERDIA)
- Logo centré

### 2.3 Générer automatiquement les assets

```bash
# Installer le générateur d'assets
npm install @capacitor/assets --save-dev

# Générer tous les formats d'icônes et splash screens
npx capacitor-assets generate
```

Ceci va générer:
- Android: `android/app/src/main/res/`
- iOS: `ios/App/App/Assets.xcassets/`

---

## 🤖 ÉTAPE 3: DÉPLOIEMENT ANDROID (GOOGLE PLAY)

### 3.1 Prérequis

- ✅ Compte Google Play Developer (25$ une fois): https://play.google.com/console/signup
- ✅ Android Studio installé: https://developer.android.com/studio
- ✅ Java JDK 11+ installé

### 3.2 Ouvrir le projet Android

```bash
npm run cap:open:android
```

Android Studio va s'ouvrir avec le projet.

### 3.3 Configuration dans Android Studio

1. **App ID**: Déjà configuré à `com.cerdia.voyage` dans `capacitor.config.ts`

2. **Version de l'app**:
   - Ouvrir `android/app/build.gradle`
   - Modifier `versionCode` (1, 2, 3...) et `versionName` ("1.0.0", "1.0.1"...)

3. **Nom de l'app**:
   - Déjà configuré à "CERDIA Voyage" dans `capacitor.config.ts`

### 3.4 Signer l'application (IMPORTANT)

#### Créer une clé de signature (À FAIRE UNE SEULE FOIS):

```bash
cd android/app
keytool -genkey -v -keystore cerdia-release-key.keystore -alias cerdia -keyalg RSA -keysize 2048 -validity 10000
```

Répondez aux questions:
- Mot de passe: **GARDEZ-LE PRÉCIEUSEMENT**
- Prénom/Nom: "CERDIA Inc"
- Ville: Votre ville
- etc.

#### Configurer Gradle pour signer:

Créez `android/key.properties`:
```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=cerdia
storeFile=app/cerdia-release-key.keystore
```

**⚠️ NE JAMAIS COMMIT key.properties DANS GIT!**

Ajoutez dans `.gitignore`:
```
android/key.properties
android/app/cerdia-release-key.keystore
```

### 3.5 Build Release (AAB)

```bash
# Build Android App Bundle (format requis par Google Play)
npm run cap:release:android
```

Le fichier AAB sera dans:
`android/app/build/outputs/bundle/release/app-release.aab`

### 3.6 Upload sur Google Play Console

1. Allez sur https://play.google.com/console
2. Cliquez "Créer une application"
3. Remplissez les infos:
   - **Nom**: CERDIA Voyage
   - **Langue par défaut**: Français (Canada)
   - **Type**: Application
   - **Gratuite ou payante**: Gratuite

4. **Tableau de bord de l'app** → Production:
   - Upload `app-release.aab`
   - Remplissez les notes de version

5. **Fiche du Store**:
   - **Description courte** (80 caractères max):
     ```
     Planifiez vos voyages avec IA, budgets, cartes et itinéraires intelligents
     ```

   - **Description complète** (4000 caractères max):
     ```
     CERDIA Voyage est l'application tout-en-un pour planifier vos voyages parfaits.

     🗺️ FONCTIONNALITÉS PRINCIPALES:
     • Planification d'itinéraire jour par jour
     • Carte interactive avec tous vos événements
     • Gestion de budget en temps réel
     • Timeline visuelle de votre voyage
     • Checklist intelligente
     • Calcul automatique des décalages horaires pour vols internationaux
     • Partage de voyage avec famille/amis

     ✨ AVEC IA:
     • Génération d'itinéraire automatique
     • Suggestions de lieux personnalisées
     • Optimisation de parcours

     💰 BUDGET:
     • Suivi des dépenses
     • Conversion de devises
     • Graphiques de dépenses par catégorie

     🌍 MULTI-DESTINATION:
     • Voyages illimités
     • Support de 150+ pays
     • Mode hors ligne

     📱 SYNCHRONISATION:
     • Sauvegarde cloud sécurisée
     • Accès multi-appareils
     • Mode collaboratif (bientôt)

     PRIX:
     • Mode gratuit: 1 voyage, impression uniquement
     • Un voyage: 5$ CAD, 6 mois, 1 voyage
     • Illimité: 15$ CAD, accès à vie, voyages illimités
     ```

   - **Icône**: Upload `icon-512.png` (512x512px)

   - **Feature Graphic**: 1024x500px PNG
     - Créez une bannière avec logo + texte "Planifiez vos voyages"

   - **Screenshots**: Minimum 2 (idéalement 4-8)
     - Téléphone: 1080x1920px ou 1080x2340px
     - Tablette: 1200x1920px
     - Capturez: Dashboard, Timeline, Carte, Budget

   - **Catégorie**: Voyages et local

   - **Adresse email**: support@cerdia.com

   - **Politique de confidentialité**: URL requise (créez une page)
     - Exemple: https://cerdia.com/privacy-policy

6. **Classification du contenu**:
   - Remplissez le questionnaire
   - Pas de contenu sensible normalement

7. **Public cible**:
   - Sélectionnez "13 ans et +"

8. **Prix et distribution**:
   - Gratuit
   - Pays: Tous
   - Achats intégrés: Oui (5$ et 15$)

9. **Soumettre pour review**: 24-48h généralement

---

## 🍎 ÉTAPE 4: DÉPLOIEMENT iOS (APPLE APP STORE)

### 4.1 Prérequis

- ✅ **Mac** avec macOS 12+ (OBLIGATOIRE)
- ✅ Compte Apple Developer (99$/an): https://developer.apple.com
- ✅ Xcode 14+ installé

### 4.2 Ouvrir le projet iOS

```bash
npm run cap:open:ios
```

Xcode va s'ouvrir.

### 4.3 Configuration dans Xcode

1. **Bundle Identifier**: `com.cerdia.voyage` (déjà configuré)

2. **Équipe de développement**:
   - Ouvrir le projet dans Xcode
   - Sélectionner le target "App"
   - Signing & Capabilities → Team → Sélectionnez votre équipe

3. **Version**:
   - General → Identity
   - Version: 1.0.0
   - Build: 1

### 4.4 Créer App dans App Store Connect

1. Allez sur https://appstoreconnect.apple.com
2. Mes apps → + → Nouvelle app
3. Remplissez:
   - **Plateformes**: iOS
   - **Nom**: CERDIA Voyage
   - **Langue principale**: Français (Canada)
   - **Bundle ID**: com.cerdia.voyage
   - **SKU**: cerdia-voyage-2025

### 4.5 Build et Upload

#### En ligne de commande:

```bash
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive -archivePath build/App.xcarchive
xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build/ -exportOptionsPlist exportOptions.plist
```

#### Via Xcode (Plus simple):

1. Product → Archive
2. Window → Organizer
3. Sélectionnez l'archive → Distribute App
4. App Store Connect → Upload
5. Suivez les étapes

### 4.6 Fiche du Store (App Store Connect)

1. **Informations de l'app**:
   - **Sous-titre** (30 caractères max):
     ```
     Voyage IA, budgets, cartes
     ```

   - **Description** (4000 caractères max): Même que Google Play

   - **Mots-clés** (100 caractères max):
     ```
     voyage,itineraire,budget,carte,planification,vacances,tourisme,ia
     ```

   - **URL d'assistance**: https://cerdia.com/support

   - **URL marketing**: https://cerdia.com

2. **Captures d'écran** (OBLIGATOIRE):
   - iPhone 6.7": 1290x2796px (3 min)
   - iPhone 6.5": 1242x2688px (3 min)
   - iPad Pro 12.9": 2048x2732px (2 min)

3. **Confidentialité**:
   - URL de politique: https://cerdia.com/privacy-policy

4. **Prix**:
   - Gratuit
   - Achats intégrés: Créez les 2 produits (5$ et 15$)

5. **Soumettre pour review**: 2-5 jours généralement

---

## 🔧 COMMANDES UTILES

```bash
# Development
npm run dev                      # Dev web normal

# Capacitor
npm run build:mobile            # Build + sync Capacitor
npm run cap:sync               # Sync seulement
npm run cap:open:android       # Ouvrir Android Studio
npm run cap:open:ios           # Ouvrir Xcode

# Android
npm run cap:build:android      # Build debug APK
npm run cap:release:android    # Build release AAB

# Debug
npx cap run android            # Run sur émulateur Android
npx cap run ios                # Run sur simulateur iOS
```

---

## 🐛 DÉPANNAGE

### Problème: "Could not find android/app"

**Solution**: Exécutez d'abord `npm run cap:add:android`

### Problème: Build échoue - "Export statique failed"

**Cause**: i18n incompatible avec export statique

**Solution**: Déjà corrigé dans `next.config.js` avec condition `isCapacitor`

### Problème: Images ne chargent pas dans l'app

**Cause**: Image optimization incompatible avec export statique

**Solution**: Déjà corrigé avec `unoptimized: isDev || isCapacitor`

### Problème: API Supabase ne fonctionne pas

**Solution**: Ajoutez les permissions dans `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### Problème: iOS build échoue - "Code signing"

**Solution**:
1. Xcode → Preferences → Accounts
2. Ajoutez votre compte Apple Developer
3. Retournez dans le projet → Signing → Sélectionnez l'équipe

---

## 📊 MÉTRIQUES DE SUCCÈS

Une fois publiées, suivez:
- **Google Play Console** → Statistiques
- **App Store Connect** → Analytics

Métriques clés:
- Installations
- Désinstallations
- Évaluations & avis
- Taux de conversion (visiteurs → installations)
- Revenus in-app (5$ et 15$)

---

## 🚀 PROCHAINES ÉTAPES

Après déploiement initial:

1. **Mises à jour**:
   ```bash
   # Incrémenter version dans build.gradle (Android) et Xcode (iOS)
   npm run build:mobile
   npm run cap:release:android  # Pour Android
   # Upload via Xcode pour iOS
   ```

2. **Monitoring**:
   - Firebase Analytics
   - Crashlytics
   - Sentry

3. **Marketing**:
   - App Store Optimization (ASO)
   - Social media (Instagram, TikTok)
   - Google Ads
   - Apple Search Ads

---

## 📞 SUPPORT

Questions? Contactez l'équipe de développement CERDIA.

**Email**: dev@cerdia.com
**Discord**: https://discord.gg/cerdia

---

**Créé par CERDIA - 2025**
