// Types pour le système de gestion d'investissement CERDIA

export type InvestmentType = 'immobilier' | 'actions' | 'mixte'
export type TransactionType = 'investissement' | 'depense' | 'dividende' | 'capex' | 'courant' | 'rnd'
export type DocumentType = 'facture' | 'recu' | 'contrat' | 'rapport' | 'autre'
export type PropertyStatus = 'reservation' | 'en_construction' | 'complete' | 'en_location'
export type ActionClass = 'A' | 'B'

// Document / Pièce jointe
export interface Document {
  id: string
  name: string
  type: DocumentType
  url: string
  fileSize: number
  uploadedAt: string
  uploadedBy: string
  description?: string
  transactionId?: string
  propertyId?: string
  investorId?: string
}

// Transaction financière
export interface Transaction {
  id: string
  date: string
  amount: number
  tps?: number
  tvq?: number
  type: TransactionType
  description: string
  transactionNumber?: string
  propertyId?: string
  investorId?: string
  documents: Document[]
  createdAt: string
  createdBy: string
  verified: boolean
}

// Propriété immobilière
export interface Property {
  id: string
  name: string
  location: string
  status: PropertyStatus
  totalCost: number
  paidAmount: number
  remainingAmount: number
  reservationDate?: string
  completionDate?: string
  expectedROI: number
  transactions: Transaction[]
  documents: Document[]
  description?: string
  address?: string
  units?: number
  main_photo_url?: string
}

// Investisseur
export interface Investor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  username: string
  actionClass: ActionClass
  totalShares: number
  shareValue: number
  totalInvested: number
  currentValue: number
  percentageOwnership: number
  investmentType: InvestmentType
  status: 'actif' | 'inactif'
  joinDate: string
  transactions: Transaction[]
  dividends: Dividend[]
  documents: Document[]
  accessLevel: 'admin' | 'investisseur'
  permissions: {
    dashboard: boolean
    projet: boolean
    administration: boolean
  }
}

// Dividende
export interface Dividend {
  id: string
  year: number
  quarter?: number
  totalAmount: number
  amountPerShare: number
  distributionDate: string
  investorAllocations: {
    investorId: string
    investorName: string
    shares: number
    amount: number
    paid: boolean
    paidDate?: string
  }[]
  documents: Document[]
}

// Compte CAPEX
export interface CapexAccount {
  id: string
  year: number
  investmentCapex: number // 5%
  operationCapex: number // 10%
  totalReserve: number
  transactions: Transaction[]
  description?: string
}

// Compte Courant
export interface CurrentAccount {
  id: string
  year: number
  balance: number
  totalDeposits: number
  totalWithdrawals: number
  transactions: Transaction[]
}

// R&D / Recherche et développement
export interface RnDAccount {
  id: string
  year: number
  investmentCapex: number
  operationCapex: number
  dividendTotal: number
  transactions: Transaction[]
}

// Dépense opérationnelle
export interface OperationalExpense {
  id: string
  date: string
  amount: number
  category: 'legal' | 'fiscal' | 'admin' | 'autre'
  description: string
  tps?: number
  tvq?: number
  transactionNumber?: string
  documents: Document[]
  verified: boolean
}

// Sommaire / Vue d'ensemble (calculé automatiquement)
export interface Summary {
  companyName: string
  currentTotalValue: number
  totalInvested: number
  totalInvestment: number
  totalShares: number
  currentAccount: number
  capexAccount: number
  availableLiquidity: number
  classAValue: number
  classBValue: number
  investors: {
    id: string
    name: string
    invested: number
    shares: number
    currentValue: number
    percentage: number
  }[]
  properties: {
    id: string
    name: string
    totalCost: number
    paidAmount: number
    status: PropertyStatus
  }[]
  lastUpdated: string
}

// Rapport (trimestriel, annuel)
export interface Report {
  id: string
  type: 'trimestriel' | 'annuel' | 'mensuel'
  period: string
  year: number
  quarter?: number
  month?: number
  generatedDate: string
  generatedBy: string
  summary: Summary
  transactions: Transaction[]
  dividends: Dividend[]
  documents: Document[]
  data: any // Données spécifiques au rapport
}

// État global de l'application
export interface AppState {
  investors: Investor[]
  properties: Property[]
  transactions: Transaction[]
  documents: Document[]
  dividends: Dividend[]
  capexAccounts: CapexAccount[]
  currentAccounts: CurrentAccount[]
  rndAccounts: RnDAccount[]
  operationalExpenses: OperationalExpense[]
  reports: Report[]
  summary: Summary
}
