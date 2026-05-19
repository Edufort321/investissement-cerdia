'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
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
  const { t, language } = useLanguage()
  const fr = language === 'fr'

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
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAlerts = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('active_budget_alerts')
      .select('*')

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
      alert(fr ? 'Erreur lors de la confirmation' : 'Confirmation error')
    } else {
      await loadAlerts()
    }
    setIsLoading(false)
  }

  const acknowledgeAll = async (severity?: string) => {
    if (!confirm(fr
      ? `Confirmer toutes les alertes${severity ? ` de niveau ${severity}` : ''}?`
      : `Confirm all alerts${severity ? ` of level ${severity}` : ''}?`)) return

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
      alert(fr ? 'Erreur lors de la confirmation' : 'Confirmation error')
    } else {
      await loadAlerts()
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

  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, JSX.Element> = {
      critical: <AlertTriangle className="h-5 w-5 text-red-600" />,
      warning:  <AlertCircle className="h-5 w-5 text-orange-600" />,
      info:     <Info className="h-5 w-5 text-blue-600" />
    }
    return icons[severity] || <Info className="h-5 w-5" />
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'border-red-200 bg-red-50',
      warning:  'border-orange-200 bg-orange-50',
      info:     'border-blue-200 bg-blue-50'
    }
    return colors[severity] || 'border-gray-200 bg-gray-50'
  }

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, JSX.Element> = {
      critical: <Badge variant="destructive">{t('budget.healthCritical')}</Badge>,
      warning:  <Badge className="bg-orange-600">{t('treasury.severityWarning')}</Badge>,
      info:     <Badge className="bg-blue-600">Info</Badge>
    }
    return map[severity] || <Badge>{severity}</Badge>
  }

  const getAlertTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      over_budget:       t('budget.typeOverBudget'),
      near_threshold:    t('budget.typeNearThreshold'),
      variance_high:     t('budget.typeVarianceHigh'),
      approval_pending:  t('budget.typeApprovalPending'),
      revision_needed:   t('budget.typeRevisionNeeded'),
    }
    return map[type] || type
  }

  const filteredAlerts = alerts.filter(a => {
    const matchesSeverity = filterSeverity === 'all' || a.severity === filterSeverity
    const matchesType = filterType === 'all' || a.alert_type === filterType
    return matchesSeverity && matchesType
  })

  const stats = {
    total:        filteredAlerts.length,
    critical:     filteredAlerts.filter(a => a.severity === 'critical').length,
    warning:      filteredAlerts.filter(a => a.severity === 'warning').length,
    info:         filteredAlerts.filter(a => a.severity === 'info').length,
    overBudget:   filteredAlerts.filter(a => a.alert_type === 'over_budget').length,
    nearThreshold:filteredAlerts.filter(a => a.alert_type === 'near_threshold').length,
    oldestDays:   Math.max(...filteredAlerts.map(a => a.days_open), 0)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            {t('budget.alertsTitle')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('budget.alertsSubtitle')}</p>
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
            {t('budget.refresh')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budget.totalAlerts')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>{t('treasury.criticals')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardDescription>{t('treasury.warnings')}</CardDescription>
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
            <CardDescription>{t('budget.overBudgets')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.overBudget}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('budget.oldestAlert')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.oldestDays}{fr ? 'j' : 'd'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>{t('budget.filters')}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => acknowledgeAll('critical')}
                variant="outline"
                size="sm"
                disabled={stats.critical === 0 || isLoading}
              >
                {t('budget.ackCritical')}
              </Button>
              <Button
                onClick={() => acknowledgeAll()}
                variant="outline"
                size="sm"
                disabled={stats.total === 0 || isLoading}
              >
                {t('budget.ackAll')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {fr ? 'Sévérité' : 'Severity'}
              </label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('treasury.all')}</SelectItem>
                  <SelectItem value="critical">{t('treasury.severityCritical')}</SelectItem>
                  <SelectItem value="warning">{t('treasury.severityWarning')}</SelectItem>
                  <SelectItem value="info">{t('treasury.severityInfo')}</SelectItem>
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
                  <SelectItem value="all">{t('treasury.all')}</SelectItem>
                  <SelectItem value="over_budget">{t('budget.typeOverBudget')}</SelectItem>
                  <SelectItem value="near_threshold">{t('budget.typeNearThreshold')}</SelectItem>
                  <SelectItem value="variance_high">{t('budget.typeVarianceHigh')}</SelectItem>
                  <SelectItem value="approval_pending">{t('budget.typeApprovalPending')}</SelectItem>
                  <SelectItem value="revision_needed">{t('budget.typeRevisionNeeded')}</SelectItem>
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
                <p className="font-medium text-lg">{t('treasury.noActiveAlerts')}</p>
                <p className="text-sm mt-1">{t('budget.allGood')}</p>
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
                          {fr
                            ? `il y a ${alert.days_open} jour${alert.days_open > 1 ? 's' : ''}`
                            : `${alert.days_open} day${alert.days_open > 1 ? 's' : ''} ago`}
                        </span>
                      </div>

                      <p className="font-semibold text-lg mb-2">{alert.message}</p>

                      <div className="grid gap-2 md:grid-cols-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t('budget.project')}:</span>{' '}
                          <strong>{alert.scenario_name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('budget.fiscalYear')}:</span>{' '}
                          <strong>{alert.fiscal_year}</strong>
                        </div>
                        {alert.line_name && (
                          <>
                            <div>
                              <span className="text-muted-foreground">{t('budget.line')}:</span>{' '}
                              <strong>{alert.line_name}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('budget.category')}:</span>{' '}
                              <strong>{alert.category_name}</strong>
                            </div>
                          </>
                        )}
                        {alert.threshold_value && alert.current_value && (
                          <>
                            <div>
                              <span className="text-muted-foreground">{t('budget.threshold')}:</span>{' '}
                              <strong>{formatCurrency(alert.threshold_value)}</strong>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('treasury.currentValue')}:</span>{' '}
                              <strong className={alert.current_value > alert.threshold_value ? 'text-red-600' : ''}>
                                {formatCurrency(alert.current_value)}
                              </strong>
                            </div>
                          </>
                        )}
                        {alert.variance_percent !== null && alert.variance_percent !== undefined && (
                          <div>
                            <span className="text-muted-foreground">{t('budget.variance')}:</span>{' '}
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
                    {t('budget.confirm')}
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
            <CardTitle className="text-sm">{t('budget.severityLevels')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>{t('treasury.severityCritical')}:</strong>{' '}
                  {fr
                    ? 'Action immédiate requise. Budget dépassé ou risque majeur.'
                    : 'Immediate action required. Budget exceeded or major risk.'}
                </AlertDescription>
              </Alert>
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>{t('treasury.severityWarning')}:</strong>{' '}
                  {fr
                    ? "Surveillance nécessaire. Approche du seuil d'alerte."
                    : 'Monitoring required. Approaching alert threshold.'}
                </AlertDescription>
              </Alert>
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Info:</strong>{' '}
                  {fr
                    ? 'Notification informative pour suivi et planification.'
                    : 'Informational notification for tracking and planning.'}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
