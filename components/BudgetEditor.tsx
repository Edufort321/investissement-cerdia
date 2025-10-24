'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
      alert('Veuillez remplir tous les champs requis')
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
      alert('Erreur lors de la création du budget')
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
      alert('Veuillez remplir tous les champs requis')
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
      alert('Erreur lors de la sauvegarde')
      setIsLoading(false)
      return
    }

    await loadBudgetLines(selectedBudget)
    setIsLineDialogOpen(false)
    setIsLoading(false)
  }

  const deleteBudgetLine = async (lineId: string) => {
    if (!confirm('Supprimer cette ligne budgétaire?')) return

    setIsLoading(true)
    await supabase.from('budget_lines').delete().eq('id', lineId)
    await loadBudgetLines(selectedBudget)
    setIsLoading(false)
  }

  const submitForApproval = async () => {
    if (!selectedBudget) return
    if (budgetLines.length === 0) {
      alert('Ajoutez au moins une ligne budgétaire avant de soumettre')
      return
    }

    if (!confirm('Soumettre ce budget pour approbation?')) return

    setIsLoading(true)
    const { error } = await supabase
      .from('budgets')
      .update({ status: 'submitted' })
      .eq('id', selectedBudget)

    if (error) {
      console.error('Error submitting budget:', error)
      alert('Erreur lors de la soumission')
    } else {
      await loadBudgets()
      alert('Budget soumis pour approbation')
    }
    setIsLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const getCategoryIcon = (type: string) => {
    const colors = {
      revenue: 'bg-green-100 text-green-800',
      expense: 'bg-red-100 text-red-800',
      capex: 'bg-blue-100 text-blue-800',
      financing: 'bg-purple-100 text-purple-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const currentBudget = budgets.find(b => b.id === selectedBudget)
  const totalBudgeted = budgetLines.reduce((sum, line) => sum + line.budgeted_amount, 0)
  const revenueTotal = budgetLines.filter(l => l.category_type === 'revenue').reduce((sum, l) => sum + l.budgeted_amount, 0)
  const expenseTotal = budgetLines.filter(l => l.category_type === 'expense').reduce((sum, l) => sum + l.budgeted_amount, 0)
  const capexTotal = budgetLines.filter(l => l.category_type === 'capex').reduce((sum, l) => sum + l.budgeted_amount, 0)
  const netBudget = revenueTotal - expenseTotal - capexTotal

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Éditeur de Budget</h1>
          <p className="text-muted-foreground mt-2">Créer et gérer les budgets avec lignes détaillées</p>
        </div>
        <div className="flex gap-2">
          {selectedBudget && currentBudget?.status === 'draft' && (
            <Button onClick={submitForApproval} variant="outline" disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              Soumettre
            </Button>
          )}
          <Button onClick={openBudgetDialog} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Budget
          </Button>
        </div>
      </div>

      {/* Budget Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedBudget} onValueChange={setSelectedBudget}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un budget à éditer" />
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
                <CardDescription>Revenus</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(revenueTotal)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Dépenses</CardDescription>
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
                <CardDescription>Budget Net</CardDescription>
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
                  <CardTitle>Lignes Budgétaires</CardTitle>
                  <CardDescription>{budgetLines.length} ligne(s)</CardDescription>
                </div>
                <Button
                  onClick={() => openLineDialog()}
                  disabled={currentBudget.status !== 'draft' || isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Ligne
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentBudget.status !== 'draft' && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ce budget est en statut <strong>{currentBudget.status}</strong> et ne peut plus être modifié.
                  </AlertDescription>
                </Alert>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Ligne</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Montant Budgété</TableHead>
                    <TableHead className="text-center">Seuil Alerte</TableHead>
                    {currentBudget.status === 'draft' && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>Aucune ligne budgétaire</p>
                        <Button onClick={() => openLineDialog()} className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter la première ligne
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
            <DialogTitle>Créer un Nouveau Budget</DialogTitle>
            <DialogDescription>Définir les paramètres du budget</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Projet / Scénario *</Label>
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
                <Label>Année Fiscale *</Label>
                <Input
                  type="number"
                  value={budgetForm.fiscal_year}
                  onChange={(e) => setBudgetForm({ ...budgetForm, fiscal_year: parseInt(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Nom du Budget *</Label>
                <Input
                  value={budgetForm.budget_name}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget_name: e.target.value })}
                  placeholder="Ex: Budget Opérationnel 2024"
                />
              </div>
              <div>
                <Label>Date Début *</Label>
                <Input
                  type="date"
                  value={budgetForm.start_date}
                  onChange={(e) => setBudgetForm({ ...budgetForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Date Fin *</Label>
                <Input
                  type="date"
                  value={budgetForm.end_date}
                  onChange={(e) => setBudgetForm({ ...budgetForm, end_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Notes additionnelles sur le budget"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveBudget} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Créer Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Budget Line Dialog */}
      <Dialog open={isLineDialogOpen} onOpenChange={setIsLineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Modifier' : 'Nouvelle'} Ligne Budgétaire</DialogTitle>
            <DialogDescription>Détails de la ligne budgétaire</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Catégorie Budgétaire *</Label>
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
                <Label>Nom de la Ligne *</Label>
                <Input
                  value={lineForm.line_name}
                  onChange={(e) => setLineForm({ ...lineForm, line_name: e.target.value })}
                  placeholder="Ex: Salaires équipe maintenance"
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={lineForm.description}
                  onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                  rows={2}
                  placeholder="Description optionnelle"
                />
              </div>
              <div>
                <Label>Montant Budgété ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={lineForm.budgeted_amount}
                  onChange={(e) => setLineForm({ ...lineForm, budgeted_amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Seuil d'Alerte (%) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={lineForm.alert_threshold}
                  onChange={(e) => setLineForm({ ...lineForm, alert_threshold: parseFloat(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alerte déclenchée à ce % de consommation
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLineDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveBudgetLine} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {editingLine ? 'Mettre à Jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
