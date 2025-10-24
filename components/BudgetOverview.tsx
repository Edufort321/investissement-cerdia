'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Target, Activity, PieChart } from 'lucide-react'

interface BudgetSummary {
  budget_id: string
  scenario_id: string
  scenario_name: string
  fiscal_year: number
  budget_name: string
  status: string
  version: number
  total_revenue: number
  total_expense: number
  total_capex: number
  total_financing: number
  net_budget: number
  actual_revenue: number
  actual_expense: number
  actual_capex: number
  actual_financing: number
  revenue_variance: number
  expense_variance: number
  capex_variance: number
  total_lines: number
  over_budget_lines: number
  near_threshold_lines: number
  created_at: string
  approved_at: string | null
}

interface CategoryPerformance {
  scenario_id: string
  scenario_name: string
  fiscal_year: number
  category_code: string
  category_name: string
  category_type: string
  total_lines: number
  total_budgeted: number
  total_spent: number
  total_remaining: number
  total_variance: number
  avg_consumption_rate: number
  over_budget_count: number
  near_threshold_count: number
}

export default function BudgetOverview() {
  const [budgets, setBudgets] = useState<BudgetSummary[]>([])
  const [selectedBudget, setSelectedBudget] = useState<string>('')
  const [budgetDetails, setBudgetDetails] = useState<BudgetSummary | null>(null)
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadBudgets()
  }, [])

  useEffect(() => {
    if (selectedBudget) {
      const budget = budgets.find(b => b.budget_id === selectedBudget)
      setBudgetDetails(budget || null)
      if (budget) {
        loadCategoryPerformance(budget.scenario_id, budget.fiscal_year)
      }
    }
  }, [selectedBudget, budgets])

  const loadBudgets = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('budget_summary')
      .select('*')
      .order('fiscal_year', { ascending: false })

    if (error) {
      console.error('Error loading budgets:', error)
      setIsLoading(false)
      return
    }

    setBudgets(data || [])
    if (data && data.length > 0 && !selectedBudget) {
      setSelectedBudget(data[0].budget_id)
    }
    setIsLoading(false)
  }

  const loadCategoryPerformance = async (scenarioId: string, fiscalYear: number) => {
    const { data, error } = await supabase
      .from('budget_category_performance')
      .select('*')
      .eq('scenario_id', scenarioId)
      .eq('fiscal_year', fiscalYear)
      .order('category_code')

    if (!error && data) {
      setCategoryPerformance(data)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const getHealthScore = () => {
    if (!budgetDetails) return { score: 0, level: 'unknown', color: 'bg-gray-500' }

    let score = 100

    // Pénalités basées sur les dépassements
    if (budgetDetails.over_budget_lines > 0) {
      score -= budgetDetails.over_budget_lines * 10
    }

    // Pénalités pour lignes proches du seuil
    if (budgetDetails.near_threshold_lines > 0) {
      score -= budgetDetails.near_threshold_lines * 5
    }

    // Pénalité pour variance globale dépenses
    const expenseVariancePct = budgetDetails.total_expense > 0
      ? ((budgetDetails.actual_expense - budgetDetails.total_expense) / budgetDetails.total_expense) * 100
      : 0
    if (expenseVariancePct > 0) {
      score -= expenseVariancePct * 0.5
    }

    // Pénalité pour variance CAPEX
    const capexVariancePct = budgetDetails.total_capex > 0
      ? ((budgetDetails.actual_capex - budgetDetails.total_capex) / budgetDetails.total_capex) * 100
      : 0
    if (capexVariancePct > 0) {
      score -= capexVariancePct * 0.3
    }

    // Bonus si revenus dépassent prévisions
    const revenueVariancePct = budgetDetails.total_revenue > 0
      ? ((budgetDetails.actual_revenue - budgetDetails.total_revenue) / budgetDetails.total_revenue) * 100
      : 0
    if (revenueVariancePct > 0) {
      score += Math.min(revenueVariancePct * 0.5, 10)
    }

    // Bonus si aucun dépassement
    if (budgetDetails.over_budget_lines === 0) {
      score += 5
    }

    score = Math.max(0, Math.min(100, score))

    let level = 'excellent'
    let color = 'bg-green-600'
    if (score < 80) { level = 'bon'; color = 'bg-blue-600' }
    if (score < 60) { level = 'attention'; color = 'bg-yellow-600' }
    if (score < 40) { level = 'critique'; color = 'bg-red-600' }

    return { score: Math.round(score), level, color }
  }

  const health = getHealthScore()

  const getConsumptionColor = (rate: number) => {
    if (rate > 100) return 'text-red-600'
    if (rate > 90) return 'text-orange-600'
    if (rate > 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: <Badge variant="secondary">Brouillon</Badge>,
      submitted: <Badge className="bg-blue-600">Soumis</Badge>,
      approved: <Badge className="bg-green-600">Approuvé</Badge>,
      active: <Badge className="bg-purple-600">Actif</Badge>,
      closed: <Badge variant="outline">Clôturé</Badge>,
      rejected: <Badge variant="destructive">Rejeté</Badge>,
    }
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Vue d'Ensemble Budgétaire</h1>
          <p className="text-muted-foreground mt-2">Analyse et performance des budgets</p>
        </div>
        <Select value={selectedBudget} onValueChange={setSelectedBudget}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Sélectionner un budget" />
          </SelectTrigger>
          <SelectContent>
            {budgets.map(b => (
              <SelectItem key={b.budget_id} value={b.budget_id}>
                {b.scenario_name} - {b.fiscal_year} {b.version > 1 ? `(v${b.version})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {budgetDetails && (
        <>
          {/* Budget Health Score */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">{budgetDetails.budget_name}</CardTitle>
                  <CardDescription className="mt-1">
                    Année fiscale {budgetDetails.fiscal_year} • {getStatusBadge(budgetDetails.status)}
                  </CardDescription>
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-bold ${health.color.replace('bg-', 'text-')}`}>
                    {health.score}
                  </div>
                  <Badge className={`${health.color} text-white mt-2`}>{health.level.toUpperCase()}</Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* KPIs Grid - Revenue */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Revenus Budgétés</CardDescription>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(budgetDetails.total_revenue)}</div>
                <Progress value={Math.min((budgetDetails.actual_revenue / budgetDetails.total_revenue) * 100, 100)} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Réalisé: {formatCurrency(budgetDetails.actual_revenue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Dépenses Budgétées</CardDescription>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(budgetDetails.total_expense)}</div>
                <Progress
                  value={Math.min((budgetDetails.actual_expense / budgetDetails.total_expense) * 100, 100)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Dépensé: {formatCurrency(budgetDetails.actual_expense)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>CAPEX Budgété</CardDescription>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(budgetDetails.total_capex)}</div>
                <Progress
                  value={Math.min((budgetDetails.actual_capex / budgetDetails.total_capex) * 100, 100)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Dépensé: {formatCurrency(budgetDetails.actual_capex)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Budget Net</CardDescription>
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${budgetDetails.net_budget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(budgetDetails.net_budget)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Revenus - Dépenses - CAPEX
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Variance Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Variance Revenus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${budgetDetails.revenue_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(budgetDetails.revenue_variance)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {budgetDetails.revenue_variance >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {budgetDetails.total_revenue > 0
                      ? `${Math.abs((budgetDetails.revenue_variance / budgetDetails.total_revenue) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Variance Dépenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${budgetDetails.expense_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(budgetDetails.expense_variance)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {budgetDetails.expense_variance >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {budgetDetails.total_expense > 0
                      ? `${Math.abs((budgetDetails.expense_variance / budgetDetails.total_expense) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Variance CAPEX</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${budgetDetails.capex_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(budgetDetails.capex_variance)}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {budgetDetails.capex_variance >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {budgetDetails.total_capex > 0
                      ? `${Math.abs((budgetDetails.capex_variance / budgetDetails.total_capex) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {budgetDetails.over_budget_lines > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention:</strong> {budgetDetails.over_budget_lines} ligne(s) budgétaire(s) en dépassement.
                Révision recommandée.
              </AlertDescription>
            </Alert>
          )}

          {budgetDetails.near_threshold_lines > 0 && budgetDetails.over_budget_lines === 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Surveillance:</strong> {budgetDetails.near_threshold_lines} ligne(s) proche(s) du seuil d'alerte.
              </AlertDescription>
            </Alert>
          )}

          {health.score >= 80 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Budget en bonne santé. La performance financière est conforme aux prévisions.
              </AlertDescription>
            </Alert>
          )}

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Performance par Catégorie
              </CardTitle>
              <CardDescription>Analyse détaillée par type de catégorie budgétaire</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Aucune donnée de performance disponible</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryPerformance.map(cat => {
                    const consumptionRate = cat.avg_consumption_rate || 0
                    return (
                      <div key={cat.category_code} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{cat.category_name}</h3>
                            <p className="text-xs text-muted-foreground">{cat.total_lines} ligne(s)</p>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getConsumptionColor(consumptionRate)}`}>
                              {consumptionRate.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">Consommation</p>
                          </div>
                        </div>
                        <Progress value={Math.min(consumptionRate, 100)} className="mb-2" />
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Budgété</p>
                            <p className="font-medium">{formatCurrency(cat.total_budgeted)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Dépensé</p>
                            <p className="font-medium">{formatCurrency(cat.total_spent)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Restant</p>
                            <p className={`font-medium ${cat.total_remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(cat.total_remaining)}
                            </p>
                          </div>
                        </div>
                        {cat.over_budget_count > 0 && (
                          <Badge variant="destructive" className="mt-2">
                            {cat.over_budget_count} ligne(s) en dépassement
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques du Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Lignes Budgétaires</span>
                  <Badge variant="outline">{budgetDetails.total_lines}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Version du Budget</span>
                  <Badge variant="outline">v{budgetDetails.version}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Lignes en Dépassement</span>
                  <Badge className={budgetDetails.over_budget_lines > 0 ? 'bg-red-600' : 'bg-green-600'}>
                    {budgetDetails.over_budget_lines}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Lignes Proches Seuil</span>
                  <Badge className={budgetDetails.near_threshold_lines > 0 ? 'bg-orange-600' : 'bg-green-600'}>
                    {budgetDetails.near_threshold_lines}
                  </Badge>
                </div>
                {budgetDetails.approved_at && (
                  <>
                    <div className="flex justify-between items-center col-span-2">
                      <span className="text-sm font-medium">Date d'Approbation</span>
                      <span className="text-sm">{new Date(budgetDetails.approved_at).toLocaleDateString('fr-CA')}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!budgetDetails && !isLoading && budgets.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Aucun budget trouvé</p>
              <p className="text-sm mt-1">Créez votre premier budget pour commencer</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
