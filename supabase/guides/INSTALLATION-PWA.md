# 📱 GUIDE D'INSTALLATION PWA - CERDIA Investment Platform

## 🎯 Qu'est-ce qu'une PWA?

Une **Progressive Web App (PWA)** est une application web qui peut être **installée** sur desktop et mobile comme une application native, avec :

✅ Icône sur l'écran d'accueil
✅ Fonctionnement hors-ligne
✅ Pas de barre d'adresse du navigateur
✅ Notifications push (optionnel)
✅ Expérience utilisateur native

---

## 🚀 INSTALLATION DE L'APPLICATION

### 📱 Sur Mobile (iOS & Android)

#### iPhone / iPad (Safari)

1. **Ouvrir l'application** dans Safari
   - Allez sur `https://[votre-app].vercel.app`

2. **Afficher le bouton d'installation**
   - Un modal s'affiche automatiquement: *"Installer CERDIA sur votre appareil"*
   - OU cliquez sur le bouton **Partager** (icône carré avec flèche vers le haut)

3. **Ajouter à l'écran d'accueil**
   - Faites défiler et sélectionnez **"Sur l'écran d'accueil"**
   - Modifiez le nom si souhaité (par défaut: "CERDIA Investment")
   - Cliquez **"Ajouter"**

4. **Lancer l'application**
   - L'icône CERDIA apparaît sur votre écran d'accueil
   - Cliquez dessus pour ouvrir l'app en plein écran

#### Android (Chrome, Edge, Firefox)

1. **Ouvrir l'application** dans Chrome
   - Allez sur `https://[votre-app].vercel.app`

2. **Installer l'application**
   - **Option 1:** Un modal s'affiche automatiquement avec le bouton **"Installer"**
   - **Option 2:** Cliquez sur le menu **⋮** (3 points) → **"Installer l'application"**
   - **Option 3:** Une bannière apparaît en bas "Ajouter CERDIA à l'écran d'accueil"

3. **Confirmer l'installation**
   - Cliquez **"Installer"**
   - Attendez 2 secondes

4. **Lancer l'application**
   - L'icône CERDIA apparaît sur l'écran d'accueil et dans le tiroir d'applications
   - Ouvrez l'app comme n'importe quelle application native

---

### 💻 Sur Desktop (Windows, macOS, Linux)

#### Chrome / Edge / Opera

1. **Ouvrir l'application**
   - Allez sur `https://[votre-app].vercel.app`

2. **Installer l'application**
   - **Windows/Linux:** Cliquez sur l'icône **➕** dans la barre d'adresse (à droite)
   - **macOS:** Cliquez sur l'icône **⬇️** ou **➕** dans la barre d'adresse
   - OU cliquez sur le modal qui s'affiche automatiquement: **"Installer CERDIA"**

3. **Confirmer l'installation**
   - Une fenêtre popup s'affiche: *"Installer l'application?"*
   - Cliquez **"Installer"**

4. **Lancer l'application**
   - **Windows:** L'app s'ouvre automatiquement et apparaît dans le menu Démarrer
   - **macOS:** L'app s'ouvre et apparaît dans le dossier Applications
   - **Linux:** L'app s'ouvre et apparaît dans le lanceur d'applications

5. **Épingler à la barre des tâches (optionnel)**
   - Faites clic-droit sur l'icône de l'app
   - Sélectionnez **"Épingler à la barre des tâches"** (Windows) ou **"Garder dans le Dock"** (macOS)

#### Safari (macOS uniquement)

⚠️ Safari sur macOS ne supporte pas pleinement les PWA. Utilisez **Chrome** ou **Edge** pour une meilleure expérience.

---

## 🔍 VÉRIFICATION DE L'INSTALLATION

### Signes que la PWA est installée correctement :

✅ **Pas de barre d'adresse** en haut
✅ **Icône de l'app** sur bureau/écran d'accueil
✅ **Fenêtre autonome** (ne fait pas partie du navigateur)
✅ **Fonctionne hors-ligne** (pages visitées mises en cache)

