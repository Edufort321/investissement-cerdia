# Assets Mobile - Guide de Génération

## 📱 Fichiers Sources Créés

Les assets sources ont été créés dans `/public`:

- **icon.svg** (1024x1024px) - Icône de l'application
- **splash.svg** (2732x2732px) - Splash screen

## 🎨 Design

**Couleurs principales:**
- Indigo: #6366f1
- Purple: #8b5cf6
- Blanc: #ffffff

**Éléments:**
- Avion stylisé (symbole de voyage)
- Points de localisation (départ/arrivée)
- Ligne pointillée (route de voyage)
- Branding "CERDIA Voyage"

## 🔧 Génération des Assets pour Mobile

### Étape 1: Convertir SVG en PNG (requis)

Les fichiers SVG doivent être convertis en PNG avant d'utiliser @capacitor/assets.

**Option A: En ligne (plus simple)**
1. Aller sur https://svgtopng.com/ ou https://cloudconvert.com/svg-to-png
2. Uploader `public/icon.svg`
3. Convertir en PNG 1024x1024px
4. Sauvegarder comme `resources/icon.png`
5. Répéter pour `public/splash.svg` → `resources/splash.png` (2732x2732px)

**Option B: Avec un outil CLI (si installé)**
```bash
# Avec ImageMagick
convert public/icon.svg -resize 1024x1024 resources/icon.png
convert public/splash.svg -resize 2732x2732 resources/splash.png

# Avec Inkscape
inkscape public/icon.svg --export-filename=resources/icon.png -w 1024 -h 1024
inkscape public/splash.svg --export-filename=resources/splash.png -w 2732 -h 2732
```

### Étape 2: Générer tous les formats

Une fois les PNG créés dans `/resources`:

```bash
# Générer automatiquement tous les formats
npx @capacitor/assets generate --iconBackgroundColor '#6366f1' --iconBackgroundColorDark '#4338ca' --splashBackgroundColor '#6366f1' --splashBackgroundColorDark '#4338ca'
```

**Cette commande crée:**

**Pour Android:**
- `android/app/src/main/res/drawable*/` (icônes adaptives)
- `android/app/src/main/res/mipmap*/` (icônes launcher)
- Densités: ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi

**Pour iOS:**
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (icônes)
- `ios/App/App/Assets.xcassets/Splash.imageset/` (splash screens)
- Tailles: 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt (1x, 2x, 3x)

## 📋 Formats Générés

### Icônes Android (adaptives)
- 48×48 (mdpi)
- 72×72 (hdpi)
- 96×96 (xhdpi)
- 144×144 (xxhdpi)
- 192×192 (xxxhdpi)

### Icônes iOS
- 20×20, 40×40, 60×60 (1x, 2x, 3x)
- 29×29, 58×58, 87×87
- 40×40, 80×80, 120×120
- 76×76, 152×152
- 167×167 (iPad Pro)
- 1024×1024 (App Store)

### Splash Screens
- Multiple résolutions pour iOS (iPhone, iPad, landscape/portrait)
- Multiple densités pour Android

## 🚀 Prochaines Étapes

Après génération des assets:

1. **Ajouter les plateformes:**
   ```bash
   npm run cap:add:android
   npm run cap:add:ios
   ```

2. **Vérifier les assets:**
   - Android: Ouvrir dans Android Studio et vérifier `res/` et `mipmap/`
   - iOS: Ouvrir dans Xcode et vérifier `Assets.xcassets`

3. **Tester:**
   ```bash
   npm run cap:open:android  # Ouvrir dans Android Studio
   npm run cap:open:ios      # Ouvrir dans Xcode
   ```

## 💡 Tips

**Pour modifier le design:**
1. Éditer `public/icon.svg` ou `public/splash.svg`
2. Reconvertir en PNG dans `/resources`
3. Régénérer avec `npx @capacitor/assets generate`

**Couleurs de fond:**
- Utilisez `--iconBackgroundColor` pour la couleur derrière l'icône
- Utilisez `--splashBackgroundColor` pour le fond du splash screen
- Ajoutez `-dark` pour les versions dark mode

**Vérification qualité:**
- Icône: Doit être visible à 48×48px minimum
- Splash: Doit être lisible sur tous les écrans
- Contraste: Testez en mode clair ET sombre

## 📱 Stores Requirements

**Google Play Store:**
- Icône: 512×512px (high-res)
- Screenshot: Minimum 2, maximum 8
- Formats: JPG ou PNG 24-bit
- Ratio: 16:9 ou 9:16

**Apple App Store:**
- Icône: 1024×1024px
- Screenshots: Minimum 1 par taille d'appareil
- Formats: JPG, PNG, TIF
- Tailles requises: 6.7", 6.5", 5.5" (iPhone), 12.9", 11" (iPad)

---

**Status:** ✅ Assets sources créés | ⏳ Conversion PNG en attente | ⏳ Génération formats en attente
