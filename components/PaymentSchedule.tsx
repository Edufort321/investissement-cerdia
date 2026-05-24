'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
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
import { Textarea } from '@/components/ui/textarea'
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
  Calendar,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingDown,
  Filter,
} from 'lucide-react'

interface PaymentObligation {
  id: string
  scenario_id?: string
  scenario_name?: string
  obligation_type: string
  vendor_name: string
  description?: string
  due_date: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  priority: 1 | 2 | 3 | 4 | 5
  paid_transaction_id?: string
  created_at: string
}

interface Scenario {
  id: string
  name: string
}

interface FormData {
  scenario_id: string
  obligation_type: string
  vendor_name: string
  description: string
  due_date: string
  amount: string
  priority: string
}

interface TreasuryPosition {
  current_balance: number
  net_available_cash: number
}

export default function PaymentSchedule() {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  const [payments, setPayments] = useState<PaymentObligation[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [treasuryPosition, setTreasuryPosition] = useState<TreasuryPosition | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<string>('30') // days
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentObligation | null>(null)
  const [formData, setFormData] = useState<FormData>({
    scenario_id: '',
    obligation_type: 'contractor_payment',
    vendor_name: '',
    description: '',
    due_date: '',
    amount: '',
    priority: '3',
  })

  const obligationTypes = fr ? [
    { value: 'contractor_payment', label: 'Paiement Entrepreneur' },
    { value: 'supplier_payment', label: 'Paiement Fournisseur' },
    { value: 'loan_payment', label: 'Remboursement Prêt' },
    { value: 'tax_payment', label: 'Paiement Taxes' },
    { value: 'insurance', label: 'Assurance' },
    { value: 'utilities', label: 'Services Publics' },
    { value: 'other', label: 'Autre' },
  ] : [
    { value: 'contractor_payment', label: 'Contractor Payment' },
    { value: 'supplier_payment', label: 'Supplier Payment' },
    { value: 'loan_payment', label: 'Loan Repayment' },
    { value: 'tax_payment', label: 'Tax Payment' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    loadScenarios()
    loadTreasuryPosition()
    loadPayments()
  }, [])

  useEffect(() => {
    loadPayments()
  }, [selectedStatus, selectedPriority, timeRange])

  const loadScenarios = async () => {
    const { data, error } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('status', 'purchased')
      .order('name')

    if (error) {
      console.error('Error loading scenarios:', error)
      return
    }

    setScenarios(data || [])
  }

  const loadTreasuryPosition = async () => {
    const { data, error } = await supabase
      .from('treasury_position')
      .select('current_balance, net_available_cash')
      .limit(1)
      .single()

    if (error) {
      console.error('Error loading treasury position:', error)
      return
    }

    setTreasuryPosition(data)
  }

  const loadPayments = async () => {
    setIsLoading(true)

    let query = supabase
      .from('payment_obligations')
      .select(`
        *,
        scenarios(name)
      `)
      .order('due_date', { ascending: true })

    // Filter by status
    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus)
    } else {
      // By default, don't show cancelled
      query = query.neq('status', 'cancelled')
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      query = query.eq('priority', parseInt(selectedPriority))
    }

    // Filter by time range
    if (timeRange !== 'all') {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + parseInt(timeRange))

      query = query.gte('due_date', today.toISOString().split('T')[0])
      query = query.lte('due_date', futureDate.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading payments:', error)
      setIsLoading(false)
      return
    }

    // Flatten the joined data and check for overdue
    const flattenedData = (data || []).map((payment: any) => {
      const p = {
        ...payment,
        scenario_name: payment.scenarios?.name || 'N/A',
      }

      // Auto-mark as overdue if past due date and still pending
      if (p.status === 'pending' && new Date(p.due_date) < new Date()) {
        p.status = 'overdue'
      }

      return p
    })

    setPayments(flattenedData)
    setIsLoading(false)
  }

  const openDialog = (payment?: PaymentObligation) => {
    if (payment) {
      setEditingPayment(payment)
      setFormData({
        scenario_id: payment.scenario_id || '',
        obligation_type: payment.obligation_type,
        vendor_name: payment.vendor_name,
        description: payment.description || '',
        due_date: payment.due_date,
        amount: payment.amount.toString(),
        priority: payment.priority.toString(),
      })
    } else {
      setEditingPayment(null)
      setFormData({
        scenario_id: '',
        obligation_type: 'contractor_payment',
        vendor_name: '',
        description: '',
        due_date: '',
        amount: '',
        priority: '3',
      })
    }
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingPayment(null)
  }

  const savePayment = async () => {
    if (!formData.vendor_name || !formData.due_date || !formData.amount) {
      alert(fr ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill in all required fields')
      return
    }

    setIsLoading(true)

    const paymentData = {
      scenario_id: formData.scenario_id || null,
      obligation_type: formData.obligation_type,
      vendor_name: formData.vendor_name,
      description: formData.description,
      due_date: formData.due_date,
      amount: parseFloat(formData.amount),
      priority: parseInt(formData.priority),
      status: 'pending',
    }

    let error

    if (editingPayment) {
      // Update existing
      const result = await supabase
        .from('payment_obligations')
        .update(paymentData)
        .eq('id', editingPayment.id)

      error = result.error
    } else {
      // Create new
      const result = await supabase
        .from('payment_obligations')
        .insert(paymentData)

      error = result.error
    }

    if (error) {
      console.error('Error saving payment:', error)
      alert(fr ? 'Erreur lors de la sauvegarde' : 'Error saving')
      setIsLoading(false)
      return
    }

    await loadPayments()
    closeDialog()
    setIsLoading(false)
  }

  const deletePayment = async (id: string) => {
    if (!confirm(fr ? 'Êtes-vous sûr de vouloir supprimer cette obligation?' : 'Are you sure you want to delete this obligation?')) {
      return
    }

    setIsLoading(true)

    const { error } = await supabase
      .from('payment_obligations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting payment:', error)
      alert(fr ? 'Erreur lors de la suppression' : 'Error deleting')
      setIsLoading(false)
      return
    }

    await loadPayments()
    setIsLoading(false)
  }

  const markAsPaid = async (id: string) => {
    setIsLoading(true)

    const { error } = await supabase
      .from('payment_obligations')
      .update({ status: 'paid' })
      .eq('id', id)

    if (error) {
      console.error('Error marking as paid:', error)
      alert(fr ? 'Erreur lors de la mise à jour' : 'Error updating')
      setIsLoading(false)
      return
    }

    await loadPayments()
    setIsLoading(false)
  }

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getUrgencyBadge = (payment: PaymentObligation) => {
    if (payment.status === 'paid') {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {fr ? 'Payé' : 'Paid'}
        </Badge>
      )
    }

    if (payment.status === 'cancelled') {
      return (
        <Badge variant="secondary">
          {fr ? 'Annulé' : 'Cancelled'}
        </Badge>
      )
    }

    const daysUntil = getDaysUntilDue(payment.due_date)

    if (daysUntil < 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {fr ? `En retard (${Math.abs(daysUntil)}j)` : `Late (${Math.abs(daysUntil)}d)`}
        </Badge>
      )
    }

    if (daysUntil === 0) {
      return (
        <Badge variant="destructive">
          <Clock className="h-3 w-3 mr-1" />
          {fr ? "Aujourd'hui" : 'Today'}
        </Badge>
      )
    }

    if (daysUntil <= 3) {
      return (
        <Badge variant="destructive" className="bg-orange-600">
          <Clock className="h-3 w-3 mr-1" />
          {daysUntil}j
        </Badge>
      )
    }

    if (daysUntil <= 7) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          {daysUntil}j
        </Badge>
      )
    }

    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        {daysUntil}j
      </Badge>
    )
  }

  const getPriorityLabel = (priority: number) => {
    const labels = fr
      ? ['', 'Critique', 'Élevée', 'Moyenne', 'Basse', 'Très Basse']
      : ['', 'Critical', 'High', 'Medium', 'Low', 'Very Low']
    return labels[priority] || 'N/A'
  }

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) {
      return <Badge variant="destructive">{fr ? 'Critique' : 'Critical'}</Badge>
    }
    if (priority === 2) {
      return <Badge variant="destructive" className="bg-orange-600">{fr ? 'Élevée' : 'High'}</Badge>
    }
    if (priority === 3) {
      return <Badge variant="secondary">{fr ? 'Moyenne' : 'Medium'}</Badge>
    }
    return <Badge variant="outline">{fr ? 'Basse' : 'Low'}</Badge>
  }

  const calculateTotals = () => {
    const filtered = payments.filter(p => p.status !== 'paid' && p.status !== 'cancelled')
    const total = filtered.reduce((sum, p) => sum + p.amount, 0)
    const overdue = filtered.filter(p => getDaysUntilDue(p.due_date) < 0)
    const overdueAmount = overdue.reduce((sum, p) => sum + p.amount, 0)
    const urgent = filtered.filter(p => getDaysUntilDue(p.due_date) <= 7 && getDaysUntilDue(p.due_date) >= 0)
    const urgentAmount = urgent.reduce((sum, p) => sum + p.amount, 0)

    return { total, overdueAmount, urgentAmount, overdueCount: overdue.length, urgentCount: urgent.length }
  }

  const totals = calculateTotals()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CAD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{fr ? 'Calendrier de Paiements' : 'Payment Schedule'}</h1>
        <p className="text-muted-foreground mt-2">
          {fr ? 'Gérez vos obligations de paiement et planifiez votre trésorerie' : 'Manage your payment obligations and plan your cash flow'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{fr ? 'Total à Payer' : 'Total Due'}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.total)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{fr ? 'En Retard' : 'Overdue'} ({totals.overdueCount})</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatCurrency(totals.overdueAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{fr ? '7 Prochains Jours' : 'Next 7 Days'} ({totals.urgentCount})</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {formatCurrency(totals.urgentAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{fr ? 'Trésorerie Disponible' : 'Available Cash'}</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {treasuryPosition ? formatCurrency(treasuryPosition.net_available_cash) : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Cash Warning */}
      {treasuryPosition && totals.urgentAmount > treasuryPosition.net_available_cash && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {fr
              ? <><strong>Attention :</strong> Les paiements urgents ({formatCurrency(totals.urgentAmount)}) dépassent votre trésorerie disponible ({formatCurrency(treasuryPosition.net_available_cash)}). <br />Déficit : {formatCurrency(totals.urgentAmount - treasuryPosition.net_available_cash)}</>
              : <><strong>Warning:</strong> Urgent payments ({formatCurrency(totals.urgentAmount)}) exceed your available cash ({formatCurrency(treasuryPosition.net_available_cash)}). <br />Shortfall: {formatCurrency(totals.urgentAmount - treasuryPosition.net_available_cash)}</>}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-4 flex-wrap">
              <div>
                <Label>{fr ? 'Période' : 'Period'}</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{fr ? '7 prochains jours' : 'Next 7 days'}</SelectItem>
                    <SelectItem value="30">{fr ? '30 prochains jours' : 'Next 30 days'}</SelectItem>
                    <SelectItem value="60">{fr ? '60 prochains jours' : 'Next 60 days'}</SelectItem>
                    <SelectItem value="90">{fr ? '90 prochains jours' : 'Next 90 days'}</SelectItem>
                    <SelectItem value="all">{fr ? 'Toutes les dates' : 'All dates'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{fr ? 'Statut' : 'Status'}</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{fr ? 'Tous (sauf annulés)' : 'All (except cancelled)'}</SelectItem>
                    <SelectItem value="pending">{fr ? 'En attente' : 'Pending'}</SelectItem>
                    <SelectItem value="overdue">{fr ? 'En retard' : 'Overdue'}</SelectItem>
                    <SelectItem value="paid">{fr ? 'Payé' : 'Paid'}</SelectItem>
                    <SelectItem value="cancelled">{fr ? 'Annulé' : 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{fr ? 'Priorité' : 'Priority'}</Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{fr ? 'Toutes' : 'All'}</SelectItem>
                    <SelectItem value="1">{fr ? 'Critique' : 'Critical'}</SelectItem>
                    <SelectItem value="2">{fr ? 'Élevée' : 'High'}</SelectItem>
                    <SelectItem value="3">{fr ? 'Moyenne' : 'Medium'}</SelectItem>
                    <SelectItem value="4">{fr ? 'Basse' : 'Low'}</SelectItem>
                    <SelectItem value="5">{fr ? 'Très Basse' : 'Very Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {fr ? 'Nouveau Paiement' : 'New Payment'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fr ? 'Date Échéance' : 'Due Date'}</TableHead>
                <TableHead>{fr ? 'Urgence' : 'Urgency'}</TableHead>
                <TableHead>{fr ? 'Fournisseur' : 'Vendor'}</TableHead>
                <TableHead>{fr ? 'Type' : 'Type'}</TableHead>
                <TableHead>{fr ? 'Projet' : 'Project'}</TableHead>
                <TableHead>{fr ? 'Priorité' : 'Priority'}</TableHead>
                <TableHead className="text-right">{fr ? 'Montant' : 'Amount'}</TableHead>
                <TableHead>{fr ? 'Actions' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {fr ? 'Aucun paiement trouvé' : 'No payments found'}
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id} className={payment.status === 'overdue' ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">
                      {formatDate(payment.due_date)}
                    </TableCell>
                    <TableCell>{getUrgencyBadge(payment)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{payment.vendor_name}</div>
                      {payment.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {payment.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {obligationTypes.find(t => t.value === payment.obligation_type)?.label || payment.obligation_type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.scenario_name}
                    </TableCell>
                    <TableCell>{getPriorityBadge(payment.priority)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payment.status !== 'paid' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDialog(payment)}
                              disabled={isLoading}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => markAsPaid(payment.id)}
                              disabled={isLoading}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => deletePayment(payment.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
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

      {/* Payment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? (fr ? "Modifier l'Obligation" : 'Edit Obligation') : (fr ? 'Nouvelle Obligation de Paiement' : 'New Payment Obligation')}
            </DialogTitle>
            <DialogDescription>
              {fr ? 'Saisissez les détails du paiement à effectuer' : 'Enter the details of the payment to be made'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vendor_name">{fr ? 'Fournisseur / Bénéficiaire *' : 'Vendor / Beneficiary *'}</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder={fr ? 'Nom du fournisseur' : 'Vendor name'}
                />
              </div>

              <div>
                <Label htmlFor="scenario">{fr ? 'Projet (Optionnel)' : 'Project (Optional)'}</Label>
                <Select value={formData.scenario_id} onValueChange={(value) => setFormData({ ...formData, scenario_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={fr ? 'Sélectionner un projet' : 'Select a project'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{fr ? 'Aucun projet' : 'No project'}</SelectItem>
                    {scenarios.map(scenario => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="obligation_type">{fr ? 'Type de Paiement' : 'Payment Type'}</Label>
                <Select value={formData.obligation_type} onValueChange={(value) => setFormData({ ...formData, obligation_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {obligationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">{fr ? 'Priorité' : 'Priority'}</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - {fr ? 'Critique' : 'Critical'}</SelectItem>
                    <SelectItem value="2">2 - {fr ? 'Élevée' : 'High'}</SelectItem>
                    <SelectItem value="3">3 - {fr ? 'Moyenne' : 'Medium'}</SelectItem>
                    <SelectItem value="4">4 - {fr ? 'Basse' : 'Low'}</SelectItem>
                    <SelectItem value="5">5 - {fr ? 'Très Basse' : 'Very Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="due_date">{fr ? "Date d'Échéance *" : 'Due Date *'}</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="amount">{fr ? 'Montant (CAD) *' : 'Amount (CAD) *'}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">{fr ? 'Description / Notes' : 'Description / Notes'}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={fr ? 'Détails supplémentaires...' : 'Additional details...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {fr ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={savePayment} disabled={isLoading}>
              {editingPayment ? (fr ? 'Mettre à Jour' : 'Update') : (fr ? 'Créer' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
