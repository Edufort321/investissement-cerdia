/**
 * Service de gestion des transactions
 *
 * Fonctionnalités:
 * - CRUD complet des transactions
 * - Gestion des pièces jointes multiples
 * - Calcul automatique des parts pour investissements
 * - Support des remboursements en parts ou en argent
 * - Gestion des devises et taux de change
 */

import { supabase } from '@/lib/supabase'

// ==========================================
// TYPES
// ==========================================

export interface Transaction {
  id?: string
  date: string
  type: string
  amount: number // Positif = entrée, Négatif = sortie
  description: string
  investor_id?: string | null
  property_id?: string | null
  payment_schedule_id?: string | null
  status: 'pending' | 'complete' | 'cancelled'
  notes?: string | null
  category?: string
  payment_method?: string
  reference_number?: string | null
  // Remboursement en parts
  reimbursement_in_shares?: boolean
  shares_returned?: number
  // Devise et taux de change
  source_currency?: 'CAD' | 'USD'
  source_amount?: number | null
  exchange_rate?: number
  bank_fees?: number
  // Champs internationaux
  source_country?: string | null
  foreign_tax_paid?: number
  foreign_tax_rate?: number
  tax_credit_claimable?: number
  fiscal_category?: string | null
  vendor_name?: string | null
  accountant_notes?: string | null
  // Timestamps
  created_at?: string
  updated_at?: string
}

export interface TransactionAttachment {
  id?: string
  transaction_id: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  description?: string | null
  uploaded_at?: string
  uploaded_by?: string | null
}

export interface TransactionWithAttachments extends Transaction {
  attachments?: TransactionAttachment[]
}

// ==========================================
// FONCTIONS CRUD
// ==========================================

/**
 * Créer une nouvelle transaction
 */
