'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  const supabase = createClientComponentClient()
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
      alert('Veuillez remplir tous les champs obligatoires')
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
      alert('Erreur lors de la sauvegarde')
    } else {
      await loadMilestones()
      setIsDialogOpen(false)
      setEditingMilestone(null)
    }
    setIsLoading(false)
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm('Supprimer ce jalon?')) return
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
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Complété</Badge>
    }
    if (milestone.status === 'missed') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Manqué</Badge>
    }

    const today = new Date()
    const due = new Date(milestone.due_date)
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{Math.abs(daysUntil)}j retard</Badge>
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
          <h1 className="text-3xl font-bold">Suivi des Jalons</h1>
          <p className="text-muted-foreground mt-2">Gérez les jalons critiques de vos projets</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un projet" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()} disabled={!selectedScenario}>
            <Plus className="h-4 w-4 mr-2" />Nouveau Jalon
          </Button>
        </div>
      </div>

      {selectedScenario && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>En cours</CardDescription><CardTitle className="text-2xl text-blue-600">{stats.pending}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>7 prochains jours</CardDescription><CardTitle className="text-2xl text-orange-600">{stats.upcoming}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Complétés</CardDescription><CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Manqués</CardDescription><CardTitle className="text-2xl text-red-600">{stats.missed}</CardTitle></CardHeader></Card>
          </div>

          {stats.upcoming > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Attention:</strong> {stats.upcoming} jalon(s) arrivent à échéance dans les 7 prochains jours.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Jalons du Projet</CardTitle>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En cours</SelectItem>
                    <SelectItem value="at_risk">À risque</SelectItem>
                    <SelectItem value="completed">Complétés</SelectItem>
                    <SelectItem value="missed">Manqués</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Flag className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Aucun jalon trouvé</p>
                  <Button onClick={() => openDialog()} className="mt-4"><Plus className="h-4 w-4 mr-2" />Créer un jalon</Button>
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
                                  Paiement: {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(m.payment_amount || 0)}
                                </Badge>
                              )}
                            </div>
                            {m.description && <p className="text-sm text-muted-foreground mb-2">{m.description}</p>}
                            <div className="flex gap-4 text-sm">
                              <span><strong>Échéance:</strong> {new Date(m.due_date).toLocaleDateString('fr-CA')}</span>
                              {m.responsible_person && <span><strong>Responsable:</strong> {m.responsible_person}</span>}
                              {m.completion_date && <span><strong>Complété:</strong> {new Date(m.completion_date).toLocaleDateString('fr-CA')}</span>}
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
            <DialogTitle>{editingMilestone ? 'Modifier le Jalon' : 'Nouveau Jalon'}</DialogTitle>
            <DialogDescription>Définissez les détails du jalon critique</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom du Jalon *</Label>
                <Input value={formData.milestone_name} onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })} placeholder="Ex: Fin des fondations" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Phase (optionnel)</Label>
                <Select value={formData.phase_id} onValueChange={(v) => setFormData({ ...formData, phase_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Aucune phase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune phase</SelectItem>
                    {phases.map(p => <SelectItem key={p.id} value={p.id}>{p.phase_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date d'Échéance *</Label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Importance</Label>
                <Select value={formData.importance} onValueChange={(v) => setFormData({ ...formData, importance: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critique</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="low">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsable</Label>
                <Input value={formData.responsible_person} onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="payment" checked={formData.is_payment_trigger} onChange={(e) => setFormData({ ...formData, is_payment_trigger: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="payment" className="cursor-pointer">Ce jalon déclenche un paiement</Label>
              </div>
              {formData.is_payment_trigger && (
                <div>
                  <Label>Montant du Paiement (CAD)</Label>
                  <Input type="number" step="0.01" value={formData.payment_amount} onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })} placeholder="0.00" />
                </div>
              )}
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveMilestone} disabled={isLoading}>{editingMilestone ? 'Mettre à Jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
