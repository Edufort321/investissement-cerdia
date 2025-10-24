'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary caught error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    // TODO: Envoyer à service de monitoring (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   sendErrorToMonitoring(error, errorInfo)
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Fallback personnalisé fourni par le parent
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Fallback par défaut
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            {/* Icône d'erreur */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Titre */}
            <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
              Oups! Une erreur s'est produite
            </h1>

            {/* Description */}
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
              Nous sommes désolés, quelque chose s'est mal passé. Notre équipe a été notifiée et travaille sur le problème.
            </p>

            {/* Détails de l'erreur (en développement) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                  Détails de l'erreur (dev only):
                </h3>
                <pre className="text-sm text-red-800 dark:text-red-300 overflow-auto max-h-60">
                  {this.state.error.toString()}
                  {this.state.errorInfo && `\n\n${this.state.errorInfo.componentStack}`}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Bouton Réessayer */}
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <RefreshCw size={20} />
                Réessayer
              </button>

              {/* Bouton Retour à l'accueil */}
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
              >
                <Home size={20} />
                Retour à l'accueil
              </button>
            </div>

            {/* Support */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Besoin d'aide?{' '}
                <a
                  href="mailto:support@cerdia-invest.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Contactez le support
                </a>
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// =====================================================
// Error Boundary spécialisé pour sections
// =====================================================

export function SectionErrorBoundary({
  children,
  sectionName
}: {
  children: ReactNode
  sectionName: string
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-200">
              Erreur dans {sectionName}
            </h3>
          </div>
          <p className="text-sm text-red-800 dark:text-red-300">
            Cette section a rencontré une erreur. Veuillez rafraîchir la page ou contacter le support si le problème persiste.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={16} />
            Rafraîchir la page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