export async function createTransaction(transaction: Transaction): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    console.log('📝 Creating transaction:', transaction)

    // Validation
    if (!transaction.date) {
      return { success: false, error: 'Date requise' }
    }

    if (!transaction.type) {
      return { success: false, error: 'Type requis' }
    }

    if (transaction.amount === undefined || transaction.amount === null) {
      return { success: false, error: 'Montant requis' }
    }

    if (!transaction.description) {
      return { success: false, error: 'Description requise' }
    }

    // Insérer la transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating transaction:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Transaction created:', data)

    // Si c'est un investissement avec un investisseur, mettre à jour les parts
    if (transaction.type === 'investissement' && transaction.investor_id && transaction.amount > 0) {
      console.log('💰 Creating investment record for investor')
      await createInvestmentRecord(data.id, transaction.investor_id, transaction.amount, transaction.date)
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('❌ Exception in createTransaction:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupérer une transaction par ID avec ses pièces jointes
 */
export async function getTransactionById(transactionId: string): Promise<{
  success: boolean
  data?: TransactionWithAttachments
  error?: string
}> {
  try {
    // Récupérer la transaction
    const { data: transaction, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()

    if (transError) {
      return { success: false, error: transError.message }
    }

    // Récupérer les pièces jointes
    const { data: attachments, error: attachError } = await supabase
      .from('transaction_attachments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('uploaded_at', { ascending: false })

    if (attachError) {
      console.warn('Warning: Could not fetch attachments:', attachError)
    }

    return {
      success: true,
      data: {
        ...transaction,
        attachments: attachments || []
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Récupérer toutes les transactions avec filtres optionnels
 */
export async function getTransactions(filters?: {
  investor_id?: string
  property_id?: string
  type?: string
  status?: string
  from_date?: string
  to_date?: string
}): Promise<{
  success: boolean
  data?: Transaction[]
  error?: string
}> {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    // Appliquer les filtres
    if (filters?.investor_id) {
      query = query.eq('investor_id', filters.investor_id)
    }

    if (filters?.property_id) {
      query = query.eq('property_id', filters.property_id)
    }

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.from_date) {
      query = query.gte('date', filters.from_date)
    }

    if (filters?.to_date) {
      query = query.lte('date', filters.to_date)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Mettre à jour une transaction
 */
export async function updateTransaction(
  transactionId: string,
  updates: Partial<Transaction>
): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    console.log('📝 Updating transaction:', transactionId, updates)

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating transaction:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Transaction updated:', data)
    return { success: true, data }
  } catch (error: any) {
    console.error('❌ Exception in updateTransaction:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Supprimer une transaction
 */
export async function deleteTransaction(transactionId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    console.log('🗑️ Deleting transaction:', transactionId)

    // Supprimer d'abord les pièces jointes
    const { data: attachments } = await supabase
      .from('transaction_attachments')
      .select('storage_path')
      .eq('transaction_id', transactionId)

    if (attachments && attachments.length > 0) {
      // Supprimer les fichiers du storage
      const paths = attachments.map(a => a.storage_path)
      await supabase.storage
        .from('transaction-documents')
        .remove(paths)

      // Supprimer les entrées DB
      await supabase
        .from('transaction_attachments')
        .delete()
        .eq('transaction_id', transactionId)
    }

    // Supprimer la transaction
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (error) {
      console.error('❌ Error deleting transaction:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Transaction deleted')
    return { success: true }
  } catch (error: any) {
    console.error('❌ Exception in deleteTransaction:', error)
    return { success: false, error: error.message }
  }
}

// ==========================================
// GESTION DES PIÈCES JOINTES
// ==========================================

/**
 * Uploader une pièce jointe pour une transaction
 */
export async function uploadAttachment(
  transactionId: string,
  file: File,
  description?: string
): Promise<{
  success: boolean
  data?: TransactionAttachment
  error?: string
}> {
  try {
    // Générer le chemin de stockage
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${transactionId}/${timestamp}-${cleanFileName}`

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('transaction-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    // Créer l'entrée en base de données
    const { data, error: dbError } = await supabase
      .from('transaction_attachments')
      .insert([{
        transaction_id: transactionId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath,
        description
      }])
      .select()
      .single()

    if (dbError) {
      // Nettoyer le fichier uploadé en cas d'erreur DB
      await supabase.storage
        .from('transaction-documents')
        .remove([storagePath])

      return { success: false, error: dbError.message }
    }

    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Supprimer une pièce jointe
 */
export async function deleteAttachment(attachmentId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Récupérer le chemin de stockage
    const { data: attachment } = await supabase
      .from('transaction_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single()

    if (!attachment) {
      return { success: false, error: 'Pièce jointe introuvable' }
    }

    // Supprimer de la base de données
    const { error: dbError } = await supabase
      .from('transaction_attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) {
      return { success: false, error: dbError.message }
    }

    // Supprimer du storage
    await supabase.storage
      .from('transaction-documents')
      .remove([attachment.storage_path])

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ==========================================
// FONCTIONS HELPER
// ==========================================

/**
 * Créer un enregistrement d'investissement (pour calculer les parts)
 */
async function createInvestmentRecord(
  transactionId: string,
  investorId: string,
  amount: number,
  date: string
): Promise<void> {
  try {
    // Récupérer la valeur nominale actuelle
    const { data: settings } = await supabase
      .from('share_settings')
      .select('nominal_share_value')
      .single()

    if (!settings) {
      console.warn('Share settings not found, skipping investment record')
      return
    }

    const sharesCount = Math.floor(amount / settings.nominal_share_value)

    // Créer l'enregistrement dans investor_investments
    const { error } = await supabase
      .from('investor_investments')
      .insert([{
        investor_id: investorId,
        transaction_id: transactionId,
        investment_date: date,
        amount_invested: amount,
        shares_purchased: sharesCount,
        share_price_at_purchase: settings.nominal_share_value,
        currency: 'CAD',
        status: 'active'
      }])

    if (error) {
      console.error('❌ Error creating investment record:', error)
    } else {
      console.log('✅ Investment record created: ', sharesCount, 'shares')
    }
  } catch (error) {
    console.error('❌ Exception in createInvestmentRecord:', error)
  }
}

/**
 * Calculer le résumé des flux de trésorerie
 */
export async function getCashFlowSummary(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean
  data?: {
    total_inflows: number
    total_outflows: number
    net_balance: number
    by_category: Record<string, number>
  }
  error?: string
}> {
  try {
    let query = supabase
      .from('transactions')
      .select('type, amount')

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: transactions, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    if (!transactions) {
      return {
        success: true,
        data: {
          total_inflows: 0,
          total_outflows: 0,
          net_balance: 0,
          by_category: {}
        }
      }
    }

    // Calculer les totaux
    const summary = transactions.reduce(
      (acc, t) => {
        if (t.amount > 0) {
          acc.total_inflows += t.amount
        } else {
          acc.total_outflows += Math.abs(t.amount)
        }

        // Par catégorie
        if (!acc.by_category[t.type]) {
          acc.by_category[t.type] = 0
        }
        acc.by_category[t.type] += t.amount

        return acc
      },
      {
        total_inflows: 0,
        total_outflows: 0,
        net_balance: 0,
        by_category: {} as Record<string, number>
      }
    )

    summary.net_balance = summary.total_inflows - summary.total_outflows

    return { success: true, data: summary }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Récupérer les transactions avec leurs pièces jointes
 */
export async function getTransactionsWithAttachments(filters?: {
  investor_id?: string
  property_id?: string
  type?: string
}): Promise<{
  success: boolean
  data?: TransactionWithAttachments[]
  error?: string
}> {
  try {
    // Récupérer les transactions
    const transResult = await getTransactions(filters)
    if (!transResult.success || !transResult.data) {
      return transResult
    }

    // Récupérer toutes les pièces jointes
    const { data: attachments } = await supabase
      .from('transaction_attachments')
      .select('*')
      .order('uploaded_at', { ascending: false })

    // Grouper par transaction_id
    const attachmentsByTransaction: Record<string, TransactionAttachment[]> = {}
    if (attachments) {
      attachments.forEach(att => {
        if (!attachmentsByTransaction[att.transaction_id]) {
          attachmentsByTransaction[att.transaction_id] = []
        }
        attachmentsByTransaction[att.transaction_id].push(att)
      })
    }

    // Combiner transactions et attachments
    const transactionsWithAttachments = transResult.data.map(t => ({
      ...t,
      attachments: attachmentsByTransaction[t.id!] || []
    }))

    return { success: true, data: transactionsWithAttachments }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
