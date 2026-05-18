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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Settings,
  Bell,
  BellOff,
  Clock,
  TrendingDown,
  DollarSign,
} from 'lucide-react'

interface TreasuryAlert {
  id: string
  alert_type: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  threshold_value?: number
  current_value?: number
  is_active: boolean
  acknowledged_at?: string
  acknowledged_by?: string
  created_at: string
}

interface AlertConfig {
  low_cash_threshold: number
  critical_cash_threshold: number
  days_of_cash_warning: number
  overdue_payment_threshold: number
  negative_projection_months: number
}

const defaultConfig: AlertConfig = {
  low_cash_threshold: 50000,
  critical_cash_threshold: 25000,
  days_of_cash_warning: 30,
  overdue_payment_threshold: 5000,
  negative_projection_months: 3,
}

export default function TreasuryAlerts() {
  const { t, language } = useLanguage()
  const fr = language === 'fr'

  const [alerts, setAlerts] = useState<TreasuryAlert[]>([])
  const [showActive, setShowActive] = useState(true)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<AlertConfig>(defaultConfig)
  const [stats, setStats] = useState({
    critical: 0,
    warning: 0,
    info: 0,
    total: 0,
  })

  useEffect(() => {
    loadAlerts()
    loadConfig()
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [showActive, selectedSeverity])

  useEffect(() => {
    calculateStats()
  }, [alerts])

  const loadAlerts = async () => {
    setIsLoading(true)

    let query = supabase
      .from('treasury_alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (showActive) {
      query = query.eq('is_active', true)
    }

    if (selectedSeverity !== 'all') {
      query = query.eq('severity', selectedSeverity)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading alerts:', error)
      setIsLoading(false)
      return
    }

    setAlerts(data || [])
    setIsLoading(false)
  }

  const loadConfig = async () => {
    const savedConfig = localStorage.getItem('treasury_alert_config')
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig))
    }
  }

  const saveConfig = async () => {
    localStorage.setItem('treasury_alert_config', JSON.stringify(config))
    setIsConfigDialogOpen(false)
    alert(fr
      ? 'Configuration enregistrée. Les alertes seront recalculées lors de la prochaine mise à jour.'
      : 'Configuration saved. Alerts will be recalculated on the next update.')
  }

  const acknowledgeAlert = async (alertId: string) => {
    setIsLoading(true)

    const { error } = await supabase
      .from('treasury_alerts')
      .update({
        is_active: false,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: 'current_user',
      })
      .eq('id', alertId)

    if (error) {
      console.error('Error acknowledging alert:', error)
      alert(fr ? 'Erreur lors de la mise à jour' : 'Update error')
      setIsLoading(false)
      return
    }

    await loadAlerts()
    setIsLoading(false)
  }

  const dismissAllAlerts = async () => {
    if (!confirm(fr
      ? 'Êtes-vous sûr de vouloir acquitter toutes les alertes actives?'
      : 'Are you sure you want to acknowledge all active alerts?')) {
      return
    }

    setIsLoading(true)

    const activeAlertIds = alerts.filter(a => a.is_active).map(a => a.id)

    const { error } = await supabase
      .from('treasury_alerts')
      .update({
        is_active: false,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: 'current_user',
      })
      .in('id', activeAlertIds)

    if (error) {
      console.error('Error dismissing alerts:', error)
      alert(fr ? 'Erreur lors de la mise à jour' : 'Update error')
      setIsLoading(false)
      return
    }

    await loadAlerts()
    setIsLoading(false)
  }

  const reactivateAlert = async (alertId: string) => {
    setIsLoading(true)

    const { error } = await supabase
      .from('treasury_alerts')
      .update({
        is_active: true,
        acknowledged_at: null,
        acknowledged_by: null,
      })
      .eq('id', alertId)

    if (error) {
      console.error('Error reactivating alert:', error)
      alert(fr ? 'Erreur lors de la réactivation' : 'Reactivation error')
      setIsLoading(false)
      return
    }

    await loadAlerts()
    setIsLoading(false)
  }

  const calculateStats = () => {
    const activeAlerts = alerts.filter(a => a.is_active)
    setStats({
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      warning: activeAlerts.filter(a => a.severity === 'warning').length,
      info: activeAlerts.filter(a => a.severity === 'info').length,
      total: activeAlerts.length,
    })
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">{t('treasury.severityCritical')}</Badge>
      case 'warning':
        return <Badge variant="destructive" className="bg-orange-600">{t('treasury.severityWarning')}</Badge>
      case 'info':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">{t('treasury.severityInfo')}</Badge>
      default:
        return <Badge variant="outline">{fr ? 'Inconnu' : 'Unknown'}</Badge>
    }
  }

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_cash: t('treasury.typeLowCash'),
      critical_cash: t('treasury.typeCriticalCash'),
      negative_projection: t('treasury.typeNegProjection'),
      overdue_payment: t('treasury.typeOverduePayment'),
      low_days_of_cash: t('treasury.typeLowDays'),
      large_outflow: t('treasury.typeLargeOutflow'),
      unreconciled_transactions: t('treasury.typeUnreconciled'),
    }
    return labels[type] || type
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(fr ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">
            {fr ? 'Alertes de Trésorerie' : 'Treasury Alerts'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {fr
              ? 'Surveillez les événements critiques et les risques de liquidité'
              : 'Monitor critical events and liquidity risks'}
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsConfigDialogOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          {t('treasury.configuration')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('treasury.activeAlertsLabel')}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('treasury.criticals')}</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {stats.critical}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('treasury.warnings')}</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats.warning}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('treasury.informations')}</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {stats.info}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Active Alerts Summary */}
      {stats.total > 0 && showActive && (
        <div className="space-y-2">
          {alerts.filter(a => a.is_active && a.severity === 'critical').length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {fr ? 'Alertes Critiques Détectées' : 'Critical Alerts Detected'}
              </AlertTitle>
              <AlertDescription>
                {fr
                  ? `Vous avez ${stats.critical} alerte(s) critique(s) nécessitant une attention immédiate.`
                  : `You have ${stats.critical} critical alert(s) requiring immediate attention.`}
              </AlertDescription>
            </Alert>
          )}

          {alerts.filter(a => a.is_active && a.severity === 'warning').length > 0 && stats.critical === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {fr ? 'Avertissements Actifs' : 'Active Warnings'}
              </AlertTitle>
              <AlertDescription>
                {fr
                  ? `Vous avez ${stats.warning} avertissement(s) nécessitant votre attention.`
                  : `You have ${stats.warning} warning(s) requiring your attention.`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <div>
                <Label>{t('treasury.statusFilter')}</Label>
                <Select value={showActive ? 'active' : 'all'} onValueChange={(value) => setShowActive(value === 'active')}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('treasury.activeOnly')}</SelectItem>
                    <SelectItem value="all">{t('treasury.all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('treasury.severityFilter')}</Label>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="w-40">
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
            </div>

            <div className="flex gap-2 items-end">
              {showActive && stats.total > 0 && (
                <Button variant="outline" onClick={dismissAllAlerts} disabled={isLoading}>
                  <BellOff className="h-4 w-4 mr-2" />
                  {t('treasury.acknowledgeAll')}
                </Button>
              )}
              <Button variant="outline" onClick={loadAlerts}>
                {t('treasury.refresh')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{fr ? 'Sévérité' : 'Severity'}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>{fr ? 'Valeurs' : 'Values'}</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {showActive ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                        <p className="font-medium">{t('treasury.noActiveAlerts')}</p>
                        <p className="text-sm">{t('treasury.goodState')}</p>
                      </div>
                    ) : (
                      t('treasury.noAlertsFound')
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    className={
                      alert.is_active
                        ? alert.severity === 'critical'
                          ? 'bg-red-50'
                          : alert.severity === 'warning'
                          ? 'bg-orange-50'
                          : 'bg-blue-50'
                        : ''
                    }
                  >
                    <TableCell>{getSeverityIcon(alert.severity)}</TableCell>
                    <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{getAlertTypeLabel(alert.alert_type)}</div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">{alert.message}</div>
                    </TableCell>
                    <TableCell>
                      {alert.current_value !== null && alert.current_value !== undefined && (
                        <div className="text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('treasury.currentValue')}:</span>{' '}
                            <span className="font-medium">{formatCurrency(alert.current_value)}</span>
                          </div>
                          {alert.threshold_value !== null && alert.threshold_value !== undefined && (
                            <div>
                              <span className="text-muted-foreground">{t('treasury.thresholdValue')}:</span>{' '}
                              <span className="font-medium">{formatCurrency(alert.threshold_value)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(alert.created_at)}
                    </TableCell>
                    <TableCell>
                      {alert.is_active ? (
                        <Badge variant="default" className="bg-orange-600">
                          <Bell className="h-3 w-3 mr-1" />
                          {t('treasury.statusActive')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('treasury.statusAcknowledged')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {alert.is_active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                          disabled={isLoading}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('treasury.acknowledgeBtn')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => reactivateAlert(alert.id)}
                          disabled={isLoading}
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          {t('treasury.reactivate')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('treasury.configTitle')}</DialogTitle>
            <DialogDescription>
              {fr
                ? 'Définissez les seuils de déclenchement des alertes de trésorerie'
                : 'Set the thresholds for treasury alert triggers'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="low_cash">{t('treasury.lowCashLabel')} (CAD)</Label>
              <Input
                id="low_cash"
                type="number"
                value={config.low_cash_threshold}
                onChange={(e) => setConfig({ ...config, low_cash_threshold: parseFloat(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">
                {fr
                  ? 'Une alerte "Avertissement" sera déclenchée quand la trésorerie descend sous ce montant'
                  : 'A "Warning" alert will trigger when cash drops below this amount'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="critical_cash">{t('treasury.criticalCashLabel')} (CAD)</Label>
              <Input
                id="critical_cash"
                type="number"
                value={config.critical_cash_threshold}
                onChange={(e) => setConfig({ ...config, critical_cash_threshold: parseFloat(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">
                {fr
                  ? 'Une alerte "Critique" sera déclenchée quand la trésorerie descend sous ce montant'
                  : 'A "Critical" alert will trigger when cash drops below this amount'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days_of_cash">{t('treasury.daysThresholdLabel')}</Label>
              <Input
                id="days_of_cash"
                type="number"
                value={config.days_of_cash_warning}
                onChange={(e) => setConfig({ ...config, days_of_cash_warning: parseInt(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">
                {fr
                  ? "Alerte si l'autonomie de trésorerie est inférieure à ce nombre de jours"
                  : 'Alert if cash runway is below this number of days'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overdue">{t('treasury.overdueThresholdLabel')}</Label>
              <Input
                id="overdue"
                type="number"
                value={config.overdue_payment_threshold}
                onChange={(e) => setConfig({ ...config, overdue_payment_threshold: parseFloat(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">
                {fr
                  ? 'Alerte si le montant total des paiements en retard dépasse ce seuil'
                  : 'Alert if total overdue payments exceed this threshold'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projection_months">{t('treasury.projectionLabel')}</Label>
              <Input
                id="projection_months"
                type="number"
                value={config.negative_projection_months}
                onChange={(e) => setConfig({ ...config, negative_projection_months: parseInt(e.target.value) })}
              />
              <p className="text-sm text-muted-foreground">
                {fr
                  ? 'Alerte si une projection de trésorerie négative est détectée dans les X prochains mois'
                  : 'Alert if a negative cash projection is detected within X months'}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {fr
                  ? "Les alertes seront automatiquement générées selon ces seuils lors des mises à jour de trésorerie. Les changements prendront effet immédiatement."
                  : "Alerts will be automatically generated based on these thresholds during treasury updates. Changes take effect immediately."}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              {t('treasury.cancel')}
            </Button>
            <Button onClick={saveConfig}>
              {t('treasury.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