### Vérifier l'installation sur Chrome Desktop :

1. Tapez `chrome://apps` dans la barre d'adresse
2. Vous devriez voir l'icône **CERDIA Investment**
3. Clic-droit → **"Ouvrir"** ou **"Créer un raccourci"**

---

## ⚙️ FONCTIONNALITÉS HORS-LIGNE

La PWA CERDIA met en cache automatiquement :

✅ **Toutes les pages visitées** (Dashboard, Projets, Administration)
✅ **Images et fichiers statiques** (logos, icônes, CSS)
✅ **Données chargées** (investisseurs, propriétés, transactions)

### Comment ça fonctionne ?

1. **Première visite:** L'app télécharge tous les fichiers nécessaires
2. **Visites suivantes:** L'app charge depuis le cache (plus rapide!)
3. **Sans connexion:** L'app affiche les données déjà chargées
4. **Retour en ligne:** Synchronisation automatique avec Supabase

### Tester le mode hors-ligne :

1. Ouvrez l'application installée
2. Visitez plusieurs pages (Dashboard, Projets, etc.)
3. Désactivez le Wi-Fi / données mobiles
4. Rafraîchissez l'app ou naviguez entre les pages
5. ✅ L'app doit continuer de fonctionner!

⚠️ **Limitation:** Les actions nécessitant la base de données (créer un investisseur, transaction) nécessitent une connexion.

---

## 🗑️ DÉSINSTALLER L'APPLICATION

### Mobile

#### iOS
1. Maintenez l'icône CERDIA appuyée
2. Cliquez **"Supprimer l'app"**
3. Confirmez **"Supprimer de l'écran d'accueil"**

#### Android
1. Maintenez l'icône CERDIA appuyée
2. Sélectionnez **"Désinstaller"**
3. Confirmez

### Desktop

#### Windows
1. Paramètres → Applications → Applications installées
2. Cherchez **"CERDIA Investment"**
3. Cliquez **"Désinstaller"**

OU dans Chrome :
1. Allez sur `chrome://apps`
2. Clic-droit sur CERDIA → **"Supprimer de Chrome"**

#### macOS
1. Allez dans le dossier **Applications**
2. Trouvez **CERDIA Investment.app**
3. Glissez vers la **Corbeille**

OU dans Chrome :
1. Allez sur `chrome://apps`
2. Clic-droit sur CERDIA → **"Supprimer de Chrome"**

#### Linux
1. Clic-droit sur l'icône → **"Désinstaller"**

OU dans Chrome :
1. Allez sur `chrome://apps`
2. Clic-droit sur CERDIA → **"Supprimer de Chrome"**

---

## 🛠️ CONFIGURATION TECHNIQUE (Pour Développeurs)

### Fichiers PWA

| Fichier | Chemin | Description |
|---------|--------|-------------|
| Manifest | `public/manifest.json` | Configuration PWA (nom, icônes, couleurs) |
| Service Worker | `public/sw.js` | Cache et stratégies hors-ligne |
| Icônes | `public/icon-*.png` | Icônes 192x192, 512x512 |
| Logo | `public/logo-cerdia3.png` | Logo principal |

### Configuration Manifest (`public/manifest.json`)

```json
{
  "name": "CERDIA Investment Platform",
  "short_name": "CERDIA",
  "description": "Plateforme de gestion d'investissements immobiliers",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#5e5e5e",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Configuration Next.js (`next.config.js`)

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Supabase API - NetworkFirst
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60 // 24 heures
        }
      }
    },
    // Images - CacheFirst
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 jours
        }
      }
    }
  ]
})

module.exports = withPWA({
  // ... reste de la config Next.js
})
```

### Composant Install Prompt (`components/InstallPWAPrompt.tsx`)

Le composant affiche automatiquement un modal pour installer l'app :

**Déclenchement:**
- Desktop: Modal s'affiche au premier chargement
- Mobile: Modal s'affiche après 5 secondes

**Stockage:**
- La préférence "Ne plus afficher" est sauvegardée dans `localStorage`

