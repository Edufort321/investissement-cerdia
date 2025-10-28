'use client'

import React, { useState } from 'react'
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Receipt,
  Share2,
  TrendingUp,
  Plus,
  Home,
  Map,
  Menu,
  X,
  DollarSign,
  Edit2
} from 'lucide-react'

export type VoyageView = 'dashboard' | 'timeline' | 'checklist' | 'expenses' | 'share' | 'budget' | 'map'

interface VoyageSidebarProps {
  currentView: VoyageView
  onViewChange: (view: VoyageView) => void
  onNewTrip: () => void
  tripTitle: string
  language?: string
  isOpen?: boolean
  onToggle?: () => void
  budget?: number
  totalSpent?: number
  devise?: string
  onEditBudget?: () => void
}

export default function VoyageSidebar({
  currentView,
  onViewChange,
  onNewTrip,
  tripTitle,
  language = 'fr',
  isOpen = true,
  onToggle,
  budget,
  totalSpent = 0,
  devise = 'CAD',
  onEditBudget
}: VoyageSidebarProps) {
  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'sidebar.dashboard': { fr: 'Tableau de bord', en: 'Dashboard' },
      'sidebar.timeline': { fr: 'Timeline', en: 'Timeline' },
      'sidebar.checklist': { fr: 'Checklist', en: 'Checklist' },
      'sidebar.expenses': { fr: 'Dépenses', en: 'Expenses' },
      'sidebar.share': { fr: 'Partager', en: 'Share' },
      'sidebar.budget': { fr: 'Budget', en: 'Budget' },
      'sidebar.map': { fr: 'Carte', en: 'Map' },
      'sidebar.newTrip': { fr: 'Nouveau Voyage', en: 'New Trip' },
      'sidebar.myTrips': { fr: 'Mes Voyages', en: 'My Trips' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const menuItems: Array<{ id: VoyageView; icon: any; label: string }> = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard') },
    { id: 'timeline', icon: Calendar, label: t('sidebar.timeline') },
    { id: 'map', icon: Map, label: t('sidebar.map') },
    { id: 'checklist', icon: CheckSquare, label: t('sidebar.checklist') },
    { id: 'expenses', icon: Receipt, label: t('sidebar.expenses') },
    { id: 'share', icon: Share2, label: t('sidebar.share') },
    { id: 'budget', icon: TrendingUp, label: t('sidebar.budget') }
  ]

  const handleNavClick = (view: VoyageView) => {
    onViewChange(view)
    // Fermer le menu sur mobile après sélection
    if (window.innerWidth < 1024 && onToggle) {
      onToggle()
    }
  }

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static top-32 lg:top-0 left-0 bottom-0 z-40
          w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          flex flex-col shadow-lg lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Home className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                {tripTitle}
              </h2>
            </div>
            {/* Close button sur mobile */}
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <button
            onClick={onNewTrip}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t('sidebar.newTrip')}
          </button>
        </div>

        {/* Budget Section */}
        {budget !== undefined && (
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-y border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                  Budget
                </span>
              </div>
              {onEditBudget && (
                <button
                  onClick={onEditBudget}
                  className="p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded transition"
                >
                  <Edit2 className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Total:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {budget.toFixed(2)} {devise}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Dépensé:</span>
                <span className={`font-semibold ${totalSpent > budget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {totalSpent.toFixed(2)} {devise}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${totalSpent > budget ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-right text-gray-600 dark:text-gray-400 mt-1">
                {((totalSpent / budget) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all
                  ${isActive
                    ? 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
