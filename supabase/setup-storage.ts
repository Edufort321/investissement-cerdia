/**
 * Script d'initialisation du Storage Supabase
 * Crée automatiquement le bucket 'voyage-photos' avec les bonnes configurations
 *
 * Usage:
 *   npx ts-node supabase/setup-storage.ts
 *
 * Ou depuis package.json:
 *   npm run setup:storage
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const BUCKET_NAME = 'voyage-photos'

// Vérification des variables d'environnement
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes')
  console.error('   Assurez-vous que .env.local contient:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Créer le client Supabase avec la clé service_role (admin)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupStorage() {
  console.log('🚀 Début de la configuration du Storage Supabase...\n')

  try {
    // Étape 1: Vérifier si le bucket existe déjà
    console.log('📦 Étape 1/3: Vérification du bucket...')
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      throw new Error(`Erreur lors de la liste des buckets: ${listError.message}`)
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.name === BUCKET_NAME)

    if (bucketExists) {
      console.log(`✅ Le bucket '${BUCKET_NAME}' existe déjà\n`)
    } else {
      // Étape 2: Créer le bucket
      console.log(`📦 Étape 2/3: Création du bucket '${BUCKET_NAME}'...`)

      const { data: newBucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false, // Bucket privé
        fileSizeLimit: 5242880, // 5 MB max
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf'
        ]
      })

      if (createError) {
        throw new Error(`Erreur lors de la création du bucket: ${createError.message}`)
      }

      console.log(`✅ Bucket '${BUCKET_NAME}' créé avec succès!`)
      console.log(`   - Type: Privé`)
      console.log(`   - Taille max: 5 MB`)
      console.log(`   - Types autorisés: JPEG, PNG, WebP, PDF\n`)
    }

    // Étape 3: Configurer les policies du bucket
    console.log('🔐 Étape 3/3: Configuration des policies de sécurité...')

    // Note: Les policies de bucket ne peuvent pas être créées via l'API standard
    // Elles doivent être créées manuellement dans le Dashboard ou via SQL direct
    console.log('⚠️  Les policies du bucket doivent être configurées manuellement:')
    console.log('')
    console.log('   Allez dans: Storage > voyage-photos > Policies')
    console.log('')
    console.log('   Policy INSERT (upload):')
    console.log('   ─────────────────────────')
    console.log('   bucket_id = \'voyage-photos\' AND auth.uid() IS NOT NULL')
    console.log('')
    console.log('   Policy SELECT (download):')
    console.log('   ─────────────────────────')
    console.log('   bucket_id = \'voyage-photos\' AND (')
    console.log('     storage.foldername(name)[1] = auth.uid()::text')
    console.log('   )')
    console.log('')
    console.log('   Policy DELETE:')
    console.log('   ─────────────────────────')
    console.log('   bucket_id = \'voyage-photos\' AND (')
    console.log('     storage.foldername(name)[1] = auth.uid()::text')
    console.log('   )')
    console.log('')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Configuration du Storage terminée avec succès!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('📝 Prochaines étapes:')
    console.log('   1. Configurer les policies du bucket (voir ci-dessus)')
    console.log('   2. Tester l\'upload de photos dans l\'application')
    console.log('')

  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error)
    process.exit(1)
  }
}

// Exécuter le script
setupStorage()
