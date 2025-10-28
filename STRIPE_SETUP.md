# Configuration Stripe pour Mon Voyage

Ce document explique comment configurer Stripe pour activer les paiements dans l'application Mon Voyage.

## Prérequis

Vous devez avoir un compte Stripe. Si vous n'en avez pas :
1. Créez un compte sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Vérifiez votre email

## Étape 1 : Récupérer les clés API Stripe

### Mode Test (Développement)

1. Connectez-vous à votre [Dashboard Stripe](https://dashboard.stripe.com/)
2. Activez le **mode Test** (toggle en haut à droite)
3. Allez dans **Développeurs > Clés API** : [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
4. Copiez :
   - **Clé publiable** (commence par `pk_test_...`)
   - **Clé secrète** (commence par `sk_test_...`, cliquez sur "Révéler la clé")

### Mode Production (Après tests)

Pour la production, répétez les mêmes étapes mais en **mode Live** (au lieu de Test).

## Étape 2 : Configurer les variables d'environnement

Ouvrez le fichier `.env.local` à la racine du projet et remplacez les valeurs :

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIABLE_ICI
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE_ICI
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK_ICI
```

⚠️ **IMPORTANT** :
- Ne partagez JAMAIS votre clé secrète (`sk_...`)
- Ne commitez JAMAIS le fichier `.env.local` dans Git
- Le fichier `.env.local` est déjà dans `.gitignore`

## Étape 3 : Configurer les Webhooks Stripe

Les webhooks permettent à Stripe de notifier votre application des événements de paiement.

### En développement (avec Stripe CLI)

1. Installez [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Connectez-vous : `stripe login`
3. Écoutez les webhooks localement :
   ```bash
   stripe listen --forward-to localhost:3005/api/stripe/webhook
   ```
4. Copiez le secret webhook affiché (commence par `whsec_...`)
5. Ajoutez-le dans `.env.local` : `STRIPE_WEBHOOK_SECRET=whsec_...`

### En production

1. Allez dans **Développeurs > Webhooks** : [https://dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Cliquez sur **Ajouter un point de terminaison**
3. URL du endpoint : `https://VOTRE_DOMAINE.com/api/stripe/webhook`
4. Sélectionnez les événements à écouter :
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Créez le webhook
6. Copiez le **Secret de signature** (commence par `whsec_...`)
7. Ajoutez-le dans vos variables d'environnement de production

## Étape 4 : Tester les paiements

### Cartes de test Stripe

En mode test, utilisez ces numéros de carte :

- **Succès** : `4242 4242 4242 4242`
- **Décliné** : `4000 0000 0000 0002`
- **3D Secure requis** : `4000 0027 6000 3184`

Pour toutes les cartes :
- **Date d'expiration** : N'importe quelle date future
- **CVC** : N'importe quel code à 3 chiffres
- **Code postal** : N'importe quel code valide

### Flux de test

1. Démarrez l'application : `npm run dev`
2. Allez sur [http://localhost:3005/mon-voyage](http://localhost:3005/mon-voyage)
3. Sélectionnez le mode **5$ CAD** ou **15$ CAD**
4. Cliquez sur **Acheter**
5. Vous serez redirigé vers Stripe Checkout
6. Utilisez une carte de test
7. Après paiement, vous serez redirigé vers l'application avec accès activé

## Étape 5 : Passer en production

Quand vous êtes prêt pour la production :

1. Basculez votre Dashboard Stripe en **mode Live**
2. Obtenez vos clés **Live** (au lieu de **Test**)
3. Configurez les webhooks de production
4. Mettez à jour vos variables d'environnement en production
5. Testez avec de vrais petits montants avant le lancement

## Prix configurés

- **Mode 5$ CAD** : Un voyage, valide 6 mois, toutes fonctionnalités
- **Mode 15$ CAD** : Application complète, accès illimité, à vie

Pour modifier les prix, éditez le fichier :
`app/api/stripe/create-checkout-session/route.ts`

## Support

- [Documentation Stripe](https://stripe.com/docs)
- [Dashboard Stripe](https://dashboard.stripe.com/)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Stripe](https://stripe.com/docs/testing)

## Sécurité

✅ **Bonnes pratiques** :
- Utilisez toujours HTTPS en production
- Ne stockez jamais les numéros de carte
- Validez les webhooks avec le secret
- Utilisez le mode test pour le développement
- Activez 3D Secure pour plus de sécurité

❌ **À éviter** :
- Commiter les clés secrètes dans Git
- Utiliser les clés Live en développement
- Ignorer la validation des webhooks
