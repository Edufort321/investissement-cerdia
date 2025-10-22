'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrendingUp, Shield, Users, ArrowRight, Clock, DollarSign } from 'lucide-react'

export default function PageInvestir() {
  const { t } = useLanguage()

  const features = [
    {
      icon: DollarSign,
      titleKey: 'invest.minInvest',
      value: '25,000 $',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Clock,
      titleKey: 'invest.commitment',
      value: `5 ${t('invest.years')}`,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: TrendingUp,
      titleKey: 'invest.returns',
      value: '10-15%',
      color: 'bg-green-100 text-green-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium mb-6">
            <Shield size={16} />
            <span>Programme d'investissement exclusif</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {t('invest.title')}
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            {t('invest.intro')}
          </p>
        </div>

        {/* Features Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg ${feature.color} dark:bg-gray-700 dark:text-gray-300 flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{feature.value}</p>
              </div>
            )
          })}
        </div>

        {/* Images Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="relative group overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/secret-garden.jpg"
              alt="Secret Garden"
              width={800}
              height={500}
              className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white font-semibold text-xl">Secret Garden</h3>
              <p className="text-white/90 text-sm">République Dominicaine</p>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/oasis-bay.jpg"
              alt="Oasis Bay"
              width={800}
              height={500}
              className="w-full h-80 object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white font-semibold text-xl">Oasis Bay</h3>
              <p className="text-white/90 text-sm">République Dominicaine</p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 border border-gray-200 dark:border-gray-700 mb-12">
            <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-semibold">
                    1
                  </div>
                </div>
                <p className="text-lg">{t('invest.p1')}</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-semibold">
                    2
                  </div>
                </div>
                <p className="text-lg">{t('invest.p2')}</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center font-semibold">
                    3
                  </div>
                </div>
                <p className="text-lg">{t('invest.p3')}</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <Link
              href="/investir/candidature"
              className="inline-flex items-center gap-3 bg-gray-700 dark:bg-gray-600 text-white px-8 py-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
            >
              <Users size={24} />
              {t('invest.button')}
              <ArrowRight size={20} />
            </Link>

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Processus de sélection rigoureux • Opportunités limitées
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
