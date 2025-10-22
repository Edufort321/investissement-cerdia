'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Search, BarChart3, AlertCircle } from 'lucide-react'

interface VarianceData {
  budget_line_id: string
  budget_id: string
  scenario_id: string
  scenario_name: string
  fiscal_year: number
  budget_status: string
  category_code: string
  category_name: string
  category_type: string
  line_name: string
  budgeted_amount: number
  spent_amount: number
  remaining_amount: number
  variance_amount: number
  variance_percent: number
  is_over_budget: boolean
  is_near_threshold: boolean
  alert_threshold: number
  consumption_rate: number
  projected_annual_amount: number
  projected_variance: number
}

export default function VarianceAnalysis() {
  const supabase = createClientComponentClient()
  const [variances, setVariances] = useState<VarianceData[]>([])
  const [scenarios, setScenarios] = useState<any[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadScenarios()
  }, [])

  useEffect(() => {
    if (selectedScenario) {
      loadVariances()
    }
  }, [selectedScenario, selectedYear])

  const loadScenarios = async () => {
    const { data } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('status', 'purchased')
      .order('name')
    setScenarios(data || [])
    if (data && data.length > 0) {
      setSelectedScenario(data[0].id)
    }
  }

  const loadVariances = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('budget_variance_analysis')
      .select('*')
      .eq('scenario_id', selectedScenario)
      .eq('fiscal_year', selectedYear)
      .order('category_code')
      .order('line_name')

    if (error) {
      console.error('Error loading variances:', error)
      setIsLoading(false)
      return
    }

    setVariances(data || [])
    setIsLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const filteredVariances = variances.filter(v => {
    const matchesCategory = filterCategory === 'all' || v.category_type === filterCategory
    const matchesSearch =
      v.line_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getVarianceColor = (variance: number, isPercent: boolean = false) => {
    if (variance === 0) return 'text-gray-600'
    const threshold = isPercent ? 10 : 0
    if (Math.abs(variance) < threshold) return 'text-gray-600'
    return variance > 0 ? 'text-red-600' : 'text-green-600'
  }

  const getVarianceIcon = (variance: number) => {
    if (variance === 0) return null
    return variance > 0 ? <TrendingUp className="h-4 w-4 text-red-600" /> : <TrendingDown className="h-4 w-4 text-green-600" />
  }

  const getCategoryBadgeColor = (type: string) => {
    const colors = {
      revenue: 'bg-green-600',
      expense: 'bg-red-600',
      capex: 'bg-blue-600',
      financing: 'bg-purple-600'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-600'
  }

  const stats = {
    totalLines: filteredVariances.length,
    overBudget: filteredVariances.filter(v => v.is_over_budget).length,
    nearThreshold: filteredVariances.filter(v => v.is_near_threshold && !v.is_over_budget).length,
    onTrack: filteredVariances.filter(v => !v.is_over_budget && !v.is_near_threshold).length,
    totalBudgeted: filteredVariances.reduce((sum, v) => sum + v.budgeted_amount, 0),
    totalSpent: filteredVariances.reduce((sum, v) => sum + v.spent_amount, 0),
    totalVariance: filteredVariances.reduce((sum, v) => sum + v.variance_amount, 0)
  }

  const avgConsumption = stats.totalBudgeted > 0
    ? (stats.totalSpent / stats.totalBudgeted) * 100
    : 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Analyse de Variance</h1>
          <p className="text-muted-foreground mt-2">Comparaison détaillée Budget vs Réalisé</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Projet</label>
              <Select value={selectedScenario} onValueChange={setSelectedScenario}>
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
              <label className="text-sm font-medium mb-2 block">Année Fiscale</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Catégorie</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="revenue">Revenus</SelectItem>
                  <SelectItem value="expense">Dépenses</SelectItem>
                  <SelectItem value="capex">CAPEX</SelectItem>
                  <SelectItem value="financing">Financement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Recherche</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Lignes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budgété Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.totalBudgeted)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dépensé Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.totalSpent)}</div>
            <Progress value={Math.min(avgConsumption, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{avgConsumption.toFixed(1)}% consommé</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variance Totale</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${getVarianceColor(stats.totalVariance)}`}>
              {formatCurrency(stats.totalVariance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Dépassement</span>
                <strong>{stats.overBudget}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-orange-600">Alerte</span>
                <strong>{stats.nearThreshold}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">OK</span>
                <strong>{stats.onTrack}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variance Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Détail des Variances
              </CardTitle>
              <CardDescription>{filteredVariances.length} ligne(s) affichée(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Ligne Budgétaire</TableHead>
                  <TableHead className="text-right">Budgété</TableHead>
                  <TableHead className="text-right">Dépensé</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                  <TableHead className="text-right">Variance $</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead className="text-center">Consommation</TableHead>
                  <TableHead className="text-right">Projection</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Aucune donnée de variance disponible</p>
                      <p className="text-sm mt-1">Vérifiez les filtres ou créez un budget</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVariances.map(v => (
                    <TableRow
                      key={v.budget_line_id}
                      className={v.is_over_budget ? 'bg-red-50' : v.is_near_threshold ? 'bg-orange-50' : ''}
                    >
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(v.category_type)}>
                          {v.category_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{v.line_name}</div>
                        <div className="text-xs text-muted-foreground">{v.category_code}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(v.budgeted_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(v.spent_amount)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${v.remaining_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(v.remaining_amount)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getVarianceColor(v.variance_amount)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {getVarianceIcon(v.variance_amount)}
                          {formatCurrency(Math.abs(v.variance_amount))}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${getVarianceColor(v.variance_percent, true)}`}>
                        {v.variance_percent > 0 ? '+' : ''}{v.variance_percent.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="w-32 mx-auto">
                          <Progress
                            value={Math.min(v.consumption_rate, 100)}
                            className="h-2"
                          />
                          <p className="text-xs mt-1 font-medium">
                            {v.consumption_rate.toFixed(1)}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div>{formatCurrency(v.projected_annual_amount)}</div>
                        <div className={`text-xs ${getVarianceColor(v.projected_variance)}`}>
                          {v.projected_variance > 0 ? '+' : ''}{formatCurrency(v.projected_variance)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {v.is_over_budget && (
                          <Badge variant="destructive">Dépassement</Badge>
                        )}
                        {!v.is_over_budget && v.is_near_threshold && (
                          <Badge className="bg-orange-600">
                            Alerte {v.alert_threshold}%
                          </Badge>
                        )}
                        {!v.is_over_budget && !v.is_near_threshold && (
                          <Badge className="bg-green-600">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Légende</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>Ligne en dépassement budgétaire</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
              <span>Ligne proche du seuil d'alerte</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <span>Variance défavorable (dépenses supérieures au budget)</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span>Variance favorable (économies réalisées)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
