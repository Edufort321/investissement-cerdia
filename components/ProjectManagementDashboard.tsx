'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Calendar, Flag, Shield, Users, TrendingUp } from 'lucide-react'
import ProjectTimeline from './ProjectTimeline'
import MilestoneTracker from './MilestoneTracker'
import RiskRegister from './RiskRegister'
import ContractorManagement from './ContractorManagement'
import ProgressReporting from './ProgressReporting'

export default function ProjectManagementDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion de Projet</h1>
        <p className="text-muted-foreground mt-2">
          Système complet de suivi et gestion de vos projets immobiliers
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Jalons
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risques
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Entrepreneurs
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
