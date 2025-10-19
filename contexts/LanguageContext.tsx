'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'fr' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.projects': 'Projets',
    'nav.administration': 'Administration',
    'nav.logout': 'Déconnexion',

    // Dashboard
    'dashboard.title': 'Tableau de bord',
    'dashboard.welcome': 'Bienvenue',
    'dashboard.totalInvested': 'Total investi',
    'dashboard.currentValue': 'Valeur actuelle',
    'dashboard.totalROI': 'ROI total',
    'dashboard.activeProjects': 'Projets actifs',
    'dashboard.monthlyRevenue': 'Revenus mensuels',
    'dashboard.recentTransactions': 'Transactions récentes',
    'dashboard.viewAll': 'Voir tout',
    'dashboard.noTransactions': 'Aucune transaction récente',

    // Projects
    'projects.title': 'Gestion des Projets',
    'projects.subtitle': 'Gérez vos propriétés immobilières',
    'projects.add': 'Ajouter un projet',
    'projects.cancel': 'Annuler',
    'projects.new': 'Nouveau projet',
    'projects.edit': 'Modifier le projet',
    'projects.name': 'Nom du projet',
    'projects.location': 'Localisation',
    'projects.status': 'Statut',
    'projects.totalCost': 'Coût total',
    'projects.paidAmount': 'Montant payé',
    'projects.reservationDate': 'Date de réservation',
    'projects.expectedROI': 'ROI attendu',
    'projects.currency': 'Devise',
    'projects.paymentScheduleType': 'Type de paiement',
    'projects.reservationDeposit': 'Acompte de réservation',
    'projects.save': 'Enregistrer',
    'projects.delete': 'Supprimer',
    'projects.confirmDelete': 'Êtes-vous sûr de vouloir supprimer ce projet',
    'projects.noProjects': 'Aucun projet',
    'projects.addFirst': 'Commencez par ajouter votre premier projet',

    // Administration
    'admin.title': 'Administration',
    'admin.investors': 'Investisseurs',
    'admin.transactions': 'Transactions',
    'admin.currentAccount': 'Compte Courant 2025',
    'admin.capex': 'CAPEX 2025',
    'admin.rd': 'R&D / Dividendes',

    // Investors
    'investors.title': 'Gestion des Investisseurs',
    'investors.subtitle': 'Gérez les investisseurs et leurs documents',
    'investors.add': 'Ajouter un investisseur',
    'investors.new': 'Nouvel investisseur',
    'investors.edit': 'Modifier l\'investisseur',
    'investors.firstName': 'Prénom',
    'investors.lastName': 'Nom',
    'investors.email': 'Email',
    'investors.phone': 'Téléphone',
    'investors.username': 'Nom d\'utilisateur',
    'investors.shareClass': 'Classe de parts',
    'investors.totalShares': 'Total parts',
    'investors.shareValue': 'Valeur par part',
    'investors.totalInvested': 'Total investi',
    'investors.percentOwnership': '% de propriété',
    'investors.investmentType': 'Type d\'investissement',
    'investors.joinDate': 'Date d\'adhésion',
    'investors.accessLevel': 'Niveau d\'accès',
    'investors.permissions': 'Permissions',
    'investors.documents': 'Documents',
    'investors.currentValue': 'Valeur actuelle',
    'investors.shares': 'Parts',
    'investors.ownership': 'Propriété',
    'investors.memberSince': 'Membre depuis',
    'investors.noInvestors': 'Aucun investisseur',
    'investors.addFirstInvestor': 'Commencez par ajouter votre premier investisseur',

    // Transactions
    'transactions.title': 'Transactions',
    'transactions.new': 'Nouvelle transaction',
    'transactions.edit': 'Modifier la transaction',
    'transactions.date': 'Date',
    'transactions.type': 'Type',
    'transactions.amount': 'Montant',
    'transactions.description': 'Description',
    'transactions.category': 'Catégorie',
    'transactions.paymentMethod': 'Méthode de paiement',
    'transactions.referenceNumber': 'Numéro de référence',
    'transactions.status': 'Statut',
    'transactions.investor': 'Investisseur',
    'transactions.property': 'Propriété',
    'transactions.none': 'Aucune',
    'transactions.noTransactions': 'Aucune transaction',
    'transactions.addFirst': 'Commencez par ajouter votre première transaction',
    'transactions.totalIn': 'Entrées',
    'transactions.totalOut': 'Sorties',
    'transactions.balance': 'Solde',
    'transactions.filter': 'Filtrer',
    'transactions.allTypes': 'Tous les types',
    'transactions.allCategories': 'Toutes les catégories',
    'transactions.noMatch': 'Aucune transaction ne correspond aux filtres sélectionnés',

    // Transaction Types
    'transactionType.investment': 'Investissement',
    'transactionType.payment': 'Paiement',
    'transactionType.dividend': 'Dividende',
    'transactionType.expense': 'Dépense',

    // Categories
    'category.capital': 'Capital',
    'category.operation': 'Opération',
    'category.maintenance': 'Maintenance',
    'category.admin': 'Administration',

    // Status
    'status.active': 'Actif',
    'status.inactive': 'Inactif',
    'status.suspended': 'Suspendu',
    'status.complete': 'Complété',
    'status.pending': 'En attente',
    'status.cancelled': 'Annulé',
    'status.reservation': 'Réservation',
    'status.construction': 'Construction',
    'status.completed': 'Complété',
    'status.rented': 'Loué',

    // Payment Methods
    'paymentMethod.transfer': 'Virement',
    'paymentMethod.check': 'Chèque',
    'paymentMethod.cash': 'Espèces',
    'paymentMethod.card': 'Carte',

    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.add': 'Ajouter',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.loading': 'Chargement...',
    'common.saving': 'Enregistrement...',
    'common.actions': 'Actions',
    'common.download': 'Télécharger',
    'common.upload': 'Télécharger',
    'common.viewDetails': 'Voir les détails',
    'common.close': 'Fermer',
    'common.confirm': 'Confirmer',
    'common.yes': 'Oui',
    'common.no': 'Non',

    // Documents
    'documents.title': 'Documents',
    'documents.upload': 'Cliquez pour télécharger un document',
    'documents.uploading': 'Téléchargement en cours...',
    'documents.noDocuments': 'Aucun document pour cet investisseur',
    'documents.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer ce document ?',

    // Current Account
    'currentAccount.title': 'Compte Courant',
    'currentAccount.subtitle': 'Vue agrégée des transactions par catégorie',
    'currentAccount.totalRevenues': 'Total Revenus',
    'currentAccount.operationalCosts': 'Coûts Opération',
    'currentAccount.projectExpenses': 'Dépenses Projet',
    'currentAccount.netIncome': 'Revenu Net',
    'currentAccount.revenueDetails': 'Détails Revenus',
    'currentAccount.operationDetails': 'Détails Coûts Opération',
    'currentAccount.projectDetails': 'Détails Dépenses Projet',
    'currentAccount.rentalIncome': 'Revenus locatifs',
    'currentAccount.otherIncome': 'Autres revenus',
    'currentAccount.managementFees': 'Frais gestion',
    'currentAccount.utilities': 'Services publics',
    'currentAccount.insurance': 'Assurances',
    'currentAccount.maintenance': 'Maintenance',
    'currentAccount.propertyTaxes': 'Taxes foncières',
    'currentAccount.renovations': 'Rénovations',
    'currentAccount.furnishing': 'Ameublement',
    'currentAccount.otherProjects': 'Autres projets',
    'currentAccount.byProject': 'Détails par Projet',
    'currentAccount.noData': 'Aucune donnée',
    'currentAccount.noTransactionsFor': 'Aucune transaction pour',

    // Months
    'month.january': 'Janvier',
    'month.february': 'Février',
    'month.march': 'Mars',
    'month.april': 'Avril',
    'month.may': 'Mai',
    'month.june': 'Juin',
    'month.july': 'Juillet',
    'month.august': 'Août',
    'month.september': 'Septembre',
    'month.october': 'Octobre',
    'month.november': 'Novembre',
    'month.december': 'Décembre',

    // Investment Types
    'investmentType.capital': 'Capital',
    'investmentType.debt': 'Dette',
    'investmentType.mixed': 'Mixte',

    // Access Levels
    'accessLevel.investor': 'Investisseur',
    'accessLevel.admin': 'Administrateur',

    // Errors & Messages
    'error.generic': 'Une erreur est survenue',
    'error.loadingFailed': 'Échec du chargement des données',
    'error.saveFailed': 'Échec de l\'enregistrement',
    'error.deleteFailed': 'Échec de la suppression',
    'success.saved': 'Enregistré avec succès',
    'success.deleted': 'Supprimé avec succès',
    'success.uploaded': 'Téléchargé avec succès',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.administration': 'Administration',
    'nav.logout': 'Logout',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.totalInvested': 'Total Invested',
    'dashboard.currentValue': 'Current Value',
    'dashboard.totalROI': 'Total ROI',
    'dashboard.activeProjects': 'Active Projects',
    'dashboard.monthlyRevenue': 'Monthly Revenue',
    'dashboard.recentTransactions': 'Recent Transactions',
    'dashboard.viewAll': 'View All',
    'dashboard.noTransactions': 'No recent transactions',

    // Projects
    'projects.title': 'Project Management',
    'projects.subtitle': 'Manage your real estate properties',
    'projects.add': 'Add Project',
    'projects.cancel': 'Cancel',
    'projects.new': 'New Project',
    'projects.edit': 'Edit Project',
    'projects.name': 'Project Name',
    'projects.location': 'Location',
    'projects.status': 'Status',
    'projects.totalCost': 'Total Cost',
    'projects.paidAmount': 'Amount Paid',
    'projects.reservationDate': 'Reservation Date',
    'projects.expectedROI': 'Expected ROI',
    'projects.currency': 'Currency',
    'projects.paymentScheduleType': 'Payment Type',
    'projects.reservationDeposit': 'Reservation Deposit',
    'projects.save': 'Save',
    'projects.delete': 'Delete',
    'projects.confirmDelete': 'Are you sure you want to delete this project',
    'projects.noProjects': 'No Projects',
    'projects.addFirst': 'Start by adding your first project',

    // Administration
    'admin.title': 'Administration',
    'admin.investors': 'Investors',
    'admin.transactions': 'Transactions',
    'admin.currentAccount': 'Current Account 2025',
    'admin.capex': 'CAPEX 2025',
    'admin.rd': 'R&D / Dividends',

    // Investors
    'investors.title': 'Investor Management',
    'investors.subtitle': 'Manage investors and their documents',
    'investors.add': 'Add Investor',
    'investors.new': 'New Investor',
    'investors.edit': 'Edit Investor',
    'investors.firstName': 'First Name',
    'investors.lastName': 'Last Name',
    'investors.email': 'Email',
    'investors.phone': 'Phone',
    'investors.username': 'Username',
    'investors.shareClass': 'Share Class',
    'investors.totalShares': 'Total Shares',
    'investors.shareValue': 'Share Value',
    'investors.totalInvested': 'Total Invested',
    'investors.percentOwnership': '% Ownership',
    'investors.investmentType': 'Investment Type',
    'investors.joinDate': 'Join Date',
    'investors.accessLevel': 'Access Level',
    'investors.permissions': 'Permissions',
    'investors.documents': 'Documents',
    'investors.currentValue': 'Current Value',
    'investors.shares': 'Shares',
    'investors.ownership': 'Ownership',
    'investors.memberSince': 'Member since',
    'investors.noInvestors': 'No Investors',
    'investors.addFirstInvestor': 'Start by adding your first investor',

    // Transactions
    'transactions.title': 'Transactions',
    'transactions.new': 'New Transaction',
    'transactions.edit': 'Edit Transaction',
    'transactions.date': 'Date',
    'transactions.type': 'Type',
    'transactions.amount': 'Amount',
    'transactions.description': 'Description',
    'transactions.category': 'Category',
    'transactions.paymentMethod': 'Payment Method',
    'transactions.referenceNumber': 'Reference Number',
    'transactions.status': 'Status',
    'transactions.investor': 'Investor',
    'transactions.property': 'Property',
    'transactions.none': 'None',
    'transactions.noTransactions': 'No Transactions',
    'transactions.addFirst': 'Start by adding your first transaction',
    'transactions.totalIn': 'Inflows',
    'transactions.totalOut': 'Outflows',
    'transactions.balance': 'Balance',
    'transactions.filter': 'Filter',
    'transactions.allTypes': 'All Types',
    'transactions.allCategories': 'All Categories',
    'transactions.noMatch': 'No transactions match the selected filters',

    // Transaction Types
    'transactionType.investment': 'Investment',
    'transactionType.payment': 'Payment',
    'transactionType.dividend': 'Dividend',
    'transactionType.expense': 'Expense',

    // Categories
    'category.capital': 'Capital',
    'category.operation': 'Operation',
    'category.maintenance': 'Maintenance',
    'category.admin': 'Administration',

    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.suspended': 'Suspended',
    'status.complete': 'Complete',
    'status.pending': 'Pending',
    'status.cancelled': 'Cancelled',
    'status.reservation': 'Reservation',
    'status.construction': 'Construction',
    'status.completed': 'Completed',
    'status.rented': 'Rented',

    // Payment Methods
    'paymentMethod.transfer': 'Transfer',
    'paymentMethod.check': 'Check',
    'paymentMethod.cash': 'Cash',
    'paymentMethod.card': 'Card',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.loading': 'Loading...',
    'common.saving': 'Saving...',
    'common.actions': 'Actions',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.viewDetails': 'View Details',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',

    // Documents
    'documents.title': 'Documents',
    'documents.upload': 'Click to upload a document',
    'documents.uploading': 'Uploading...',
    'documents.noDocuments': 'No documents for this investor',
    'documents.deleteConfirm': 'Are you sure you want to delete this document?',

    // Current Account
    'currentAccount.title': 'Current Account',
    'currentAccount.subtitle': 'Aggregated view of transactions by category',
    'currentAccount.totalRevenues': 'Total Revenues',
    'currentAccount.operationalCosts': 'Operational Costs',
    'currentAccount.projectExpenses': 'Project Expenses',
    'currentAccount.netIncome': 'Net Income',
    'currentAccount.revenueDetails': 'Revenue Details',
    'currentAccount.operationDetails': 'Operation Cost Details',
    'currentAccount.projectDetails': 'Project Expense Details',
    'currentAccount.rentalIncome': 'Rental income',
    'currentAccount.otherIncome': 'Other income',
    'currentAccount.managementFees': 'Management fees',
    'currentAccount.utilities': 'Utilities',
    'currentAccount.insurance': 'Insurance',
    'currentAccount.maintenance': 'Maintenance',
    'currentAccount.propertyTaxes': 'Property taxes',
    'currentAccount.renovations': 'Renovations',
    'currentAccount.furnishing': 'Furnishing',
    'currentAccount.otherProjects': 'Other projects',
    'currentAccount.byProject': 'Details by Project',
    'currentAccount.noData': 'No Data',
    'currentAccount.noTransactionsFor': 'No transactions for',

    // Months
    'month.january': 'January',
    'month.february': 'February',
    'month.march': 'March',
    'month.april': 'April',
    'month.may': 'May',
    'month.june': 'June',
    'month.july': 'July',
    'month.august': 'August',
    'month.september': 'September',
    'month.october': 'October',
    'month.november': 'November',
    'month.december': 'December',

    // Investment Types
    'investmentType.capital': 'Capital',
    'investmentType.debt': 'Debt',
    'investmentType.mixed': 'Mixed',

    // Access Levels
    'accessLevel.investor': 'Investor',
    'accessLevel.admin': 'Administrator',

    // Errors & Messages
    'error.generic': 'An error occurred',
    'error.loadingFailed': 'Failed to load data',
    'error.saveFailed': 'Failed to save',
    'error.deleteFailed': 'Failed to delete',
    'success.saved': 'Successfully saved',
    'success.deleted': 'Successfully deleted',
    'success.uploaded': 'Successfully uploaded',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')

  // Load language preference from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'fr' || savedLanguage === 'en')) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.fr] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}
