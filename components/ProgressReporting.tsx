'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Calendar, DollarSign, Target, Activity } from 'lucide-react'

interface ProjectProgress {
  scenario_id: string
  scenario_name: string
  total_phases: number
  completed_phases: number
  active_phases: number
  delayed_phases: number
  overall_progress: number
  total_budget: number
  total_spent: number
  budget_utilization: number
  total_milestones: number
  completed_milestones: number
  missed_milestones: number
  active_risks: number
  high_risks: number
  total_assignments: number
  total_contract_value: number
  total_paid_to_contractors: number
}

export default function ProgressReporting() {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'
  const [projects, setProjects] = useState<ProjectProgress[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [projectDetails, setProjectDetails] = useState<ProjectProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      const project = projects.find(p => p.scenario_id === selectedProject)
      setProjectDetails(project || null)
    }
  }, [selectedProject, projects])

  const loadProjects = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .order('scenario_name')

    if (error) {
      console.error('Error loading projects:', error)
      setIsLoading(false)
      return
    }

    setProjects(data || [])
    if (data && data.length > 0 && !selectedProject) {
      setSelectedProject(data[0].scenario_id)
    }
    setIsLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(amount || 0)
  }

  const getHealthScore = () => {
    if (!projectDetails) return { score: 0, level: 'unknown', color: 'bg-gray-500' }

    let score = 100

    // Pénalités
    if (projectDetails.delayed_phases > 0) score -= projectDetails.delayed_phases * 10
    if (projectDetails.missed_milestones > 0) score -= projectDetails.missed_milestones * 15
    if (projectDetails.budget_utilization > 100) score -= (projectDetails.budget_utilization - 100) * 0.5
    if (projectDetails.high_risks > 0) score -= projectDetails.high_risks * 5

    // Bonus
    if (projectDetails.overall_progress >= 90) score += 10
    if (projectDetails.missed_milestones === 0) score += 5

    score = Math.max(0, Math.min(100, score))

    let level = fr ? 'excellent' : 'excellent'
    let color = 'bg-green-600'
    if (score < 80) { level = fr ? 'bon' : 'good'; color = 'bg-blue-600' }
    if (score < 60) { level = fr ? 'attention' : 'warning'; color = 'bg-yellow-600' }
    if (score < 40) { level = fr ? 'critique' : 'critical'; color = 'bg-red-600' }

    return { score: Math.round(score), level, color }
  }

  const health = getHealthScore()

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{fr ? "Rapport d'Avancement" : 'Progress Report'}</h1>
          <p className="text-muted-foreground mt-2">{fr ? 'Vue d\'ensemble de la progression des projets' : 'Overview of project progress'}</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={fr ? 'Sélectionner un projet' : 'Select a project'} />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.scenario_id} value={p.scenario_id}>
                {p.scenario_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {projectDetails && (
        <>
          {/* Health Score */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">{fr ? 'Score de Santé du Projet' : 'Project Health Score'}</CardTitle>
                  <CardDescription>{fr ? "Indicateur global basé sur l'avancement, budget, risques et jalons" : 'Global indicator based on progress, budget, risks and milestones'}</CardDescription>
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

          {/* KPIs Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{fr ? 'Progression Globale' : 'Overall Progress'}</CardDescription>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{projectDetails.overall_progress}%</div>
                <Progress value={projectDetails.overall_progress} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {projectDetails.completed_phases}/{projectDetails.total_phases} {fr ? 'phases complétées' : 'phases completed'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{fr ? 'Utilisation Budget' : 'Budget Usage'}</CardDescription>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${projectDetails.budget_utilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  {projectDetails.budget_utilization}%
                </div>
                <Progress value={Math.min(projectDetails.budget_utilization, 100)} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {formatCurrency(projectDetails.total_spent)} / {formatCurrency(projectDetails.total_budget)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{fr ? 'Jalons Critiques' : 'Critical Milestones'}</CardDescription>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {projectDetails.completed_milestones}/{projectDetails.total_milestones}
                </div>
                {projectDetails.missed_milestones > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {projectDetails.missed_milestones} {fr ? 'manqué(s)' : 'missed'}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.round((projectDetails.completed_milestones / projectDetails.total_milestones) * 100 || 0)}% {fr ? 'complétés' : 'completed'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{fr ? 'Risques Actifs' : 'Active Risks'}</CardDescription>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${projectDetails.high_risks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {projectDetails.active_risks}
                </div>
                {projectDetails.high_risks > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {projectDetails.high_risks} {fr ? 'élevé(s)' : 'high'}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {fr ? 'Surveillance active requise' : 'Active monitoring required'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div className="grid gap-4 md:grid-cols-2">
            {projectDetails.delayed_phases > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg">{fr ? 'Phases en Retard' : 'Delayed Phases'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {fr
                      ? <><strong>{projectDetails.delayed_phases}</strong> phase(s) en retard sur le calendrier prévu. Action corrective recommandée.</>
                      : <><strong>{projectDetails.delayed_phases}</strong> phase(s) behind schedule. Corrective action recommended.</>}
                  </p>
                </CardContent>
              </Card>
            )}

            {projectDetails.budget_utilization > 90 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg">{fr ? 'Budget sous Surveillance' : 'Budget Under Watch'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {fr
                      ? <>Utilisation budget : <strong>{projectDetails.budget_utilization}%</strong>.{projectDetails.budget_utilization > 100 ? ' Dépassement budgétaire détecté.' : ' Approche de la limite budgétaire.'}</>
                      : <>Budget usage: <strong>{projectDetails.budget_utilization}%</strong>.{projectDetails.budget_utilization > 100 ? ' Budget overrun detected.' : ' Approaching budget limit.'}</>}
                  </p>
                </CardContent>
              </Card>
            )}

            {projectDetails.missed_milestones > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg">{fr ? 'Jalons Manqués' : 'Missed Milestones'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {fr
                      ? <><strong>{projectDetails.missed_milestones}</strong> jalon(s) critique(s) manqué(s). Impact potentiel sur le calendrier global.</>
                      : <><strong>{projectDetails.missed_milestones}</strong> critical milestone(s) missed. Potential impact on overall schedule.</>}
                  </p>
                </CardContent>
              </Card>
            )}

            {projectDetails.high_risks > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg">{fr ? 'Risques Élevés' : 'High Risks'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {fr
                      ? <><strong>{projectDetails.high_risks}</strong> risque(s) élevé(s) identifié(s). Plans de mitigation requis.</>
                      : <><strong>{projectDetails.high_risks}</strong> high risk(s) identified. Mitigation plans required.</>}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Detailed Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{fr ? 'Détails des Phases' : 'Phase Details'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'Total Phases' : 'Total Phases'}</span>
                    <Badge variant="outline">{projectDetails.total_phases}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'Complétées' : 'Completed'}</span>
                    <Badge className="bg-green-600">{projectDetails.completed_phases}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'En Cours' : 'Active'}</span>
                    <Badge className="bg-blue-600">{projectDetails.active_phases}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'En Retard' : 'Delayed'}</span>
                    <Badge className="bg-red-600">{projectDetails.delayed_phases}</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">{fr ? 'Progression Moyenne' : 'Average Progress'}</span>
                    <span className="text-lg font-bold">{projectDetails.overall_progress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{fr ? 'Entrepreneurs & Contrats' : 'Contractors & Contracts'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'Total Affectations' : 'Total Assignments'}</span>
                    <Badge variant="outline">{projectDetails.total_assignments}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'Valeur Totale Contrats' : 'Total Contract Value'}</span>
                    <span className="text-sm font-bold">{formatCurrency(projectDetails.total_contract_value)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{fr ? 'Montant Payé' : 'Amount Paid'}</span>
                    <span className="text-sm font-bold">{formatCurrency(projectDetails.total_paid_to_contractors)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">{fr ? 'Taux de Paiement' : 'Payment Rate'}</span>
                    <span className="text-lg font-bold">
                      {Math.round((projectDetails.total_paid_to_contractors / projectDetails.total_contract_value) * 100 || 0)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Success Indicators */}
          {health.score >= 80 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg text-green-900">{fr ? 'Projet en Bonne Santé' : 'Project in Good Health'}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-900">
                  {fr
                    ? 'Le projet progresse selon les attentes. Continuez la surveillance des indicateurs clés et maintenez la communication avec les parties prenantes.'
                    : 'The project is progressing as expected. Continue monitoring key indicators and maintain communication with stakeholders.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Recommendations */}
          {health.score < 60 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg text-red-900">{fr ? 'Actions Recommandées' : 'Recommended Actions'}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-sm text-red-900">
                  {projectDetails.delayed_phases > 0 && (
                    <li>{fr ? 'Réviser le calendrier et identifier les goulots d\'étranglement' : 'Review schedule and identify bottlenecks'}</li>
                  )}
                  {projectDetails.budget_utilization > 100 && (
                    <li>{fr ? 'Analyser les dépassements budgétaires et obtenir des fonds supplémentaires' : 'Analyze budget overruns and secure additional funds'}</li>
                  )}
                  {projectDetails.missed_milestones > 0 && (
                    <li>{fr ? 'Replanifier les jalons manqués et ajuster les dépendances' : 'Reschedule missed milestones and adjust dependencies'}</li>
                  )}
                  {projectDetails.high_risks > 0 && (
                    <li>{fr ? 'Activer les plans de mitigation pour les risques élevés' : 'Activate mitigation plans for high risks'}</li>
                  )}
                  <li>{fr ? 'Organiser une réunion de revue de projet avec toutes les parties prenantes' : 'Organize a project review meeting with all stakeholders'}</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!projectDetails && !isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>{fr ? "Sélectionnez un projet pour voir le rapport d'avancement" : 'Select a project to view the progress report'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
