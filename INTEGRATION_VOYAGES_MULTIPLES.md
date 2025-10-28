# Guide d'intégration - Voyages Multiples

## 📋 Ce qui a été créé

### 1. **Schéma de base de données** (`SUPABASE_SCHEMA.sql`)
Schéma SQL complet incluant :
- ✅ Table `voyages` (informations principales)
- ✅ Table `evenements` (timeline: vols, hébergements, activités)
- ✅ Table `depenses` (suivi des dépenses)
- ✅ Table `checklist` (tâches à faire)
- ✅ Table `photos` (métadonnées des uploads)
- ✅ Table `partage` (fonctionnalité "Me Suivre")
- ✅ Row Level Security (RLS) configuré
- ✅ Indexes pour performance
- ✅ Bucket Storage pour photos

### 2. **Service Supabase** (`lib/voyage-service.ts`)
Helper TypeScript pour toutes les opérations CRUD :
- ✅ `voyageService`: CRUD complet + count pour limitations
- ✅ `evenementService`: Gestion des événements
- ✅ `depenseService`: Gestion des dépenses
- ✅ `checklistService`: Gestion de la checklist (avec toggle)

### 3. **Composant Liste** (`components/VoyageList.tsx`)
Interface pour afficher et gérer les voyages :
- ✅ Liste des voyages avec design cartes
- ✅ Bouton "Nouveau Voyage" (avec limitation mode single)
- ✅ Actions: Ouvrir, Supprimer
- ✅ Affichage d'expiration pour mode 5$ (6 mois)
- ✅ Message de limite atteinte (mode single)
- ✅ État vide avec CTA

---

## 🚀 Étapes d'installation

### Étape 1: Configurer Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle query
5. Copiez-collez le contenu de `SUPABASE_SCHEMA.sql`
6. Cliquez sur **RUN** ▶️

7. Créez le bucket Storage :
   - **Storage** > **New bucket**
   - Nom: `voyage-photos`
   - Public: ❌ (décoché)
   - Allowed MIME types: `image/jpeg,image/png,image/webp,application/pdf`
   - File size limit: `5242880` (5MB)

8. Configurez les policies du bucket :
   - Storage > `voyage-photos` > **Policies**
   - Ajoutez policies pour INSERT, SELECT, DELETE basées sur `auth.uid()`

### Étape 2: Tester le service

Créez un fichier de test temporaire pour vérifier que tout fonctionne :

```typescript
// test-voyage-service.ts
import { voyageService } from '@/lib/voyage-service'

async function testVoyage() {
  const userId = 'votre-user-id-supabase' // Remplacez par un vrai ID

  // Test création
  const nouveauVoyage = await voyageService.create({
    user_id: userId,
    titre: 'Test Paris',
    date_debut: '2025-06-01',
    date_fin: '2025-06-07',
    budget: 2000,
    devise: 'CAD',
    mode_achat: 'investor'
  })

  console.log('Voyage créé:', nouveauVoyage)

  // Test récupération
  const voyages = await voyageService.getAll(userId)
  console.log('Tous les voyages:', voyages)
}

testVoyage()
```

---

## 🔧 Intégration dans MonVoyageV2.tsx

### Changements déjà appliqués

✅ Imports ajoutés :
```typescript
import VoyageList from './VoyageList'
import { voyageService, evenementService, depenseService, checklistService } from '@/lib/voyage-service'
import { FolderOpen, FileText } from 'lucide-react'
```

✅ États ajoutés :
```typescript
const [showVoyageChoice, setShowVoyageChoice] = useState(false) // Nouveau/Consulter
const [showVoyageList, setShowVoyageList] = useState(false) // Liste des voyages
const [voyageActifId, setVoyageActifId] = useState<string | null>(null) // ID dans la DB
```

### Changements à faire manuellement

#### 1. Modifier le flux après sélection du mode

**Trouver la fonction `handleModeSelection` (ligne ~252)**

Remplacer par :
```typescript
const handleModeSelection = (mode: UserMode) => {
  if (mode === 'investor') {
    router.push('/connexion?redirect=/mon-voyage')
  } else if (mode === 'free') {
    // Mode gratuit - Pas de sauvegarde cloud
    const session: UserSession = { mode: 'free' }
    localStorage.setItem('monVoyageSession', JSON.stringify(session))
    setUserSession(session)
    setShowModeSelection(false)
    createDemoVoyage() // Voyage local uniquement
  } else if (mode === 'single' || mode === 'full') {
    handleStripePayment(mode)
  }
}
```

