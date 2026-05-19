'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, Save, Send, FileText, AlertCircle } from 'lucide-react'

interface Budget {
  id: string
  scenario_id: string
  budget_name: string
  fiscal_year: number
  start_date: string
  end_date: string
  status: string
  version: number
  notes?: string
}

interface BudgetLine {
  id?: string
  budget_id?: string
  category_id: string
  category_name?: string
  category_type?: string
  line_name: string
  description?: string
  budgeted_amount: number
  alert_threshold: number
}

interface BudgetCategory {
  id: string
  category_code: string
  category_name: string
  category_type: string
}

export default function BudgetEditor() {
  const { t, language } = useLanguage()
  const fr = language === 'fr'

  const [scenarios, setScenarios] = useState<any[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<string>('')
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLineDialogOpen, setIsLineDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null)

  const [budgetForm, setBudgetForm] = useState({
    scenario_id: '',
    budget_name: '',
    fiscal_year: new Date().getFullYear(),
    start_date: `${new Date().getFullYear()}-01-01`,
    end_date: `${new Date().getFullYear()}-12-31`,
    notes: ''
  })

  const [lineForm, setLineForm] = useState<BudgetLine>({
    category_id: '',
    line_name: '',
    description: '',
    budgeted_amount: 0,
    alert_threshold: 90
  })

  useEffect(() => {
    loadScenarios()
    loadCategories()
    loadBudgets()
  }, [])

  useEffect(() => {
    if (selectedBudget) {
      loadBudgetLines(selectedBudget)
    }
  }, [selectedBudget])

  const loadScenarios = async () => {
    const { data } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('status', 'purchased')
      .order('name')
    setScenarios(data || [])
  }

  const loadCategories = async () => {
    const { data } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    setCategories(data || [])
  }

  const loadBudgets = async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .order('fiscal_year', { ascending: false })
    setBudgets(data || [])
  }

  const loadBudgetLines = async (budgetId: string) => {
    setIsLoading(true)
    const { data } = await supabase
      .from('budget_lines')
      .select(`
        *,
        budget_categories (
          category_name,
          category_type
        )
      `)
      .eq('budget_id', budgetId)
      .order('line_name')

    if (data) {
      const formattedLines = data.map(line => ({
        ...line,
        category_name: line.budget_categories?.category_name,
        category_type: line.budget_categories?.category_type
      }))
      setBudgetLines(formattedLines)
    }
    setIsLoading(false)
  }

  const openBudgetDialog = () => {
    setBudgetForm({
      scenario_id: scenarios[0]?.id || '',
      budget_name: '',
      fiscal_year: new Date().getFullYear(),
      start_date: `${new Date().getFullYear()}-01-01`,
      end_date: `${new Date().getFullYear()}-12-31`,
      notes: ''
    })
    setIsDialogOpen(true)
  }

  const saveBudget = async () => {
    if (!budgetForm.scenario_id || !budgetForm.budget_name) {
      alert(fr ? 'Veuillez remplir tous les champs requis' : 'Please fill in all required fields')
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        ...budgetForm,
        status: 'draft',
        version: 1
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating budget:', error)
      alert(fr ? 'Erreur lors de la création du budget' : 'Error creating budget')
      setIsLoading(false)
      return
    }

    await loadBudgets()
    setSelectedBudget(data.id)
    setIsDialogOpen(false)
    setIsLoading(false)
  }

  const openLineDialog = (line?: BudgetLine) => {
    if (line) {
      setEditingLine(line)
      setLineForm(line)
    } else {
      setEditingLine(null)
      setLineForm({
        category_id: categories[0]?.id || '',
        line_name: '',
        description: '',
        budgeted_amount: 0,
        alert_threshold: 90
      })
    }
    setIsLineDialogOpen(true)
  }

  const saveBudgetLine = async () => {
    if (!lineForm.line_name || !lineForm.category_id || lineForm.budgeted_amount === 0) {
      alert(fr ? 'Veuillez remplir tous les champs requis' : 'Please fill in all required fields')
      return
    }

    setIsLoading(true)
    const lineData = {
      ...lineForm,
      budget_id: selectedBudget
    }

    const { error } = editingLine
      ? await supabase.from('budget_lines').update(lineData).eq('id', editingLine.id)
      : await supabase.from('budget_lines').insert(lineData)

    if (error) {
      console.error('Error saving budget line:', error)
      alert(fr ? 'Erreur lors de la sauvegarde' : 'Error saving')
      setIsLoading(false)
      return
    }

    await loadBudgetLines(selectedBudget)
    setIsLineDialogOpen(false)
    setIsLoading(false)
  }

  const deleteBudgetLine = async (lineId: string) => {
    if (!confirm(fr ? 'Supprimer cette ligne budgétaire?' : 'Delete this budget line?')) return

    setIsLoading(true)
    await supabase.from('budget_lines').delete().eq('id', lineId)
    await loadBudgetLines(selectedBudget)
    setIsLoading(false)
  }

  const submitForApproval = async () => {
    if (!selectedBudget) return
    if (budgetLines.length === 0) {
      alert(fr
        ? 'Ajoutez au moins une ligne budgétaire avant de soumettre'
        : 'Add at least one budget line before submitting')
      return
    }

    if (!confirm(fr ? 'Soumettre ce budget pour approbation?' : 'Submit this budget for approval?')) return

    setIsLoading(true)
    const { error } = await supabase
      .from('budgets')
      .update({ status: 'submitted' })
      .eq('id', selectedBudget)

    if (error) {
      console.error('Error submitting budget:', error)
      alert(fr ? 'Erreur lors de la soumission' : 'Submission error')
    } else {
      await loadBudgets()
      alert(fr ? 'Budget soumis pour approbation' : 'Budget submitted for approval')
    }
    setIsLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(fr ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const getCategoryIcon = (type: string) => {
    const colors = {
      revenue:   'bg-green-100 text-green-800',
      expense:   'bg-red-100 text-red-800',
      capex:     'bg-blue-100 text-blue-800',
      financing: 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const currentBudget = budgets.find(b => b.id === selectedBudget)
  const revenueTotal  = budgetLines.filter(l => l.category_type === 'revenue').reduce((sum, l) => sum + l.budgeted_amount, 0)
  const expenseTotal  = budgetLines.filter(l => l.category_type === 'expense').reduce((sum, l) => sum + l.budgeted_amount, 0)
  const capexTotal    = budgetLines.filter(l => l.category_type === 'capex').reduce((sum, l) => sum + l.budgeted_amount, 0)
  const netBudget     = revenueTotal - expenseTotal - capexTotal

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('budget.editorTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('budget.editorSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          {selectedBudget && currentBudget?.status === 'draft' && (
            <Button onClick={submitForApproval} variant="outline" disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              {t('budget.submit')}
            </Button>
          )}
          <Button onClick={openBudgetDialog} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            {t('budget.newBudget')}
          </Button>
        </div>
      </div>

      {/* Budget Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('budget.selectBudget')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBudget} onValueChange={setSelectedBudget}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('budget.selectBudgetPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {budgets.map(b => {
                const scenario = scenarios.find(s => s.id === b.scenario_id)
                return (
                  <SelectItem key={b.id} value={b.id}>
                    {b.budget_name} - {b.fiscal_year} ({scenario?.name || 'N/A'}) -{' '}
                    <Badge className="ml-2">{b.status}</Badge>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedBudget && currentBudget && (
        <>
          {/* Budget Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('budget.revenue')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(revenueTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('budget.expenses')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(expenseTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>CAPEX</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(capexTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('budget.netBudget')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netBudget)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Lines Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t('budget.budgetLines')}</CardTitle>
                  <CardDescription>
                    {budgetLines.length} {fr ? 'ligne(s)' : 'line(s)'}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => openLineDialog()}
                  disabled={currentBudget.status !== 'draft' || isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('budget.addLine')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentBudget.status !== 'draft' && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {fr
                      ? `Ce budget est en statut `
                      : `This budget has status `}
                    <strong>{currentBudget.status}</strong>
                    {fr ? ' et ne peut plus être modifié.' : ' and can no longer be edited.'}
                  </AlertDescription>
                </Alert>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('budget.colCategory')}</TableHead>
                    <TableHead>{t('budget.colLine')}</TableHead>
                    <TableHead>{t('budget.colDescription')}</TableHead>
                    <TableHead className="text-right">{t('budget.colBudgetedAmount')}</TableHead>
                    <TableHead className="text-center">{t('budget.colAlertThreshold')}</TableHead>
                    {currentBudget.status === 'draft' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>{t('budget.noLines')}</p>
                        <Button onClick={() => openLineDialog()} className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          {t('budget.addFirstLine')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgetLines.map(line => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Badge className={getCategoryIcon(line.category_type || '')}>
                            {line.category_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{line.line_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {line.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(line.budgeted_amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{line.alert_threshold}%</Badge>
                        </TableCell>
                        {currentBudget.status === 'draft' && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLineDialog(line)}
                                disabled={isLoading}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => deleteBudgetLine(line.id!)}
                                disabled={isLoading}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* New Budget Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('budget.createTitle')}</DialogTitle>
            <DialogDescription>{t('budget.createDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('budget.projectScenario')} *</Label>
                <Select value={budgetForm.scenario_id} onValueChange={(v) => setBudgetForm({ ...budgetForm, scenario_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('budget.fiscalYearLabel')} *</Label>
                <Input
                  type="number"
                  value={budgetForm.fiscal_year}
                  onChange={(e) => setBudgetForm({ ...budgetForm, fiscal_year: parseInt(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('budget.budgetNameLabel')} *</Label>
                <Input
                  value={budgetForm.budget_name}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget_name: e.target.value })}
                  placeholder={fr ? 'Ex: Budget Opérationnel 2024' : 'Ex: Operational Budget 2024'}
                />
              </div>
              <div>
                <Label>{t('budget.startDate')} *</Label>
                <Input
                  type="date"
                  value={budgetForm.start_date}
                  onChange={(e) => setBudgetForm({ ...budgetForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('budget.endDate')} *</Label>
                <Input
                  type="date"
                  value={budgetForm.end_date}
                  onChange={(e) => setBudgetForm({ ...budgetForm, end_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('budget.notes')}</Label>
                <Textarea
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  rows={3}
                  placeholder={t('budget.notesPlaceholder')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('budget.cancel')}</Button>
            <Button onClick={saveBudget} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {t('budget.createBudget')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Line Dialog */}
      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? t('budget.update') : t('budget.create')} — {t('budget.lineDetails')}
            </DialogTitle>
            <DialogDescription>{t('budget.lineDetails')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{t('budget.budgetCategory')} *</Label>
                <Select value={lineForm.category_id} onValueChange={(v) => setLineForm({ ...lineForm, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.category_name} ({cat.category_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{t('budget.lineName')} *</Label>
                <Input
                  value={lineForm.line_name}
                  onChange={(e) => setLineForm({ ...lineForm, line_name: e.target.value })}
                  placeholder={fr ? 'Ex: Salaires équipe maintenance' : 'Ex: Maintenance team salaries'}
                />
              </div>
              <div className="col-span-2">
                <Label>{t('budget.description')}</Label>
                <Textarea
                  value={lineForm.description}
                  onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                  rows={2}
                  placeholder={fr ? 'Description optionnelle' : 'Optional description'}
                />
              </div>
              <div>
                <Label>{t('budget.budgetedAmountLabel')} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lineForm.budgeted_amount}
                  onChange={(e) => setLineForm({ ...lineForm, budgeted_amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('budget.alertThresholdLabel')} *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={lineForm.alert_threshold}
                  onChange={(e) => setLineForm({ ...lineForm, alert_threshold: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('budget.alertThresholdDesc')}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLineDialogOpen(false)}>{t('budget.cancel')}</Button>
            <Button onClick={saveBudgetLine} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {editingLine ? t('budget.update') : t('budget.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
