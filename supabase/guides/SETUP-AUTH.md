# 🔐 CONFIGURATION SUPABASE AUTH

## Étapes pour créer les utilisateurs

### Option 1: Via le Dashboard Supabase (Recommandé)

1. Va dans **Authentication** > **Users** dans Supabase
2. Clique **Add user** > **Create new user**
3. Crée les 4 utilisateurs suivants:

#### Utilisateur 1: Éric Dufort (Admin)
- Email: `eric.dufort@cerdia.com`
- Password: `321Eduf!$`
- Auto Confirm: ✅ Oui
- Copie l'UUID généré

#### Utilisateur 2: Chad Rodrigue
- Email: `chad.rodrigue@cerdia.com`
- Password: (définis un mot de passe temporaire)
- Auto Confirm: ✅ Oui
- Copie l'UUID généré

#### Utilisateur 3: Alexandre Toulouse
- Email: `alexandre.toulouse@cerdia.com`
- Password: (définis un mot de passe temporaire)
- Auto Confirm: ✅ Oui
- Copie l'UUID généré

#### Utilisateur 4: Pierre Dufort
- Email: `pierre.dufort@cerdia.com`
- Password: (définis un mot de passe temporaire)
- Auto Confirm: ✅ Oui
- Copie l'UUID généré

---

### Option 2: Via SQL (Plus rapide)

1. Va dans **SQL Editor** > **New Query**
2. Copie et colle ce script:

```sql
-- Créer les 4 utilisateurs Auth
-- Note: Remplace 'TEMP_PASSWORD_HASH' par les vrais hashes

-- 1. Éric Dufort
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- Sauvegarde cet UUID!
  'authenticated',
  'authenticated',
  'eric.dufort@cerdia.com',
  crypt('321Eduf!$', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  ''
);

-- Répète pour les 3 autres utilisateurs...
```

---

## Lier les utilisateurs Auth aux investisseurs

Une fois les utilisateurs Auth créés, tu dois mettre à jour la table `investors` avec les UUID:

```sql
-- Obtenir les UUIDs des utilisateurs
SELECT id, email FROM auth.users ORDER BY email;

-- Mettre à jour les investisseurs avec les bons user_id
UPDATE investors
SET user_id = 'UUID_ERIC'
WHERE email = 'eric.dufort@cerdia.com';

UPDATE investors
SET user_id = 'UUID_CHAD'
WHERE email = 'chad.rodrigue@cerdia.com';

UPDATE investors
SET user_id = 'UUID_ALEXANDRE'
WHERE email = 'alexandre.toulouse@cerdia.com';

UPDATE investors
SET user_id = 'UUID_PIERRE'
WHERE email = 'pierre.dufort@cerdia.com';
```

---

## Vérification

```sql
-- Vérifier que tous les investisseurs ont un user_id
SELECT first_name, last_name, email, user_id
FROM investors;

-- Vérifier que les UUIDs correspondent à auth.users
SELECT i.first_name, i.last_name, i.email, u.email as auth_email
FROM investors i
LEFT JOIN auth.users u ON i.user_id = u.id;
```

---

## Test de connexion

1. Va sur `/connexion` dans l'application
2. Tape "Eric" dans le champ Email
3. Sélectionne "Éric Dufort" dans l'autocomplétion
4. Entre le mot de passe: `321Eduf!$`
5. Clique "Se connecter"

✅ **Résultat attendu**: Redirection vers `/dashboard` avec les données de l'investisseur chargées.

---

## En cas d'erreur

**Erreur: "Email ou mot de passe incorrect"**
- Vérifie que l'email est exact dans auth.users
- Vérifie que le mot de passe est correct
- Assure-toi que `email_confirmed_at` n'est pas NULL

**Erreur: "Error loading investor data"**
- Vérifie que le `user_id` dans investors correspond à l'`id` dans auth.users
- Vérifie les politiques RLS sur la table investors

**Utilisateur connecté mais pas de données**
- Vérifie que le `user_id` est correctement lié
- Vérifie que l'investisseur a `status = 'actif'`
