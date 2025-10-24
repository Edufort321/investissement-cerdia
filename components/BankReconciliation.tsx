'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Link2,
} from 'lucide-react'

interface BankTransaction {
  id: string
  bank_account_id: string
  bank_account_name?: string
  transaction_date: string
  description: string
  amount: number
  balance_after: number
  reference_number?: string
  category?: string
  is_reconciled: boolean
  reconciled_date?: string
  matched_transaction_id?: string
  created_at: string
}

interface Transaction {
  id: string
  scenario_id: string
  scenario_name?: string
  date: string
  type: string
  amount: number
  description?: string
  category?: string
  created_at: string
}

interface PotentialMatch {
  transaction: Transaction
  score: number
  reasons: string[]
}

interface BankAccount {
  id: string
  name: string
  bank_name: string
  current_balance: number
}

export default function BankReconciliation() {

  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null)
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showReconciled, setShowReconciled] = useState(false)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    reconciled: 0,
    unreconciled: 0,
    totalAmount: 0,
    unreconciledAmount: 0,
  })

  useEffect(() => {
    loadBankAccounts()
    loadBankTransactions()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [bankTransactions])

  const loadBankAccounts = async () => {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error loading bank accounts:', error)
      return
    }

    setBankAccounts(data || [])
  }

  const loadBankTransactions = async () => {
    setIsLoading(true)

    let query = supabase
      .from('bank_transactions')
      .select(`
        *,
        bank_accounts!inner(name, bank_name)
      `)
      .order('transaction_date', { ascending: false })

    if (selectedAccount !== 'all') {
      query = query.eq('bank_account_id', selectedAccount)
    }

    if (!showReconciled) {
      query = query.eq('is_reconciled', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading bank transactions:', error)
      setIsLoading(false)
      return
    }

    // Flatten the joined data
    const flattenedData = (data || []).map((tx: any) => ({
      ...tx,
      bank_account_name: tx.bank_accounts?.name || 'Unknown',
    }))

    setBankTransactions(flattenedData)
    setIsLoading(false)
  }

  const calculateStats = () => {
    const total = bankTransactions.length
    const reconciled = bankTransactions.filter(tx => tx.is_reconciled).length
    const unreconciled = total - reconciled
    const totalAmount = bankTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    const unreconciledAmount = bankTransactions
      .filter(tx => !tx.is_reconciled)
      .reduce((sum, tx) => sum + tx.amount, 0)

    setStats({
      total,
      reconciled,
      unreconciled,
      totalAmount,
      unreconciledAmount,
    })
  }

  const findPotentialMatches = async (bankTx: BankTransaction) => {
    setSelectedBankTx(bankTx)
    setIsLoading(true)

    // Search for potential matches in transactions table
    const startDate = new Date(bankTx.transaction_date)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(bankTx.transaction_date)
    endDate.setDate(endDate.getDate() + 7)

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        *,
        scenarios!inner(name)
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error finding matches:', error)
      setIsLoading(false)
      return
    }

    // Score each potential match
    const matches: PotentialMatch[] = []

    for (const tx of transactions || []) {
      const reasons: string[] = []
      let score = 0

      // Amount match (exact or very close)
      const amountDiff = Math.abs(Math.abs(bankTx.amount) - Math.abs(tx.amount))
      if (amountDiff === 0) {
        score += 50
        reasons.push('Montant exact')
      } else if (amountDiff < 1) {
        score += 40
        reasons.push('Montant très proche')
      } else if (amountDiff < 10) {
        score += 20
        reasons.push('Montant similaire')
      }

      // Date proximity
      const dateDiff = Math.abs(
        new Date(bankTx.transaction_date).getTime() - new Date(tx.date).getTime()
      ) / (1000 * 60 * 60 * 24)

      if (dateDiff === 0) {
        score += 30
        reasons.push('Même date')
      } else if (dateDiff <= 2) {
        score += 20
        reasons.push(`${dateDiff} jour(s) d'écart`)
      } else if (dateDiff <= 7) {
        score += 10
        reasons.push(`${dateDiff} jours d'écart`)
      }

      // Description similarity
      const bankDesc = (bankTx.description || '').toLowerCase()
      const txDesc = (tx.description || '').toLowerCase()

      if (bankDesc && txDesc) {
        const words = txDesc.split(' ')
        const matchingWords = words.filter(word =>
          word.length > 3 && bankDesc.includes(word)
        )

        if (matchingWords.length > 0) {
          score += matchingWords.length * 5
          reasons.push(`${matchingWords.length} mot(s) en commun`)
        }
      }

      // Reference number match
      if (bankTx.reference_number && tx.description?.includes(bankTx.reference_number)) {
        score += 40
        reasons.push('Numéro de référence trouvé')
      }

      // Category match
      if (bankTx.category && tx.type && bankTx.category.toLowerCase() === tx.type.toLowerCase()) {
        score += 10
        reasons.push('Catégorie correspondante')
      }

      // Only include matches with a minimum score
      if (score >= 20) {
        matches.push({
          transaction: {
            ...tx,
            scenario_name: (tx as any).scenarios?.name || 'Unknown',
          },
          score,
          reasons,
        })
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    setPotentialMatches(matches)
    setIsMatchDialogOpen(true)
    setIsLoading(false)
  }

  const reconcileTransaction = async (transactionId: string) => {
    if (!selectedBankTx) return

    setIsLoading(true)

    const { error } = await supabase
      .from('bank_transactions')
      .update({
        is_reconciled: true,
        reconciled_date: new Date().toISOString(),
        matched_transaction_id: transactionId,
      })
      .eq('id', selectedBankTx.id)

    if (error) {
      console.error('Error reconciling transaction:', error)
      alert('Erreur lors du rapprochement')
      setIsLoading(false)
      return
    }

    // Reload data
    await loadBankTransactions()
    setIsMatchDialogOpen(false)
    setSelectedBankTx(null)
    setPotentialMatches([])
    setIsLoading(false)
  }

  const markAsReconciled = async (bankTxId: string, withoutMatch: boolean = false) => {
    setIsLoading(true)

    const { error } = await supabase
      .from('bank_transactions')
      .update({
        is_reconciled: true,
        reconciled_date: new Date().toISOString(),
        matched_transaction_id: withoutMatch ? null : undefined,
      })
      .eq('id', bankTxId)

    if (error) {
      console.error('Error marking as reconciled:', error)
      alert('Erreur lors de la mise à jour')
      setIsLoading(false)
      return
    }

    await loadBankTransactions()
    setIsLoading(false)
  }

  const unreconcileTransaction = async (bankTxId: string) => {
    setIsLoading(true)

    const { error } = await supabase
      .from('bank_transactions')
      .update({
        is_reconciled: false,
        reconciled_date: null,
        matched_transaction_id: null,
      })
      .eq('id', bankTxId)

    if (error) {
      console.error('Error unreconciling:', error)
      alert('Erreur lors de l\'annulation')
      setIsLoading(false)
      return
    }

    await loadBankTransactions()
    setIsLoading(false)
  }

  const filteredTransactions = bankTransactions.filter(tx => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    return (
      tx.description?.toLowerCase().includes(search) ||
      tx.reference_number?.toLowerCase().includes(search) ||
      tx.bank_account_name?.toLowerCase().includes(search) ||
      tx.amount.toString().includes(search)
    )
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Rapprochement Bancaire</h1>
        <p className="text-muted-foreground mt-2">
          Réconciliez vos transactions bancaires avec vos écritures comptables
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Réconciliées</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {stats.reconciled}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Non réconciliées</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {stats.unreconciled}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Montant Total</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(stats.totalAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Montant Non Réconc.</CardDescription>
            <CardTitle className="text-xl text-orange-600">
              {formatCurrency(stats.unreconciledAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-4 flex-1">
              <div className="flex-1 max-w-xs">
                <Label>Compte Bancaire</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les comptes</SelectItem>
                    {bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.bank_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 max-w-xs">
                <Label>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Description, référence, montant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  variant={showReconciled ? 'default' : 'outline'}
                  onClick={() => setShowReconciled(!showReconciled)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showReconciled ? 'Toutes' : 'Non réconciliées'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <Button variant="outline" onClick={loadBankTransactions}>
                <Download className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {stats.unreconciled > 0 && !showReconciled && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Vous avez {stats.unreconciled} transaction(s) non réconciliée(s) pour un montant de {formatCurrency(stats.unreconciledAmount)}
              </AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Compte</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Solde Après</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucune transaction trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{tx.bank_account_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={tx.description}>
                        {tx.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.reference_number || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(tx.balance_after)}
                    </TableCell>
                    <TableCell>
                      {tx.is_reconciled ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Réconciliée
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!tx.is_reconciled ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => findPotentialMatches(tx)}
                              disabled={isLoading}
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Associer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsReconciled(tx.id, true)}
                              disabled={isLoading}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valider
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unreconcileTransaction(tx.id)}
                            disabled={isLoading}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Annuler
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Match Dialog */}
      <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trouver une correspondance</DialogTitle>
            <DialogDescription>
              {selectedBankTx && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(selectedBankTx.transaction_date)}
                    </div>
                    <div>
                      <span className="font-medium">Montant:</span> {formatCurrency(selectedBankTx.amount)}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Description:</span> {selectedBankTx.description}
                    </div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {potentialMatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-orange-500" />
                <p>Aucune correspondance automatique trouvée</p>
                <p className="text-sm mt-1">Vous pouvez marquer cette transaction comme réconciliée manuellement</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">{potentialMatches.length} correspondance(s) potentielle(s) trouvée(s):</p>
                {potentialMatches.map((match, index) => (
                  <Card key={match.transaction.id} className="hover:border-primary cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={match.score >= 70 ? 'default' : match.score >= 50 ? 'secondary' : 'outline'}>
                              Score: {match.score}%
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {match.transaction.scenario_name}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                            <div>
                              <span className="text-muted-foreground">Date:</span>{' '}
                              {formatDate(match.transaction.date)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>{' '}
                              {match.transaction.type}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Montant:</span>{' '}
                              <span className={match.transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(match.transaction.amount)}
                              </span>
                            </div>
                          </div>

                          {match.transaction.description && (
                            <div className="text-sm mb-2">
                              <span className="text-muted-foreground">Description:</span>{' '}
                              {match.transaction.description}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
                            {match.reasons.map((reason, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          onClick={() => reconcileTransaction(match.transaction.id)}
                          disabled={isLoading}
                          className="ml-4"
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Associer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMatchDialogOpen(false)}>
              Annuler
            </Button>
            {selectedBankTx && (
              <Button
                variant="secondary"
                onClick={() => {
                  markAsReconciled(selectedBankTx.id, true)
                  setIsMatchDialogOpen(false)
                }}
                disabled={isLoading}
              >
                Marquer comme réconciliée sans association
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
