'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Edit, BarChart3, Bell } from 'lucide-react'
import BudgetOverview from './BudgetOverview'
import BudgetEditor from './BudgetEditor'
import VarianceAnalysis from './VarianceAnalysis'
import BudgetAlerts from './BudgetAlerts'

export default function BudgetDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Budgétisation & Contrôle</h1>
        <p className="text-muted-foreground mt-2">
          Système complet de gestion budgétaire avec analyse de variance et alertes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Éditeur
          </TabsTrigger>
          <TabsTrigger value="variance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Variance
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BudgetOverview />
        </TabsContent>

        <TabsContent value="editor">
          <BudgetEditor />
        </TabsContent>

        <TabsContent value="variance">
          <VarianceAnalysis />
        </TabsContent>

        <TabsContent value="alerts">
          <BudgetAlerts />
        </TabsContent>
      </Tabs>
    </div>
  )
}
