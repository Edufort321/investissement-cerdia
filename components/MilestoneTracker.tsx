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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Flag,
  DollarSign,
} from 'lucide-react'

interface Milestone {
  id: string
  scenario_id: string
  phase_id?: string
  milestone_name: string
  description?: string
  due_date: string
  completion_date?: string
  status: 'pending' | 'completed' | 'missed' | 'at_risk'
  importance: 'critical' | 'high' | 'medium' | 'low'
  deliverables?: string[]
  responsible_person?: string
  is_payment_trigger: boolean
  payment_amount?: number
  notes?: string
}

interface Scenario {
  id: string
  name: string
}

interface ProjectPhase {
  id: string
  phase_name: string
}

export default function MilestoneTracker() {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string>('')
  const [phases, setPhases] = useState<ProjectPhase[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [formData, setFormData] = useState({
    milestone_name: '',
    description: '',
    phase_id: '',
    due_date: '',
    importance: 'medium',
    responsible_person: '',
    is_payment_trigger: false,
    payment_amount: '',
    notes: '',
  })

  useEffect(() => {
    loadScenarios()
  }, [])

  useEffect(() => {
    if (selectedScenario) {
      loadMilestones()
      loadPhases()
    }
  }, [selectedScenario, filter])

  const loadScenarios = async () => {
    const { data } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('status', 'purchased')
      .order('name')

    setScenarios(data || [])
    if (data && data.length > 0 && !selectedScenario) {
      setSelectedScenario(data[0].id)
    }
  }

  const loadPhases = async () => {
    const { data } = await supabase
      .from('project_phases')
      .select('id, phase_name')
      .eq('scenario_id', selectedScenario)
      .order('planned_start_date')

    setPhases(data || [])
  }

  const loadMilestones = async () => {
    setIsLoading(true)
    let query = supabase
      .from('project_milestones')
      .select('*')
      .eq('scenario_id', selectedScenario)
      .order('due_date')

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setMilestones(data || [])
    setIsLoading(false)
  }

  const openDialog = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone)
      setFormData({
        milestone_name: milestone.milestone_name,
        description: milestone.description || '',
        phase_id: milestone.phase_id || '',
        due_date: milestone.due_date,
        importance: milestone.importance,
        responsible_person: milestone.responsible_person || '',
        is_payment_trigger: milestone.is_payment_trigger,
        payment_amount: milestone.payment_amount?.toString() || '',
        notes: milestone.notes || '',
      })
    } else {
      setEditingMilestone(null)
      setFormData({
        milestone_name: '',
        description: '',
        phase_id: '',
        due_date: '',
        importance: 'medium',
        responsible_person: '',
        is_payment_trigger: false,
        payment_amount: '',
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const saveMilestone = async () => {
    if (!formData.milestone_name || !formData.due_date) {
      alert(fr ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill in all required fields')
      return
    }

    setIsLoading(true)
    const data = {
      scenario_id: selectedScenario,
      ...formData,
      phase_id: formData.phase_id || null,
      payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : null,
    }

    const { error } = editingMilestone
      ? await supabase.from('project_milestones').update(data).eq('id', editingMilestone.id)
      : await supabase.from('project_milestones').insert(data)

    if (error) {
      console.error('Error saving milestone:', error)
      alert(fr ? 'Erreur lors de la sauvegarde' : 'Error saving')
    } else {
      await loadMilestones()
      setIsDialogOpen(false)
      setEditingMilestone(null)
    }
    setIsLoading(false)
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm(fr ? 'Supprimer ce jalon?' : 'Delete this milestone?')) return
    setIsLoading(true)
    await supabase.from('project_milestones').delete().eq('id', id)
    await loadMilestones()
    setIsLoading(false)
  }

  const markCompleted = async (id: string) => {
    setIsLoading(true)
    await supabase
      .from('project_milestones')
      .update({ status: 'completed', completion_date: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    await loadMilestones()
    setIsLoading(false)
  }

  const getUrgencyBadge = (milestone: Milestone) => {
    if (milestone.status === 'completed') {
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />{fr ? 'Complété' : 'Completed'}</Badge>
    }
    if (milestone.status === 'missed') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{fr ? 'Manqué' : 'Missed'}</Badge>
    }

    const today = new Date()
    const due = new Date(milestone.due_date)
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{Math.abs(daysUntil)}{fr ? 'j retard' : 'd late'}</Badge>
    }
    if (daysUntil <= 3) {
      return <Badge variant="destructive" className="bg-orange-600"><Clock className="h-3 w-3 mr-1" />{daysUntil}j</Badge>
    }
    if (daysUntil <= 7) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />{daysUntil}j</Badge>
    }
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{daysUntil}j</Badge>
  }

  const getImportanceBadge = (importance: string) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-600 text-white',
      medium: 'bg-blue-600 text-white',
      low: 'bg-gray-600 text-white',
    }
    return <Badge className={colors[importance as keyof typeof colors] || colors.medium}><Flag className="h-3 w-3 mr-1" />{importance}</Badge>
  }

  const stats = {
    total: milestones.length,
    pending: milestones.filter(m => m.status === 'pending').length,
    completed: milestones.filter(m => m.status === 'completed').length,
    missed: milestones.filter(m => m.status === 'missed').length,
    upcoming: milestones.filter(m => {
      if (m.status !== 'pending') return false
      const days = Math.ceil((new Date(m.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return days >= 0 && days <= 7
    }).length,
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{fr ? 'Suivi des Jalons' : 'Milestone Tracker'}</h1>
          <p className="text-muted-foreground mt-2">{fr ? 'Gérez les jalons critiques de vos projets' : 'Manage critical project milestones'}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={fr ? 'Sélectionner un projet' : 'Select a project'} />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()} disabled={!selectedScenario}>
            <Plus className="h-4 w-4 mr-2" />{fr ? 'Nouveau Jalon' : 'New Milestone'}
          </Button>
        </div>
      </div>

      {selectedScenario && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'En cours' : 'Pending'}</CardDescription><CardTitle className="text-2xl text-blue-600">{stats.pending}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? '7 prochains jours' : 'Next 7 days'}</CardDescription><CardTitle className="text-2xl text-orange-600">{stats.upcoming}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Complétés' : 'Completed'}</CardDescription><CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Manqués' : 'Missed'}</CardDescription><CardTitle className="text-2xl text-red-600">{stats.missed}</CardTitle></CardHeader></Card>
          </div>

          {stats.upcoming > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {fr
                  ? <><strong>Attention :</strong> {stats.upcoming} jalon(s) arrivent à échéance dans les 7 prochains jours.</>
                  : <><strong>Warning:</strong> {stats.upcoming} milestone(s) due in the next 7 days.</>}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{fr ? 'Jalons du Projet' : 'Project Milestones'}</CardTitle>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
                    <SelectItem value="pending">{fr ? 'En cours' : 'Pending'}</SelectItem>
                    <SelectItem value="at_risk">{fr ? 'À risque' : 'At risk'}</SelectItem>
                    <SelectItem value="completed">{fr ? 'Complétés' : 'Completed'}</SelectItem>
                    <SelectItem value="missed">{fr ? 'Manqués' : 'Missed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Flag className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>{fr ? 'Aucun jalon trouvé' : 'No milestones found'}</p>
                  <Button onClick={() => openDialog()} className="mt-4"><Plus className="h-4 w-4 mr-2" />{fr ? 'Créer un jalon' : 'Create milestone'}</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m) => (
                    <Card key={m.id} className={m.status === 'missed' || m.status === 'at_risk' ? 'border-red-200 bg-red-50' : ''}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{m.milestone_name}</h3>
                              {getImportanceBadge(m.importance)}
                              {getUrgencyBadge(m)}
                              {m.is_payment_trigger && (
                                <Badge variant="outline" className="bg-green-50">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {fr ? 'Paiement' : 'Payment'}: {new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(m.payment_amount || 0)}
                                </Badge>
                              )}
                            </div>
                            {m.description && <p className="text-sm text-muted-foreground mb-2">{m.description}</p>}
                            <div className="flex gap-4 text-sm">
                              <span><strong>{fr ? 'Échéance' : 'Due'}:</strong> {new Date(m.due_date).toLocaleDateString(locale)}</span>
                              {m.responsible_person && <span><strong>{fr ? 'Responsable' : 'Owner'}:</strong> {m.responsible_person}</span>}
                              {m.completion_date && <span><strong>{fr ? 'Complété' : 'Completed'}:</strong> {new Date(m.completion_date).toLocaleDateString(locale)}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {m.status !== 'completed' && (
                              <Button size="sm" variant="outline" className="text-green-600" onClick={() => markCompleted(m.id)} disabled={isLoading}>
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openDialog(m)} disabled={isLoading}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteMilestone(m.id)} disabled={isLoading}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMilestone ? (fr ? 'Modifier le Jalon' : 'Edit Milestone') : (fr ? 'Nouveau Jalon' : 'New Milestone')}</DialogTitle>
            <DialogDescription>{fr ? 'Définissez les détails du jalon critique' : 'Define the critical milestone details'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>{fr ? 'Nom du Jalon *' : 'Milestone Name *'}</Label>
                <Input value={formData.milestone_name} onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })} placeholder={fr ? 'Ex: Fin des fondations' : 'E.g.: Foundation completion'} />
              </div>
              <div className="col-span-2">
                <Label>{fr ? 'Description' : 'Description'}</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>{fr ? 'Phase (optionnel)' : 'Phase (optional)'}</Label>
                <Select value={formData.phase_id} onValueChange={(v) => setFormData({ ...formData, phase_id: v })}>
                  <SelectTrigger><SelectValue placeholder={fr ? 'Aucune phase' : 'No phase'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{fr ? 'Aucune phase' : 'No phase'}</SelectItem>
                    {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.phase_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? "Date d'Échéance *" : 'Due Date *'}</Label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Importance' : 'Importance'}</Label>
                <Select value={formData.importance} onValueChange={(v) => setFormData({ ...formData, importance: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">{fr ? 'Critique' : 'Critical'}</SelectItem>
                    <SelectItem value="high">{fr ? 'Élevée' : 'High'}</SelectItem>
                    <SelectItem value="medium">{fr ? 'Moyenne' : 'Medium'}</SelectItem>
                    <SelectItem value="low">{fr ? 'Basse' : 'Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{fr ? 'Responsable' : 'Owner'}</Label>
                <Input value={formData.responsible_person} onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="payment" checked={formData.is_payment_trigger} onChange={(e) => setFormData({ ...formData, is_payment_trigger: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="payment" className="cursor-pointer">{fr ? 'Ce jalon déclenche un paiement' : 'This milestone triggers a payment'}</Label>
              </div>
              {formData.is_payment_trigger && (
                <div>
                  <Label>{fr ? 'Montant du Paiement (CAD)' : 'Payment Amount (CAD)'}</Label>
                  <Input type="number" step="0.01" value={formData.payment_amount} onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })} placeholder="0.00" />
                </div>
              )}
              <div className="col-span-2">
                <Label>{fr ? 'Notes' : 'Notes'}</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
            <Button onClick={saveMilestone} disabled={isLoading}>{editingMilestone ? (fr ? 'Mettre à Jour' : 'Update') : (fr ? 'Créer' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