#### 2. Modifier l'effect Stripe success (ligne ~117)

Remplacer la section qui crée la session après paiement :
```typescript
if (sessionId && mode) {
  const expiresAt = mode === 'single'
    ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString()
    : undefined

  const session: UserSession = { mode, expiresAt }
  localStorage.setItem('monVoyageSession', JSON.stringify(session))
  setUserSession(session)
  setShowModeSelection(false)
  setShowVoyageChoice(true) // ← AJOUTER CETTE LIGNE (au lieu de createDemoVoyage())

  router.replace('/mon-voyage')
}
```

#### 3. Modifier l'effect investisseur (ligne ~151)

Remplacer :
```typescript
if (user && isInvestor) {
  const investorSession: UserSession = {
    mode: 'investor',
    userId: user.id
  }
  setUserSession(investorSession)
  setShowModeSelection(false)
  setShowVoyageChoice(true) // ← AJOUTER (au lieu de loadVoyage)
  return
}
```

#### 4. Ajouter les fonctions de gestion des voyages

**Avant `handleModeSelection`, ajouter :**

```typescript
// Fonction pour créer un nouveau voyage dans Supabase
const handleCreateNewVoyage = async (titre: string) => {
  if (!user || !userSession) return

  try {
    const nouveauVoyage = await voyageService.create({
      user_id: user.id,
      titre,
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      budget: 0,
      devise: 'CAD',
      mode_achat: userSession.mode as 'investor' | 'single' | 'full',
      expire_at: userSession.expiresAt
    })

    if (nouveauVoyage) {
      await loadVoyageFromDB(nouveauVoyage.id)
    }
  } catch (error) {
    console.error('Erreur création voyage:', error)
    alert(language === 'fr' ? 'Erreur de création' : 'Creation error')
  }
}

// Fonction pour charger un voyage depuis Supabase
const loadVoyageFromDB = async (voyageId: string) => {
  try {
    const voyageDB = await voyageService.getById(voyageId)
    if (!voyageDB) {
      alert(language === 'fr' ? 'Voyage introuvable' : 'Trip not found')
      return
    }

    // Charger tous les éléments liés
    const [evenements, depenses, checklist] = await Promise.all([
      evenementService.getByVoyage(voyageId),
      depenseService.getByVoyage(voyageId),
      checklistService.getByVoyage(voyageId)
    ])

    // Convertir au format Voyage
    const voyage: Voyage = {
      id: voyageDB.id,
      titre: voyageDB.titre,
      dateDebut: voyageDB.date_debut,
      dateFin: voyageDB.date_fin,
      budget: voyageDB.budget,
      devise: voyageDB.devise,
      evenements: evenements.map(e => ({
        id: e.id,
        type: e.type,
        titre: e.titre,
        date: e.date,
        heureDebut: e.heure_debut || '',
        heureFin: e.heure_fin || '',
        lieu: e.lieu || '',
        prix: e.prix,
        devise: e.devise,
        notes: e.notes,
        transport: e.transport
      })),
      depenses: depenses.map(d => ({
        id: d.id,
        date: d.date,
        categorie: d.categorie,
        description: d.description || '',
        montant: d.montant,
        devise: d.devise
      })),
      checklist: checklist.map(c => ({
        id: c.id,
        texte: c.texte,
        complete: c.complete
      })),
      partage: {
        actif: false,
        lien: `https://cerdia.com/voyage/${voyageId}`,
        enDirect: false
      }
    }

    setVoyageActif(voyage)
    setVoyageActifId(voyageId)
    setShowVoyageList(false)
    setShowVoyageChoice(false)
  } catch (error) {
    console.error('Erreur chargement voyage:', error)
    alert(language === 'fr' ? 'Erreur de chargement' : 'Loading error')
  }
}
```

#### 5. Ajouter l'écran de choix Nouveau/Consulter

**Avant le `if (showModeSelection || !userSession)` (ligne ~335), ajouter :**

```typescript
// Écran de choix: Nouveau voyage ou Consulter existants
if (showVoyageChoice && userSession && user) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'fr' ? 'Que voulez-vous faire ?' : 'What would you like to do?'}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Nouveau Voyage */}
          <button
            onClick={() => {
              const titre = prompt(
                language === 'fr'
                  ? 'Titre du nouveau voyage :'
                  : 'New trip title:'
              )
              if (titre) {
                handleCreateNewVoyage(titre)
              }
            }}
            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all border-2 border-transparent hover:border-indigo-500"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
              <Plus className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {language === 'fr' ? 'Nouveau Voyage' : 'New Trip'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'fr'
                ? 'Créez un nouveau voyage depuis zéro'
                : 'Create a new trip from scratch'}
            </p>
          </button>

          {/* Consulter Voyages */}
          <button
            onClick={() => {
              setShowVoyageChoice(false)
              setShowVoyageList(true)
            }}
            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all border-2 border-transparent hover:border-green-500"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
              <FolderOpen className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {language === 'fr' ? 'Mes Voyages' : 'My Trips'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'fr'
                ? 'Consultez et modifiez vos voyages enregistrés'
                : 'View and edit your saved trips'}
            </p>
          </button>
        </div>
      </div>
    </div>
  )
}

