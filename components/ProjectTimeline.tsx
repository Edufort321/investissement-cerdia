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
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
} from 'lucide-react'

interface ProjectPhase {
  id: string
  scenario_id: string
  phase_name: string
  description?: string
  planned_start_date: string
  planned_end_date: string
  actual_start_date?: string
  actual_end_date?: string
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'on_hold' | 'cancelled'
  progress_percentage: number
  budget_allocated?: number
  budget_spent: number
  responsible_person?: string
  dependencies?: string[]
  critical_path: boolean
  notes?: string
  created_at: string
}

interface Scenario {
  id: string
  name: string
}

interface FormData {
  phase_name: string
  description: string
  planned_start_date: string
  planned_end_date: string
  status: string
  progress_percentage: string
  budget_allocated: string
  responsible_person: string
  critical_path: boolean
  notes: string
}

export default function ProjectTimeline() {
  const supabase = createClientComponentClient()

  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<string>('')
  const [phases, setPhases] = useState<ProjectPhase[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null)
  const [formData, setFormData] = useState<FormData>({
    phase_name: '',
    description: '',
    planned_start_date: '',
    planned_end_date: '',
    status: 'not_started',
    progress_percentage: '0',
    budget_allocated: '',
    responsible_person: '',
    critical_path: false,
    notes: '',
  })

  const statusOptions = [
    { value: 'not_started', label: 'Non démarré', color: 'bg-gray-100 text-gray-800' },
    { value: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Complété', color: 'bg-green-100 text-green-800' },
    { value: 'delayed', label: 'En retard', color: 'bg-red-100 text-red-800' },
    { value: 'on_hold', label: 'En pause', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'cancelled', label: 'Annulé', color: 'bg-gray-300 text-gray-700' },
  ]

  useEffect(() => {
    loadScenarios()
  }, [])

  useEffect(() => {
    if (selectedScenario) {
      loadPhases()
    }
  }, [selectedScenario])

  const loadScenarios = async () => {
    const { data, error } = await supabase
      .from('scenarios')
      .select('id, name')
      .eq('status', 'purchased')
      .order('name')

    if (error) {
      console.error('Error loading scenarios:', error)
      return
    }

    setScenarios(data || [])
    if (data && data.length > 0 && !selectedScenario) {
      setSelectedScenario(data[0].id)
    }
  }

  const loadPhases = async () => {
    if (!selectedScenario) return

    setIsLoading(true)

    const { data, error } = await supabase
      .from('project_phases')
      .select('*')
      .eq('scenario_id', selectedScenario)
      .order('planned_start_date')

    if (error) {
      console.error('Error loading phases:', error)
      setIsLoading(false)
      return
    }

    setPhases(data || [])
    setIsLoading(false)
  }

  const openDialog = (phase?: ProjectPhase) => {
    if (phase) {
      setEditingPhase(phase)
      setFormData({
        phase_name: phase.phase_name,
        description: phase.description || '',
        planned_start_date: phase.planned_start_date,
        planned_end_date: phase.planned_end_date,
        status: phase.status,
        progress_percentage: phase.progress_percentage.toString(),
        budget_allocated: phase.budget_allocated?.toString() || '',
        responsible_person: phase.responsible_person || '',
        critical_path: phase.critical_path,
        notes: phase.notes || '',
      })
    } else {
      setEditingPhase(null)
      setFormData({
        phase_name: '',
        description: '',
        planned_start_date: '',
        planned_end_date: '',
        status: 'not_started',
        progress_percentage: '0',
        budget_allocated: '',
        responsible_person: '',
        critical_path: false,
        notes: '',
      })
    }
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingPhase(null)
  }

  const savePhase = async () => {
    if (!formData.phase_name || !formData.planned_start_date || !formData.planned_end_date) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsLoading(true)

    const phaseData = {
      scenario_id: selectedScenario,
      phase_name: formData.phase_name,
      description: formData.description,
      planned_start_date: formData.planned_start_date,
      planned_end_date: formData.planned_end_date,
      status: formData.status,
      progress_percentage: parseInt(formData.progress_percentage),
      budget_allocated: formData.budget_allocated ? parseFloat(formData.budget_allocated) : null,
      responsible_person: formData.responsible_person,
      critical_path: formData.critical_path,
      notes: formData.notes,
    }

    let error

    if (editingPhase) {
      const result = await supabase
        .from('project_phases')
        .update(phaseData)
        .eq('id', editingPhase.id)

      error = result.error
    } else {
      const result = await supabase
        .from('project_phases')
        .insert(phaseData)

      error = result.error
    }

    if (error) {
      console.error('Error saving phase:', error)
      alert('Erreur lors de la sauvegarde')
      setIsLoading(false)
      return
    }

    await loadPhases()
    closeDialog()
    setIsLoading(false)
  }

  const deletePhase = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette phase?')) {
      return
    }

    setIsLoading(true)

    const { error } = await supabase
      .from('project_phases')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting phase:', error)
      alert('Erreur lors de la suppression')
      setIsLoading(false)
      return
    }

    await loadPhases()
    setIsLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <Play className="h-4 w-4" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'delayed':
        return <AlertTriangle className="h-4 w-4" />
      case 'on_hold':
        return <Pause className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status)
    return (
      <Badge variant="outline" className={option?.color}>
        {getStatusIcon(status)}
        <span className="ml-1">{option?.label || status}</span>
      </Badge>
    )
  }

  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDaysRemaining = (endDate: string): number => {
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculateStats = () => {
    const total = phases.length
    const completed = phases.filter(p => p.status === 'completed').length
    const inProgress = phases.filter(p => p.status === 'in_progress').length
    const delayed = phases.filter(p => p.status === 'delayed').length
    const totalBudget = phases.reduce((sum, p) => sum + (p.budget_allocated || 0), 0)
    const totalSpent = phases.reduce((sum, p) => sum + p.budget_spent, 0)
    const avgProgress = phases.length > 0
      ? Math.round(phases.reduce((sum, p) => sum + p.progress_percentage, 0) / phases.length)
      : 0

    return { total, completed, inProgress, delayed, totalBudget, totalSpent, avgProgress }
  }

  const stats = calculateStats()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Timeline de Projet</h1>
          <p className="text-muted-foreground mt-2">
            Visualisez et gérez les phases de vos projets
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedScenario} onValueChange={setSelectedScenario}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sélectionner un projet" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(scenario => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openDialog()} disabled={!selectedScenario}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Phase
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {selectedScenario && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Phases</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Complétées</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>En cours</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>En retard</CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.delayed}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Progression Moy.</CardDescription>
              <CardTitle className="text-2xl">{stats.avgProgress}%</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Budget Utilisé</CardDescription>
              <CardTitle className="text-xl">
                {stats.totalBudget > 0
                  ? Math.round((stats.totalSpent / stats.totalBudget) * 100)
                  : 0}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Timeline Table */}
      <Card>
        <CardHeader>
          <CardTitle>Phases du Projet</CardTitle>
          <CardDescription>
            {selectedScenario
              ? `${stats.total} phase(s) · Budget total: ${formatCurrency(stats.totalBudget)} · Dépensé: ${formatCurrency(stats.totalSpent)}`
              : 'Sélectionnez un projet pour voir ses phases'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedScenario ? (
            <div className="text-center py-8 text-muted-foreground">
              Veuillez sélectionner un projet
            </div>
          ) : phases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Aucune phase créée pour ce projet</p>
              <Button onClick={() => openDialog()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer la première phase
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Progression</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map((phase) => {
                  const duration = calculateDuration(phase.planned_start_date, phase.planned_end_date)
                  const daysRemaining = getDaysRemaining(phase.planned_end_date)
                  const budgetUsage = phase.budget_allocated
                    ? Math.round((phase.budget_spent / phase.budget_allocated) * 100)
                    : 0

                  return (
                    <TableRow key={phase.id} className={phase.critical_path ? 'bg-orange-50' : ''}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {phase.phase_name}
                            {phase.critical_path && (
                              <Badge variant="destructive" className="text-xs">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Critique
                              </Badge>
                            )}
                          </div>
                          {phase.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {phase.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{formatDate(phase.planned_start_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">→</span>
                          <span>{formatDate(phase.planned_end_date)}</span>
                        </div>
                        {phase.status !== 'completed' && daysRemaining < 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {Math.abs(daysRemaining)}j de retard
                          </div>
                        )}
                        {phase.status !== 'completed' && daysRemaining >= 0 && daysRemaining <= 7 && (
                          <div className="text-xs text-orange-600 mt-1">
                            {daysRemaining}j restants
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{duration}</span> jours
                      </TableCell>
                      <TableCell>{getStatusBadge(phase.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{phase.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                phase.progress_percentage === 100
                                  ? 'bg-green-600'
                                  : phase.progress_percentage >= 50
                                  ? 'bg-blue-600'
                                  : 'bg-orange-600'
                              }`}
                              style={{ width: `${phase.progress_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {phase.budget_allocated ? (
                          <div className="text-sm">
                            <div className="font-medium">{formatCurrency(phase.budget_spent)}</div>
                            <div className="text-muted-foreground">
                              / {formatCurrency(phase.budget_allocated)}
                            </div>
                            <div className={`text-xs mt-1 ${budgetUsage > 100 ? 'text-red-600' : 'text-gray-600'}`}>
                              {budgetUsage}% utilisé
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {phase.responsible_person || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(phase)}
                            disabled={isLoading}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => deletePhase(phase.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Phase Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPhase ? 'Modifier la Phase' : 'Nouvelle Phase'}
            </DialogTitle>
            <DialogDescription>
              Définissez les détails de la phase du projet
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="phase_name">Nom de la Phase *</Label>
                <Input
                  id="phase_name"
                  value={formData.phase_name}
                  onChange={(e) => setFormData({ ...formData, phase_name: e.target.value })}
                  placeholder="Ex: Fondations"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails de la phase..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="start_date">Date de Début *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.planned_start_date}
                  onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="end_date">Date de Fin *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.planned_end_date}
                  onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="progress">Progression (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress_percentage}
                  onChange={(e) => setFormData({ ...formData, progress_percentage: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="budget">Budget Alloué (CAD)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget_allocated}
                  onChange={(e) => setFormData({ ...formData, budget_allocated: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="responsible">Responsable</Label>
                <Input
                  id="responsible"
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Nom du responsable"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="critical_path"
                  checked={formData.critical_path}
                  onChange={(e) => setFormData({ ...formData, critical_path: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="critical_path" className="cursor-pointer">
                  Phase critique (sur le chemin critique du projet)
                </Label>
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes supplémentaires..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button onClick={savePhase} disabled={isLoading}>
              {editingPhase ? 'Mettre à Jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
