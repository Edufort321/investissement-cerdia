'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

function ErrorFallbackUI({ error, errorInfo, onReset }: {
  error: Error | null
  errorInfo: ErrorInfo | null
  onReset: () => void
}) {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
            <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          {fr ? "Oups! Une erreur s'est produite" : 'Oops! Something went wrong'}
        </h1>

        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          {fr
            ? "Nous sommes désolés, quelque chose s'est mal passé. Notre équipe a été notifiée et travaille sur le problème."
            : 'We apologize — something went wrong. Our team has been notified and is working on the issue.'}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
              {fr ? "Détails de l'erreur (dev only):" : 'Error details (dev only):'}
            </h3>
            <pre className="text-sm text-red-800 dark:text-red-300 overflow-auto max-h-60">
              {error.toString()}
              {errorInfo && `\n\n${errorInfo.componentStack}`}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <RefreshCw size={20} />
            {fr ? 'Réessayer' : 'Try again'}
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
          >
            <Home size={20} />
            {fr ? "Retour à l'accueil" : 'Back to home'}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {fr ? "Besoin d'aide?" : 'Need help?'}{' '}
            <a href="mailto:support@cerdia-invest.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              {fr ? 'Contactez le support' : 'Contact support'}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function SectionFallbackUI({ sectionName, onReload }: { sectionName: string; onReload: () => void }) {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h3 className="font-semibold text-red-900 dark:text-red-200">
          {fr ? `Erreur dans ${sectionName}` : `Error in ${sectionName}`}
        </h3>
      </div>
      <p className="text-sm text-red-800 dark:text-red-300">
        {fr
          ? 'Cette section a rencontré une erreur. Veuillez rafraîchir la page ou contacter le support si le problème persiste.'
          : 'This section encountered an error. Please refresh the page or contact support if the problem persists.'}
      </p>
      <button
        onClick={onReload}
        className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <RefreshCw size={16} />
        {fr ? 'Rafraîchir la page' : 'Refresh page'}
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      )
    }
    return this.props.children
  }
}

export function SectionErrorBoundary({ children, sectionName }: { children: ReactNode; sectionName: string }) {
  return (
    <ErrorBoundary
      fallback={<SectionFallbackUI sectionName={sectionName} onReload={() => window.location.reload()} />}
    >
      {children}
    </ErrorBoundary>
  )
}
