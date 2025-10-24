// ⚠️ SÉCURITÉ: Schémas de validation Zod pour inputs API
import { z } from 'zod'

// =====================================================
// 1. INVESTORS
// =====================================================

export const createInvestorSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  firstName: z.string().min(1, 'Prénom requis').max(100, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
})

export const upsertInvestorSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères').optional(),
  firstName: z.string().min(1, 'Prénom requis').max(100, 'Prénom trop long').optional(),
  lastName: z.string().min(1, 'Nom requis').max(100, 'Nom trop long').optional(),
  user_id: z.string().uuid('UUID invalide').optional(),
})

// =====================================================
// 2. TRANSACTIONS
// =====================================================

export const createTransactionSchema = z.object({
  date: z.string().datetime('Date invalide'),
  amount: z.number().finite('Montant invalide'),
  type: z.enum([
    'investissement',
    'depense',
    'dividende',
    'capex',
    'courant',
    'rnd'
  ], { errorMap: () => ({ message: 'Type de transaction invalide' }) }),
  description: z.string().min(1, 'Description requise').max(500, 'Description trop longue'),
  transaction_number: z.string().max(50, 'Numéro trop long').optional(),
  property_id: z.string().uuid('UUID propriété invalide').nullable().optional(),
  investor_id: z.string().uuid('UUID investisseur invalide').nullable().optional(),
  tps: z.number().finite().optional(),
  tvq: z.number().finite().optional(),
})

// =====================================================
// 3. PROPERTIES
// =====================================================

export const createPropertySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200, 'Nom trop long'),
  location: z.string().min(1, 'Localisation requise').max(500, 'Localisation trop longue'),
  purchase_price: z.number().positive('Prix d\'achat doit être positif'),
  purchase_date: z.string().datetime('Date d\'achat invalide'),
  type: z.enum(['residential', 'commercial', 'mixed'], {
    errorMap: () => ({ message: 'Type de propriété invalide' })
  }),
})

// =====================================================
// 4. DOCUMENTS
// =====================================================

export const uploadDocumentSchema = z.object({
  name: z.string().min(1, 'Nom du fichier requis').max(255, 'Nom trop long'),
  type: z.enum(['facture', 'recu', 'contrat', 'rapport', 'autre'], {
    errorMap: () => ({ message: 'Type de document invalide' })
  }),
  description: z.string().max(1000, 'Description trop longue').optional(),
  transaction_id: z.string().uuid('UUID transaction invalide').nullable().optional(),
  property_id: z.string().uuid('UUID propriété invalide').nullable().optional(),
  investor_id: z.string().uuid('UUID investisseur invalide').nullable().optional(),
})

// =====================================================
// 5. SCENARIOS
// =====================================================

export const createScenarioSchema = z.object({
  property_id: z.string().uuid('UUID propriété invalide'),
  nom: z.string().min(1, 'Nom requis').max(200, 'Nom trop long'),
  description: z.string().max(1000, 'Description trop longue').optional(),
  prix_achat: z.number().positive('Prix d\'achat doit être positif'),
  mise_de_fond_percentage: z.number().min(0).max(100, 'Mise de fond entre 0 et 100%'),
  taux_interet: z.number().min(0).max(30, 'Taux d\'intérêt entre 0 et 30%'),
  duree_amortissement: z.number().int().min(1).max(50, 'Durée entre 1 et 50 ans'),
  revenus_mensuels: z.number().nonnegative('Revenus mensuels doit être positif'),
})

// =====================================================
// 6. CORPORATE BOOK
// =====================================================

export const createCorporateBookSchema = z.object({
  entry_type: z.enum([
    'property_acquisition',
    'property_sale',
    'share_issuance',
    'share_transfer',
    'share_redemption',
    'general_meeting',
    'board_meeting',
    'resolution',
    'legal_document',
    'other'
  ], { errorMap: () => ({ message: 'Type d\'entrée invalide' }) }),
  entry_date: z.string().date('Date invalide'),
  title: z.string().min(1, 'Titre requis').max(255, 'Titre trop long'),
  description: z.string().max(5000, 'Description trop longue').optional(),
  property_id: z.string().uuid('UUID propriété invalide').nullable().optional(),
  transaction_id: z.string().uuid('UUID transaction invalide').nullable().optional(),
  investor_id: z.string().uuid('UUID investisseur invalide').nullable().optional(),
  amount: z.number().finite('Montant invalide').optional(),
  currency: z.string().length(3, 'Code devise invalide (ex: CAD)').optional(),
  status: z.enum(['draft', 'approved', 'filed'], {
    errorMap: () => ({ message: 'Statut invalide' })
  }).optional(),
  legal_reference: z.string().max(255, 'Référence légale trop longue').optional(),
  notes: z.string().max(5000, 'Notes trop longues').optional(),
})

// =====================================================
// 7. BANKING / WEBHOOKS
// =====================================================

export const bankingConnectSchema = z.object({
  investor_id: z.string().uuid('UUID investisseur invalide'),
})

export const bankingSyncSchema = z.object({
  login_id: z.string().min(1, 'Login ID requis'),
})

// =====================================================
// 8. HELPERS
// =====================================================

// UUID validation helper
export const uuidSchema = z.string().uuid('UUID invalide')

// Email validation helper
export const emailSchema = z.string().email('Email invalide')

// Password validation helper (fort)
export const strongPasswordSchema = z
  .string()
  .min(12, 'Mot de passe minimum 12 caractères')
  .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Doit contenir au moins un caractère spécial')

// Date validation helper
export const dateSchema = z.string().datetime('Date ISO invalide')

// Montant validation helper
export const amountSchema = z.number().finite('Montant invalide')

// =====================================================
// 9. VALIDATION WRAPPER
// =====================================================

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, errors: result.error }
}

// =====================================================
// 10. ERROR FORMATTER
// =====================================================

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {}

  error.errors.forEach((err) => {
    const path = err.path.join('.')
    formatted[path] = err.message
  })

  return formatted
}
