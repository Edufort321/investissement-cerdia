'use client'

import { useState } from 'react'
import { Book, ChevronDown, ChevronUp, Search, Home, Users, DollarSign, FileText, Settings, Calculator, Calendar, Briefcase, Wallet, TrendingUp, ClipboardList } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface GuideSection {
  id: string
  titleKey: string
  icon: any
  content: {
    subtitleKey: string
    descriptionKey: string
    stepKeys?: string[]
  }[]
}

export default function UserGuide() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard')

  const guideSections: GuideSection[] = [
    {
      id: 'dashboard',
      titleKey: 'userGuide.dashboard',
      icon: Home,
      content: [
        {
          subtitleKey: 'userGuide.dashboardOverview',
          descriptionKey: 'userGuide.dashboardOverviewDesc',
          stepKeys: [
            'userGuide.dashboardStep1',
            'userGuide.dashboardStep2',
            'userGuide.dashboardStep3',
            'userGuide.dashboardStep4'
          ]
        },
        {
          subtitleKey: 'userGuide.exchangeRate',
          descriptionKey: 'userGuide.exchangeRateDesc',
        },
        {
          subtitleKey: 'userGuide.properties',
          descriptionKey: 'userGuide.propertiesDesc',
        }
      ]
    },
    {
      id: 'projet',
      titleKey: 'userGuide.projectManagement',
      icon: Briefcase,
      content: [
        {
          subtitleKey: 'userGuide.projectOverview',
          descriptionKey: 'userGuide.projectOverviewDesc',
        },
        {
          subtitleKey: 'userGuide.createProject',
          descriptionKey: 'userGuide.createProjectDesc',
          stepKeys: [
            'userGuide.createProjectStep1',
            'userGuide.createProjectStep2',
            'userGuide.createProjectStep3',
            'userGuide.createProjectStep4'
          ]
        },
        {
          subtitleKey: 'userGuide.milestones',
          descriptionKey: 'userGuide.milestonesDesc',
        },
        {
          subtitleKey: 'userGuide.risks',
          descriptionKey: 'userGuide.risksDesc',
        },
        {
          subtitleKey: 'userGuide.contractors',
          descriptionKey: 'userGuide.contractorsDesc',
        }
      ]
    },
    {
      id: 'evaluateur',
      titleKey: 'userGuide.evaluator',
      icon: Calculator,
      content: [
        {
          subtitleKey: 'userGuide.scenarioCreation',
          descriptionKey: 'userGuide.scenarioCreationDesc',
          stepKeys: [
            'userGuide.scenarioStep1',
            'userGuide.scenarioStep2',
            'userGuide.scenarioStep3',
            'userGuide.scenarioStep4',
            'userGuide.scenarioStep5'
          ]
        },
        {
          subtitleKey: 'userGuide.scenarioTypes',
          descriptionKey: 'userGuide.scenarioTypesDesc',
        },
        {
          subtitleKey: 'userGuide.documents',
          descriptionKey: 'userGuide.documentsDesc',
        },
        {
          subtitleKey: 'userGuide.vote',
          descriptionKey: 'userGuide.voteDesc',
        },
        {
          subtitleKey: 'userGuide.reservationsAfterPurchase',
          descriptionKey: 'userGuide.reservationsAfterPurchaseDesc',
        }
      ]
    },
    {
      id: 'reservations',
      titleKey: 'userGuide.reservations',
      icon: Calendar,
      content: [
        {
          subtitleKey: 'userGuide.calendarView',
          descriptionKey: 'userGuide.calendarViewDesc',
        },
        {
          subtitleKey: 'userGuide.createReservation',
          descriptionKey: 'userGuide.createReservationDesc',
        },
        {
          subtitleKey: 'userGuide.management',
          descriptionKey: 'userGuide.managementDesc',
        }
      ]
    },
    {
      id: 'administration',
      titleKey: 'userGuide.administration',
      icon: Settings,
      content: [
        {
          subtitleKey: 'userGuide.investors',
          descriptionKey: 'userGuide.investorsDesc',
          stepKeys: [
            'userGuide.investorsStep1',
            'userGuide.investorsStep2',
            'userGuide.investorsStep3'
          ]
        },
        {
          subtitleKey: 'userGuide.transactions',
          descriptionKey: 'userGuide.transactionsDesc',
          stepKeys: [
            'userGuide.transactionsStep1',
            'userGuide.transactionsStep2',
            'userGuide.transactionsStep3'
          ]
        },
        {
          subtitleKey: 'userGuide.capex',
          descriptionKey: 'userGuide.capexDesc',
        },
        {
          subtitleKey: 'userGuide.rdDividends',
          descriptionKey: 'userGuide.rdDividendsDesc',
        },
        {
          subtitleKey: 'userGuide.taxReports',
          descriptionKey: 'userGuide.taxReportsDesc',
        },
        {
          subtitleKey: 'userGuide.roiPerformance',
          descriptionKey: 'userGuide.roiPerformanceDesc',
        },
        {
          subtitleKey: 'userGuide.syncRevenue',
          descriptionKey: 'userGuide.syncRevenueDesc',
        }
      ]
    },
    {
      id: 'tresorerie',
      titleKey: 'userGuide.treasury',
      icon: Wallet,
      content: [
        {
          subtitleKey: 'userGuide.treasuryOverview',
          descriptionKey: 'userGuide.treasuryOverviewDesc',
        },
        {
          subtitleKey: 'userGuide.cashFlowForecasts',
          descriptionKey: 'userGuide.cashFlowForecastsDesc',
        },
        {
          subtitleKey: 'userGuide.bankReconciliation',
          descriptionKey: 'userGuide.bankReconciliationDesc',
        },
        {
          subtitleKey: 'userGuide.paymentSchedule',
          descriptionKey: 'userGuide.paymentScheduleDesc',
        },
        {
          subtitleKey: 'userGuide.alerts',
          descriptionKey: 'userGuide.alertsDesc',
        }
      ]
    },
    {
      id: 'gestion_projet',
      titleKey: 'userGuide.projectManagementAdmin',
      icon: ClipboardList,
      content: [
        {
          subtitleKey: 'userGuide.adminAccess',
          descriptionKey: 'userGuide.adminAccessDesc',
        },
        {
          subtitleKey: 'userGuide.timeline',
          descriptionKey: 'userGuide.timelineDesc',
        },
        {
          subtitleKey: 'userGuide.resources',
          descriptionKey: 'userGuide.resourcesDesc',
        }
      ]
    },
    {
      id: 'budgetisation',
      titleKey: 'userGuide.budgeting',
      icon: DollarSign,
      content: [
        {
          subtitleKey: 'userGuide.budgetCreation',
          descriptionKey: 'userGuide.budgetCreationDesc',
          stepKeys: [
            'userGuide.budgetStep1',
            'userGuide.budgetStep2',
            'userGuide.budgetStep3',
            'userGuide.budgetStep4'
          ]
        },
        {
          subtitleKey: 'userGuide.consumptionTracking',
          descriptionKey: 'userGuide.consumptionTrackingDesc',
        },
        {
          subtitleKey: 'userGuide.varianceAnalysis',
          descriptionKey: 'userGuide.varianceAnalysisDesc',
        },
        {
          subtitleKey: 'userGuide.approval',
          descriptionKey: 'userGuide.approvalDesc',
        }
      ]
    },
    {
      id: 'mode_emploi',
      titleKey: 'userGuide.userManual',
      icon: Book,
      content: [
        {
          subtitleKey: 'userGuide.interactiveGuide',
          descriptionKey: 'userGuide.interactiveGuideDesc',
        }
      ]
    },
    {
      id: 'bloc_notes',
      titleKey: 'userGuide.notepad',
      icon: FileText,
      content: [
        {
          subtitleKey: 'userGuide.todoLists',
          descriptionKey: 'userGuide.todoListsDesc',
          stepKeys: [
            'userGuide.todoStep1',
            'userGuide.todoStep2',
            'userGuide.todoStep3',
            'userGuide.todoStep4'
          ]
        },
        {
          subtitleKey: 'userGuide.notes',
          descriptionKey: 'userGuide.notesDesc',
        }
      ]
    }
  ]

  const filteredSections = guideSections.filter(section =>
    t(section.titleKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(c =>
      t(c.subtitleKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
      t(c.descriptionKey).toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Book className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('userGuide.title')}</h1>
            <p className="text-gray-600">{t('userGuide.subtitle')}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('userGuide.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => {
          const Icon = section.icon
          const isExpanded = expandedSection === section.id

          return (
            <div key={section.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="text-blue-600" size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{t(section.titleKey)}</h2>
                </div>
                {isExpanded ? (
                  <ChevronUp className="text-gray-400" size={24} />
                ) : (
                  <ChevronDown className="text-gray-400" size={24} />
                )}
              </button>

              {isExpanded && (
                <div className="p-6 pt-0 space-y-6 border-t border-gray-100">
                  {section.content.map((item, index) => (
                    <div key={index} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800">{t(item.subtitleKey)}</h3>
                      <p className="text-gray-600 leading-relaxed">{t(item.descriptionKey)}</p>
                      {item.stepKeys && (
                        <ul className="space-y-2 mt-3">
                          {item.stepKeys.map((stepKey, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                                {stepIndex + 1}
                              </span>
                              <span className="text-gray-700">{t(stepKey)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">{t('userGuide.noResults')} "{searchTerm}"</p>
        </div>
      )}
    </div>
  )
}
