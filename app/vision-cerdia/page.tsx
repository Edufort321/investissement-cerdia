'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { MapPin, Rocket, Brain, ShoppingCart, Coins, PieChart, TrendingUp, Target } from 'lucide-react'

export default function VisionCerdia() {
  const { t } = useLanguage()

  const sections = [
    {
      icon: MapPin,
      titleKey: 'vision.currentTitle',
      textKey: 'vision.currentText',
      color: 'bg-blue-100 text-blue-600',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: Rocket,
      titleKey: 'vision.objective2045Title',
      textKey: 'vision.objective2045Text',
      color: 'bg-purple-100 text-purple-600',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: Brain,
      titleKey: 'vision.aiTitle',
      textKey: 'vision.aiText',
      color: 'bg-indigo-100 text-indigo-600',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: ShoppingCart,
      titleKey: 'vision.ecommerceTitle',
      textKey: 'vision.ecommerceText',
      color: 'bg-green-100 text-green-600',
      gradient: 'from-green-500 to-green-600'
    },
    {
      icon: Coins,
      titleKey: 'vision.tokenTitle',
      textKey: 'vision.tokenText',
      color: 'bg-yellow-100 text-yellow-600',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: PieChart,
      titleKey: 'vision.taxTitle',
      textKey: 'vision.taxText',
      color: 'bg-red-100 text-red-600',
      gradient: 'from-red-500 to-red-600'
    },
    {
      icon: TrendingUp,
      titleKey: 'vision.projectionsTitle',
      textKey: 'vision.projectionsText',
      color: 'bg-cyan-100 text-cyan-600',
      gradient: 'from-cyan-500 to-cyan-600'
    }
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium mb-6">
            <Target size={16} />
            <span>Plan stratégique 2025-2045</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t('vision.title')}
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t('vision.intro')}
          </p>
        </div>

        {/* Timeline with Cards */}
        <div className="space-y-8 mb-16">
          {sections.map((section, index) => {
            const Icon = section.icon
            return (
              <div
                key={index}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Timeline indicator */}
                <div className="absolute -left-4 top-8 hidden md:flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full bg-gray-700 dark:bg-gray-600 flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {index + 1}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shadow-md`}>
                    <Icon size={32} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      {t(section.titleKey)}
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                      {t(section.textKey)}
                    </p>
                  </div>
                </div>

                {/* Hover gradient border effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gray-500 dark:bg-gray-600 opacity-0 group-hover:opacity-10 transition-opacity -z-10`}></div>
              </div>
            )
          })}
        </div>

        {/* Footer Quote */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-700 dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center border border-gray-600 dark:border-gray-700">
            <div className="text-white/90 text-lg md:text-xl font-medium leading-relaxed mb-4">
              "{t('vision.footer')}"
            </div>
            <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
              <Target size={16} />
              <span>CERDIA Leadership Team</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-4xl font-bold text-gray-700 dark:text-gray-300 mb-2">2025</div>
            <div className="text-gray-600 dark:text-gray-400">Année de lancement</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-4xl font-bold text-gray-700 dark:text-gray-300 mb-2">2045</div>
            <div className="text-gray-600 dark:text-gray-400">Objectif final</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-4xl font-bold text-gray-700 dark:text-gray-300 mb-2">20</div>
            <div className="text-gray-600 dark:text-gray-400">Années de croissance</div>
          </div>
        </div>
      </div>
    </main>
  )
}
