/**
 * Types for Voyage (Travel) feature
 */

export interface Location {
  lat: number
  lng: number
}

export interface Evenement {
  id: string
  type: 'vol' | 'hebergement' | 'activite' | 'transport' | 'condo'
  titre: string
  date: string
  heureDebut?: string
  heureFin?: string
  lieu?: string
  adresse?: string
  coordonnees?: Location // Added for route optimization
  prix?: number
  devise: string
  notes?: string
  transport?: string
  rating?: number
  numeroVol?: string
  compagnie?: string
  villeDepart?: string
  villeArrivee?: string
  heureArrivee?: string
  dateArrivee?: string
}

export interface Depense {
  id: string
  date: string
  categorie: string
  description?: string
  montant: number
  devise: string
  photos?: string[]
}

export interface ChecklistItem {
  id: string
  texte: string
  complete: boolean
  categorie?: string
}

export interface Voyage {
  id: string
  userId: string
  titre: string
  dateDebut: string
  dateFin: string
  devise: string
  budget?: number
  destination?: string
  description?: string
  evenements: Evenement[]
  depenses: Depense[]
  checklist: ChecklistItem[]
  partage: {
    actif: boolean
    lien: string
    enDirect: boolean
  }
  coverImage?: string
  createdAt?: string
  updatedAt?: string
}
