'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Plus, Edit, Trash2, CheckCircle2, Shield } from 'lucide-react'

interface Risk {
  id: string
  scenario_id: string
  risk_title: string
  description?: string
  category?: string
  probability: string
  impact: string
  risk_score: number
  status: string
  mitigation_strategy?: string
  contingency_plan?: string
  owner?: string
}

export default function RiskRegister() {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'
  const [scenarios, setScenarios] = useState<any[]>([])
  const [selectedScenario, setSelectedScenario] = useState('')
  const [risks, setRisks] = useState<Risk[]>([])
  const [filter, setFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)
  const [formData, setFormData] = useState({
    risk_title: '', description: '', category: 'financial', probability: 'medium',
    impact: 'medium', mitigation_strategy: '', contingency_plan: '', owner: ''
  })

  const probImpactOptions = [
    { value: 'very_low', label: fr ? 'Très faible' : 'Very low', color: 'bg-green-100 text-green-800' },
    { value: 'low', label: fr ? 'Faible' : 'Low', color: 'bg-blue-100 text-blue-800' },
    { value: 'medium', label: fr ? 'Moyen' : 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: fr ? 'Élevé' : 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'very_high', label: fr ? 'Très élevé' : 'Very high', color: 'bg-red-100 text-red-800' }
  ]

  const categories = [
    'financial', 'technical', 'legal', 'environmental', 'market', 'operational', 'regulatory', 'other'
  ]

  useEffect(() => {
    loadScenarios()
  }, [])

  useEffect(() => {
    if (selectedScenario) loadRisks()
  }, [selectedScenario, filter])

  const loadScenarios = async () => {
    const { data } = await supabase.from('scenarios').select('id, name').eq('status', 'purchased').order('name')
    setScenarios(data || [])
    if (data && data.length > 0 && !selectedScenario) setSelectedScenario(data[0].id)
  }

  const loadRisks = async () => {
    setIsLoading(true)
    let query = supabase.from('project_risks').select('*').eq('scenario_id', selectedScenario).order('risk_score', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setRisks(data || [])
    setIsLoading(false)
  }

  const openDialog = (risk?: Risk) => {
    if (risk) {
      setEditingRisk(risk)
      setFormData({
        risk_title: risk.risk_title, description: risk.description || '', category: risk.category || 'financial',
        probability: risk.probability, impact: risk.impact, mitigation_strategy: risk.mitigation_strategy || '',
        contingency_plan: risk.contingency_plan || '', owner: risk.owner || ''
      })
    } else {
      setEditingRisk(null)
      setFormData({
        risk_title: '', description: '', category: 'financial', probability: 'medium',
        impact: 'medium', mitigation_strategy: '', contingency_plan: '', owner: ''
      })
    }
    setIsDialogOpen(true)
  }

  const saveRisk = async () => {
    if (!formData.risk_title) {
      alert(fr ? 'Veuillez remplir le titre du risque' : 'Please fill in the risk title')
      return
    }
    setIsLoading(true)
    const data = { scenario_id: selectedScenario, status: 'identified', ...formData }
    const { error } = editingRisk
      ? await supabase.from('project_risks').update(data).eq('id', editingRisk.id)
      : await supabase.from('project_risks').insert(data)

    if (error) {
      console.error(error)
      alert(fr ? 'Erreur lors de la sauvegarde' : 'Error saving')
    } else {
      await loadRisks()
      setIsDialogOpen(false)
    }
    setIsLoading(false)
  }

  const deleteRisk = async (id: string) => {
    if (!confirm(fr ? 'Supprimer ce risque?' : 'Delete this risk?')) return
    setIsLoading(true)
    await supabase.from('project_risks').delete().eq('id', id)
    await loadRisks()
    setIsLoading(false)
  }

  const closeRisk = async (id: string) => {
    setIsLoading(true)
    await supabase.from('project_risks').update({ status: 'closed', closure_date: new Date().toISOString().split('T')[0] }).eq('id', id)
    await loadRisks()
    setIsLoading(false)
  }

  const getRiskLevel = (score: number) => {
    if (score >= 20) return { label: fr ? 'Critique' : 'Critical', color: 'bg-red-600 text-white' }
    if (score >= 15) return { label: fr ? 'Élevé' : 'High', color: 'bg-orange-600 text-white' }
    if (score >= 9) return { label: fr ? 'Moyen' : 'Medium', color: 'bg-yellow-600 text-white' }
    return { label: fr ? 'Faible' : 'Low', color: 'bg-green-600 text-white' }
  }

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.risk_score >= 20).length,
    high: risks.filter(r => r.risk_score >= 15 && r.risk_score < 20).length,
    medium: risks.filter(r => r.risk_score >= 9 && r.risk_score < 15).length,
    low: risks.filter(r => r.risk_score < 9).length,
    active: risks.filter(r => r.status !== 'closed').length
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{fr ? 'Registre des Risques' : 'Risk Register'}</h1>
          <p className="text-muted-foreground mt-2">{fr ? 'Identifiez et gérez les risques du projet' : 'Identify and manage project risks'}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-64"><SelectValue placeholder={fr ? 'Sélectionner un projet' : 'Select a project'} /></SelectTrigger>
            <SelectContent>
              {scenarios.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()} disabled={!selectedScenario}><Plus className="h-4 w-4 mr-2" />{fr ? 'Nouveau Risque' : 'New Risk'}</Button>
        </div>
      </div>

      {selectedScenario && (
        <>
          <div className="grid gap-4 md:grid-cols-6">
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Total Risques' : 'Total Risks'}</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Actifs' : 'Active'}</CardDescription><CardTitle className="text-2xl text-blue-600">{stats.active}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Critiques' : 'Critical'}</CardDescription><CardTitle className="text-2xl text-red-600">{stats.critical}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Élevés' : 'High'}</CardDescription><CardTitle className="text-2xl text-orange-600">{stats.high}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Moyens' : 'Medium'}</CardDescription><CardTitle className="text-2xl text-yellow-600">{stats.medium}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Faibles' : 'Low'}</CardDescription><CardTitle className="text-2xl text-green-600">{stats.low}</CardTitle></CardHeader></Card>
          </div>

          {stats.critical > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{fr ? <><strong>Attention :</strong> {stats.critical} risque(s) critique(s) identifié(s). Action immédiate requise.</> : <><strong>Warning:</strong> {stats.critical} critical risk(s) identified. Immediate action required.</>}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{fr ? 'Risques Identifiés' : 'Identified Risks'}</CardTitle>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
                    <SelectItem value="identified">{fr ? 'Identifiés' : 'Identified'}</SelectItem>
                    <SelectItem value="analyzing">{fr ? 'Analyse' : 'Analyzing'}</SelectItem>
                    <SelectItem value="mitigating">{fr ? 'Mitigation' : 'Mitigating'}</SelectItem>
                    <SelectItem value="monitoring">{fr ? 'Surveillance' : 'Monitoring'}</SelectItem>
                    <SelectItem value="closed">{fr ? 'Clôturés' : 'Closed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {risks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>{fr ? 'Aucun risque identifié' : 'No risks identified'}</p>
                  <Button onClick={() => openDialog()} className="mt-4"><Plus className="h-4 w-4 mr-2" />{fr ? 'Identifier un risque' : 'Identify a risk'}</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {risks.map(r => {
                    const level = getRiskLevel(r.risk_score)
                    return (
                      <Card key={r.id} className={r.risk_score >= 15 ? 'border-red-200 bg-red-50' : ''}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{r.risk_title}</h3>
                                <Badge className={level.color}>{level.label}</Badge>
                                <Badge variant="outline">Score: {r.risk_score}</Badge>
                                <Badge>{probImpactOptions.find(p => p.value === r.probability)?.label} {fr ? 'probabilité' : 'probability'}</Badge>
                                <Badge>{probImpactOptions.find(p => p.value === r.impact)?.label} {fr ? 'impact' : 'impact'}</Badge>
                              </div>
                              {r.description && <p className="text-sm text-muted-foreground mb-2">{r.description}</p>}
                              {r.mitigation_strategy && (
                                <div className="text-sm mb-2">
                                  <strong>{fr ? 'Stratégie' : 'Strategy'}:</strong> {r.mitigation_strategy}
                                </div>
                              )}
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                {r.category && <span><strong>{fr ? 'Catégorie' : 'Category'}:</strong> {r.category}</span>}
                                {r.owner && <span><strong>{fr ? 'Responsable' : 'Owner'}:</strong> {r.owner}</span>}
                                <span><strong>{fr ? 'Statut' : 'Status'}:</strong> {r.status}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              {r.status !== 'closed' && (
                                <Button size="sm" variant="outline" className="text-green-600" onClick={() => closeRisk(r.id)} disabled={isLoading}>
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => openDialog(r)} disabled={isLoading}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteRisk(r.id)} disabled={isLoading}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRisk ? (fr ? 'Modifier le Risque' : 'Edit Risk') : (fr ? 'Nouveau Risque' : 'New Risk')}</DialogTitle>
            <DialogDescription>{fr ? 'Identifiez et évaluez le risque' : 'Identify and assess the risk'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{fr ? 'Titre du Risque *' : 'Risk Title *'}</Label>
                <Input value={formData.risk_title} onChange={(e) => setFormData({ ...formData, risk_title: e.target.value })} placeholder={fr ? 'Ex: Dépassement de budget' : 'E.g.: Budget overrun'} />
              </div>
              <div className="col-span-2">
                <Label>{fr ? 'Description' : 'Description'}</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>{fr ? 'Catégorie' : 'Category'}</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? 'Responsable' : 'Owner'}</Label>
                <Input value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Probabilité' : 'Probability'}</Label>
                <Select value={formData.probability} onValueChange={(v) => setFormData({ ...formData, probability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {probImpactOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? 'Impact' : 'Impact'}</Label>
                <Select value={formData.impact} onValueChange={(v) => setFormData({ ...formData, impact: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {probImpactOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>{fr ? 'Stratégie de Mitigation' : 'Mitigation Strategy'}</Label>
                <Textarea value={formData.mitigation_strategy} onChange={(e) => setFormData({ ...formData, mitigation_strategy: e.target.value })} rows={2} />
              </div>
              <div className="col-span-2">
                <Label>{fr ? 'Plan de Contingence' : 'Contingency Plan'}</Label>
                <Textarea value={formData.contingency_plan} onChange={(e) => setFormData({ ...formData, contingency_plan: e.target.value })} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
            <Button onClick={saveRisk} disabled={isLoading}>{editingRisk ? (fr ? 'Mettre à Jour' : 'Update') : (fr ? 'Créer' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
