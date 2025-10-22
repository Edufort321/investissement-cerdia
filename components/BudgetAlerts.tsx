'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Bell, RefreshCw, Filter } from 'lucide-react'

interface BudgetAlert {
  alert_id: string
  budget_id: string
  scenario_id: string
  scenario_name: string
  fiscal_year: number
  budget_line_id?: string
  line_name?: string
  category_name?: string
  alert_type: string
  severity: string
  message: string
  threshold_value?: number
  current_value?: number
  variance_percent?: number
  created_at: string
  days_open: number
}

export default function BudgetAlerts() {
  const supabase = createClientComponentClient()
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [filterSeverity, filterType])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAlerts()
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAlerts = async () => {
    setIsLoading(true)
    let query = supabase
      .from('active_budget_alerts')
      .select('*')

    const { data, error } = await query

    if (error) {
      console.error('Error loading alerts:', error)
      setIsLoading(false)
      return
    }

    setAlerts(data || [])
    setIsLoading(false)
  }

  const acknowledgeAlert = async (alertId: string) => {
    setIsLoading(true)
    const { error } = await supabase
      .from('budget_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId)

    if (error) {
      console.error('Error acknowledging alert:', error)
      alert('Erreur lors de la confirmation')
    } else {
      await loadAlerts()
    }
    setIsLoading(false)
  }

  const acknowledgeAll = async (severity?: string) => {
    if (!confirm(`Confirmer toutes les alertes${severity ? ` de niveau ${severity}` : ''}?`)) return

    setIsLoading(true)
    let query = supabase
      .from('budget_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('is_acknowledged', false)

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { error } = await query

    if (error) {
      console.error('Error acknowledging alerts:', error)
      alert('Erreur lors de la confirmation')
    } else {
      await loadAlerts()
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

  const getSeverityIcon = (severity: string) => {
    const icons = {
      critical: <AlertTriangle className="h-5 w-5 text-red-600" />,
      warning: <AlertCircle className="h-5 w-5 text-orange-600" />,
      info: <Info className="h-5 w-5 text-blue-600" />
    }
    return icons[severity as keyof typeof icons] || <Info className="h-5 w-5" />
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'border-red-200 bg-red-50',
      warning: 'border-orange-200 bg-orange-50',
      info: 'border-blue-200 bg-blue-50'
    }
    return colors[severity as keyof typeof colors] || 'border-gray-200 bg-gray-50'
  }

  const getSeverityBadge = (severity: string) => {
    const badges = {
      critical: <Badge variant="destructive">Critique</Badge>,
      warning: <Badge className="bg-orange-600">Avertissement</Badge>,
      info: <Badge className="bg-blue-600">Info</Badge>
    }
    return badges[severity as keyof typeof badges] || <Badge>{severity}</Badge>
  }

  const getAlertTypeLabel = (type: string) => {
    const labels = {
      over_budget: 'Dépassement Budget',
      near_threshold: 'Proche Seuil',
      variance_high: 'Variance Élevée',
      approval_pending: 'Approbation Requise',
      revision_needed: 'Révision Nécessaire'
    }
    return labels[type as keyof typeof labels] || type
  }

  const filteredAlerts = alerts.filter(a => {
    const matchesSeverity = filterSeverity === 'all' || a.severity === filterSeverity
    const matchesType = filterType === 'all' || a.alert_type === filterType
    return matchesSeverity && matchesType
  })

  const stats = {
    total: filteredAlerts.length,
    critical: filteredAlerts.filter(a => a.severity === 'critical').length,
    warning: filteredAlerts.filter(a => a.severity === 'warning').length,
    info: filteredAlerts.filter(a => a.severity === 'info').length,
    overBudget: filteredAlerts.filter(a => a.alert_type === 'over_budget').length,
    nearThreshold: filteredAlerts.filter(a => a.alert_type === 'near_threshold').length,
    oldestDays: Math.max(...filteredAlerts.map(a => a.days_open), 0)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Alertes Budgétaires
          </h1>
          <p className="text-muted-foreground mt-2">Surveillance et gestion des alertes budgets</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <Button onClick={() => loadAlerts()} variant="outline" disabled={isLoading} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Alertes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>Critiques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription>Avertissements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.warning}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardDescription>Info</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.info}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dépassements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.overBudget}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alerte Ancienne</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.oldestDays}j</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtres</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => acknowledgeAll('critical')}
                variant="outline"
                size="sm"
                disabled={stats.critical === 0 || isLoading}
              >
                Confirmer Critiques
              </Button>
              <Button
                onClick={() => acknowledgeAll()}
                variant="outline"
                size="sm"
                disabled={stats.total === 0 || isLoading}
              >
                Tout Confirmer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Sévérité</label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="critical">Critiques</SelectItem>
                  <SelectItem value="warning">Avertissements</SelectItem>
                  <SelectItem value="info">Informations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="over_budget">Dépassement Budget</SelectItem>
                  <SelectItem value="near_threshold">Proche Seuil</SelectItem>
                  <SelectItem value="variance_high">Variance Élevée</SelectItem>
                  <SelectItem value="approval_pending">Approbation Requise</SelectItem>
                  <SelectItem value="revision_needed">Révision Nécessaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-400" />
                <p className="font-medium text-lg">Aucune alerte active</p>
                <p className="text-sm mt-1">Tous les budgets sont dans les limites acceptables</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map(alert => (
            <Card key={alert.alert_id} className={`${getSeverityColor(alert.severity)} border-2`}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 flex-1">
                    <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityBadge(alert.severity)}
                        <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          il y a {alert.days_open} jour{alert.days_open > 1 ? 's' : ''}
                        </span>
                      </div>

                      <p className="font-semibold text-lg mb-2">{alert.message}</p>

                      <div className="grid gap-2 md:grid-cols-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Projet:</span>{' '}
                          <strong>{alert.scenario_name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Année Fiscale:</span>{' '}
                          <strong>{alert.fiscal_year}</strong>
                        </div>
                        {alert.line_name && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Ligne:</span>{' '}
                              <strong>{alert.line_name}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Catégorie:</span>{' '}
                              <strong>{alert.category_name}</strong>
                            </div>
                          </>
                        )}
                        {alert.threshold_value && alert.current_value && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Seuil:</span>{' '}
                              <strong>{formatCurrency(alert.threshold_value)}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Actuel:</span>{' '}
                              <strong className={alert.current_value > alert.threshold_value ? 'text-red-600' : ''}>
                                {formatCurrency(alert.current_value)}
                              </strong>
                            </div>
                          </>
                        )}
                        {alert.variance_percent !== null && alert.variance_percent !== undefined && (
                          <div>
                            <span className="text-muted-foreground">Variance:</span>{' '}
                            <strong className={alert.variance_percent > 0 ? 'text-red-600' : 'text-green-600'}>
                              {alert.variance_percent > 0 ? '+' : ''}{alert.variance_percent.toFixed(1)}%
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => acknowledgeAlert(alert.alert_id)}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="ml-4"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Legend */}
      {filteredAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Niveaux de Sévérité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Critique:</strong> Action immédiate requise. Budget dépassé ou risque majeur.
                </AlertDescription>
              </Alert>
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>Avertissement:</strong> Surveillance nécessaire. Approche du seuil d'alerte.
                </AlertDescription>
              </Alert>
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Info:</strong> Notification informative pour suivi et planification.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
