'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Calendar, Flag, Shield, Users, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import ProjectTimeline from './ProjectTimeline'
import MilestoneTracker from './MilestoneTracker'
import RiskRegister from './RiskRegister'
import ContractorManagement from './ContractorManagement'
import ProgressReporting from './ProgressReporting'

export default function ProjectManagementDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{fr ? 'Gestion de Projet' : 'Project Management'}</h1>
        <p className="text-muted-foreground mt-2">
          {fr ? 'Système complet de suivi et gestion de vos projets immobiliers' : 'Complete tracking and management system for your real estate projects'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{fr ? "Vue d'ensemble" : 'Overview'}</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <Flag className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{fr ? 'Jalons' : 'Milestones'}</span>
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{fr ? 'Risques' : 'Risks'}</span>
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex items-center justify-center gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{fr ? 'Entrepreneurs' : 'Contractors'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProgressReporting />
        </TabsContent>

        <TabsContent value="timeline">
          <ProjectTimeline />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestoneTracker />
        </TabsContent>

        <TabsContent value="risks">
          <RiskRegister />
        </TabsContent>

        <TabsContent value="contractors">
          <ContractorManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