**Personnalisation:**
```typescript
// Modifier le délai d'affichage (ms)
const PROMPT_DELAY = 5000 // 5 secondes

// Désactiver complètement
// Commentez <InstallPWAPrompt /> dans app/layout.tsx
```

---

## 📊 ANALYTICS PWA

### Métriques à surveiller

1. **Taux d'installation**
   - Nombre de visiteurs vs nombre d'installations
   - Objectif: 10-20% sur mobile, 5-10% sur desktop

2. **Engagement**
   - Nombre de sessions depuis l'app installée
   - Durée moyenne des sessions
   - Taux de rétention

3. **Performance**
   - Temps de chargement initial
   - Temps de chargement avec cache
   - Taux de succès hors-ligne

### Outils

- **Google Analytics:** Ajouter dimension "standalone mode"
- **Vercel Analytics:** Métriques performance automatiques
- **Lighthouse PWA Audit:** Score PWA (objectif: 90+)

```bash
# Tester le score PWA
npx lighthouse https://[votre-app].vercel.app --view
```

---

## ✅ CHECKLIST PWA

### Développement

- [ ] Manifest.json configuré
- [ ] Service Worker actif
- [ ] Icônes 192x192 et 512x512 créées
- [ ] Thème color configuré
- [ ] Start URL définie
- [ ] Display mode: standalone
- [ ] HTTPS activé (obligatoire)

### Test

- [ ] Installation testée sur Chrome Desktop
- [ ] Installation testée sur Chrome Android
- [ ] Installation testée sur Safari iOS
- [ ] Mode hors-ligne testé
- [ ] Cache fonctionne correctement
- [ ] Icônes s'affichent correctement
- [ ] Modal d'installation s'affiche

### Production

- [ ] Service Worker activé en production
- [ ] Lighthouse PWA score > 90
- [ ] Performance score > 80
- [ ] HTTPS avec certificat valide
- [ ] Cache correctement configuré

---

## 🆘 DÉPANNAGE

### L'app ne propose pas l'installation

**Causes possibles:**
- Site non en HTTPS
- Manifest.json invalide
- Service Worker non enregistré
- Navigateur non supporté

**Solutions:**
1. Ouvrir la Console Développeur (F12)
2. Aller dans **Application** → **Manifest**
3. Vérifier les erreurs
4. Aller dans **Application** → **Service Workers**
5. Vérifier que le SW est actif

### L'icône ne s'affiche pas

**Solutions:**
1. Vérifier que `icon-192x192.png` et `icon-512x512.png` existent dans `public/`
2. Vérifier le format PNG (pas JPG)
3. Vérifier les dimensions exactes (192x192, 512x512)
4. Vider le cache et réinstaller

### Mode hors-ligne ne fonctionne pas

**Solutions:**
1. Vérifier Service Worker actif: `chrome://serviceworker-internals`
2. Vérifier cache rempli: DevTools → Application → Cache Storage
3. Tester en mode Navigation Privée (cache vide)
4. Vérifier runtimeCaching dans `next.config.js`

### L'app s'ouvre dans le navigateur

**Solutions:**
1. Vérifier `"display": "standalone"` dans manifest.json
2. Désinstaller et réinstaller l'app
3. Sur iOS: Vérifier ajout via "Sur l'écran d'accueil" (pas marque-page)

---

## 📚 RESSOURCES

- [Documentation PWA Google](https://web.dev/progressive-web-apps/)
- [Next-PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Workbox (Google)](https://developers.google.com/web/tools/workbox)

---

## 🎉 FÉLICITATIONS!

Votre plateforme CERDIA est maintenant installable comme une application native sur tous les appareils! 📱💻

**Avantages pour les utilisateurs:**
- ✅ Accès rapide depuis l'écran d'accueil
- ✅ Pas besoin d'aller sur le navigateur
- ✅ Expérience immersive (plein écran)
- ✅ Fonctionne hors-ligne
- ✅ Mises à jour automatiques

**Prochain guide:** `DEPLOYMENT-GUIDE.md` pour déployer en production

---

**Version:** 1.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Équipe CERDIA