// Afficher la liste des voyages
if (showVoyageList && userSession && user) {
  return (
    <VoyageList
      userId={user.id}
      userMode={userSession.mode as 'investor' | 'single' | 'full'}
      onSelectVoyage={(voyageId) => loadVoyageFromDB(voyageId)}
      onCreateNew={() => {
        const titre = prompt(
          language === 'fr' ? 'Titre du nouveau voyage :' : 'New trip title:'
        )
        if (titre) {
          handleCreateNewVoyage(titre)
        }
      }}
      onBack={() => {
        setShowVoyageList(false)
        setShowVoyageChoice(true)
      }}
    />
  )
}
```

---

## ✅ Résumé des fonctionnalités

### Mode Gratuit
- ❌ **Pas de sauvegarde cloud** (localStorage uniquement)
- ✅ Impression autorisée
- ⚠️ Données perdues à la fermeture

### Mode Investisseur
- ✅ **Voyages illimités** dans Supabase
- ✅ Toutes fonctionnalités
- ✅ Accès à vie

### Mode 5$ CAD (Un Voyage)
- ✅ **1 voyage maximum** (vérification via `voyageService.count()`)
- ✅ Toutes fonctionnalités
- ⏰ **Expire après 6 mois**

### Mode 15$ CAD (Complet)
- ✅ **Voyages illimités** dans Supabase
- ✅ Toutes fonctionnalités
- ✅ Accès à vie

---

## 📝 Points d'attention

1. **Mode Single (5$)** :
   - Vérifier le count avant de permettre création : `await voyageService.count(userId) === 0`
   - Afficher message d'erreur si limite atteinte
   - Permettre suppression pour en créer un nouveau

2. **Synchronisation** :
   - Chaque modification doit sauvegarder dans Supabase (sauf mode gratuit)
   - Utiliser les services `evenementService`, `depenseService`, `checklistService`

3. **Expiration (mode 5$)** :
   - Vérifier `voyage.expire_at` à l'ouverture
   - Bloquer l'édition si expiré
   - Permettre impression même si expiré

4. **Photos (à venir)** :
   - Upload vers Supabase Storage bucket `voyage-photos`
   - Stocker métadonnées dans table `photos`
   - Lier aux événements ou dépenses via FK

---

## 🐛 Dé bogage

Si vous rencontrez des erreurs :

1. **RLS non configuré** :
   ```
   Error: new row violates row-level security policy
   ```
   → Vérifiez que les policies RLS sont créées dans Supabase

2. **User ID null** :
   ```
   user_id cannot be null
   ```
   → Assurez-vous que `user` est bien chargé via `useAuth()`

3. **Voyage non trouvé** :
   ```
   Voyage introuvable
   ```
   → Vérifiez que le voyage appartient bien à l'utilisateur (RLS)

---

## 🚀 Prochaines étapes

1. ✅ Installer le schéma Supabase
2. ⏳ Intégrer les changements dans MonVoyageV2.tsx
3. ⏳ Tester création/suppression/chargement de voyages
4. ⏳ Implémenter upload de photos (Supabase Storage)
5. ⏳ Ajouter fonctionnalité "Me Suivre" (partage live)
6. ⏳ Tests complets sur tous les modes

**Besoin d'aide ?** Consultez la documentation :
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
