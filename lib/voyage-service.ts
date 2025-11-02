import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export interface VoyageDB {
  id: string
  user_id: string
  titre: string
  date_debut: string
  date_fin: string
  budget?: number
  devise: string
  mode_achat: 'investor' | 'single' | 'full'
  expire_at?: string
  created_at: string
  updated_at: string
  is_public?: boolean
  is_template?: boolean
  template_name?: string
  template_description?: string
  template_image_url?: string
  views_count?: number
  uses_count?: number
  privacy_photos?: boolean
  privacy_receipts?: boolean
}

export interface PublicVoyageDB {
  id: string
  titre: string
  template_name?: string
  template_description?: string
  template_image_url?: string
  date_debut: string
  date_fin: string
  budget?: number
  devise: string
  views_count: number
  uses_count: number
  is_template: boolean
  created_at: string
  event_count: number
  creator_email: string
}

export interface EvenementDB {
  id: string
  voyage_id: string
  type: 'vol' | 'hebergement' | 'activite' | 'transport' | 'condo'
  titre: string
  date: string
  heure_debut?: string
  heure_fin?: string
  lieu?: string
  adresse?: string
  coordonnees?: { lat: number; lng: number }
  ville_depart?: string
  ville_arrivee?: string
  numero_vol?: string
  compagnie?: string
  heure_arrivee?: string
  date_arrivee?: string
  transport_mode?: 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat'
  duration?: number
  from_location?: string
  rating?: number
  ordre?: number
  prix?: number
  devise: string
  notes?: string
  transport?: string
  external_link?: string
}

export interface DepenseDB {
  id: string
  voyage_id: string
  date: string
  categorie: string
  description?: string
  montant: number
  devise: string
}

export interface ChecklistDB {
  id: string
  voyage_id: string
  texte: string
  complete: boolean
  ordre: number
}

// ============================================
// CRUD VOYAGES
// ============================================

export const voyageService = {
  // Récupérer tous les voyages de l'utilisateur
  async getAll(userId: string): Promise<VoyageDB[]> {
    const { data, error } = await supabase
      .from('voyages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur get voyages:', error)
      throw error
    }

    return data || []
  },

  // Récupérer un voyage spécifique
  async getById(voyageId: string): Promise<VoyageDB | null> {
    const { data, error } = await supabase
      .from('voyages')
      .select('*')
      .eq('id', voyageId)
      .single()

    if (error) {
      console.error('Erreur get voyage:', error)
      return null
    }

    return data
  },

  // Créer un nouveau voyage
  async create(voyage: Omit<VoyageDB, 'id' | 'created_at' | 'updated_at'>): Promise<VoyageDB | null> {
    const { data, error } = await supabase
      .from('voyages')
      .insert([voyage])
      .select()
      .single()

    if (error) {
      console.error('Erreur create voyage:', error)
      throw error
    }

    return data
  },

  // Mettre à jour un voyage
  async update(voyageId: string, updates: Partial<VoyageDB>): Promise<VoyageDB | null> {
    const { data, error } = await supabase
      .from('voyages')
      .update(updates)
      .eq('id', voyageId)
      .select()
      .single()

    if (error) {
      console.error('Erreur update voyage:', error)
      throw error
    }

    return data
  },

  // Supprimer un voyage
  async delete(voyageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('voyages')
      .delete()
      .eq('id', voyageId)

    if (error) {
      console.error('Erreur delete voyage:', error)
      return false
    }

    return true
  },

  // Vérifier le nombre de voyages (pour limitation mode single)
  async count(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('voyages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Erreur count voyages:', error)
      return 0
    }

    return count || 0
  },

  // ============================================
  // VOYAGES PUBLICS ET TEMPLATES
  // ============================================

  // Récupérer tous les voyages publics
  async getPublicVoyages(): Promise<PublicVoyageDB[]> {
    const { data, error } = await supabase
      .from('public_voyages')
      .select('*')
      .order('views_count', { ascending: false })

    if (error) {
      console.error('Erreur get public voyages:', error)
      return []
    }

    return data || []
  },

  // Récupérer les templates les plus utilisés
  async getPopularTemplates(limit: number = 10): Promise<PublicVoyageDB[]> {
    const { data, error } = await supabase
      .from('public_voyages')
      .select('*')
      .eq('is_template', true)
      .order('uses_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Erreur get popular templates:', error)
      return []
    }

    return data || []
  },

  // Incrémenter le compteur de vues
  async incrementViews(voyageId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_voyage_views', {
      voyage_id_param: voyageId
    })

    if (error) {
      console.error('Erreur increment views:', error)
    }
  },

  // Dupliquer un voyage depuis un template
  async duplicateFromTemplate(
    templateId: string,
    userId: string,
    newTitle: string,
    newDateDebut: string,
    newDateFin: string
  ): Promise<string | null> {
    const { data, error } = await supabase.rpc('duplicate_voyage_from_template', {
      template_id_param: templateId,
      new_user_id_param: userId,
      new_titre: newTitle,
      new_date_debut: newDateDebut,
      new_date_fin: newDateFin
    })

    if (error) {
      console.error('Erreur duplicate template:', error)
      return null
    }

    return data
  },

  // Rendre un voyage public
  async makePublic(voyageId: string, templateInfo?: {
    name: string
    description: string
    imageUrl?: string
    isTemplate: boolean
  }): Promise<boolean> {
    const updates: Partial<VoyageDB> = {
      is_public: true,
      is_template: templateInfo?.isTemplate || false,
      template_name: templateInfo?.name,
      template_description: templateInfo?.description,
      template_image_url: templateInfo?.imageUrl
    }

    const { error } = await supabase
      .from('voyages')
      .update(updates)
      .eq('id', voyageId)

    if (error) {
      console.error('Erreur make public:', error)
      return false
    }

    return true
  },

  // Rendre un voyage privé
  async makePrivate(voyageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('voyages')
      .update({
        is_public: false,
        is_template: false
      })
      .eq('id', voyageId)

    if (error) {
      console.error('Erreur make private:', error)
      return false
    }

    return true
  }
}

// ============================================
// CRUD ÉVÉNEMENTS
// ============================================

export const evenementService = {
  async getByVoyage(voyageId: string): Promise<EvenementDB[]> {
    const { data, error } = await supabase
      .from('evenements')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date', { ascending: true })

    if (error) {
      console.error('Erreur get evenements:', error)
      return []
    }

    return data || []
  },

  async create(evenement: Omit<EvenementDB, 'id'>): Promise<EvenementDB | null> {
    const { data, error } = await supabase
      .from('evenements')
      .insert([evenement])
      .select()
      .single()

    if (error) {
      console.error('Erreur create evenement:', error)
      return null
    }

    return data
  },

  async update(evenementId: string, updates: Partial<EvenementDB>): Promise<EvenementDB | null> {
    const { data, error } = await supabase
      .from('evenements')
      .update(updates)
      .eq('id', evenementId)
      .select()
      .single()

    if (error) {
      console.error('Erreur update evenement:', error)
      return null
    }

    return data
  },

  async delete(evenementId: string): Promise<boolean> {
    const { error } = await supabase
      .from('evenements')
      .delete()
      .eq('id', evenementId)

    if (error) {
      console.error('Erreur delete evenement:', error)
      return false
    }

    return true
  }
}

// ============================================
// CRUD DÉPENSES
// ============================================

export const depenseService = {
  async getByVoyage(voyageId: string): Promise<DepenseDB[]> {
    const { data, error } = await supabase
      .from('depenses')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Erreur get depenses:', error)
      return []
    }

    return data || []
  },

  async create(depense: Omit<DepenseDB, 'id'>): Promise<DepenseDB | null> {
    const { data, error } = await supabase
      .from('depenses')
      .insert([depense])
      .select()
      .single()

    if (error) {
      console.error('Erreur create depense:', error)
      return null
    }

    return data
  },

  async update(depenseId: string, updates: Partial<DepenseDB>): Promise<DepenseDB | null> {
    const { data, error } = await supabase
      .from('depenses')
      .update(updates)
      .eq('id', depenseId)
      .select()
      .single()

    if (error) {
      console.error('Erreur update depense:', error)
      return null
    }

    return data
  },

  async delete(depenseId: string): Promise<boolean> {
    const { error } = await supabase
      .from('depenses')
      .delete()
      .eq('id', depenseId)

    if (error) {
      console.error('Erreur delete depense:', error)
      return false
    }

    return true
  }
}

// ============================================
// CRUD CHECKLIST
// ============================================

export const checklistService = {
  async getByVoyage(voyageId: string): Promise<ChecklistDB[]> {
    const { data, error } = await supabase
      .from('checklist')
      .select('*')
      .eq('voyage_id', voyageId)
      .order('ordre', { ascending: true })

    if (error) {
      console.error('Erreur get checklist:', error)
      return []
    }

    return data || []
  },

  async create(item: Omit<ChecklistDB, 'id'>): Promise<ChecklistDB | null> {
    const { data, error } = await supabase
      .from('checklist')
      .insert([item])
      .select()
      .single()

    if (error) {
      console.error('Erreur create checklist:', error)
      return null
    }

    return data
  },

  async update(itemId: string, updates: Partial<ChecklistDB>): Promise<ChecklistDB | null> {
    const { data, error } = await supabase
      .from('checklist')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Erreur update checklist:', error)
      return null
    }

    return data
  },

  async delete(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('checklist')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Erreur delete checklist:', error)
      return false
    }

    return true
  },

  async toggle(itemId: string, complete: boolean): Promise<boolean> {
    const result = await this.update(itemId, { complete })
    return result !== null
  }
}

// ============================================
// CRUD WAYPOINTS (Points d'intérêt / étapes)
// ============================================

export interface WaypointDB {
  id: string
  evenement_id: string
  nom: string
  description?: string
  ordre: number
  coordonnees: { lat: number; lng: number }
  adresse?: string
  photo_url?: string
  visited: boolean
  notes?: string
  created_at?: string
}

export const waypointService = {
  async getByEvent(eventId: string): Promise<WaypointDB[]> {
    const { data, error } = await supabase
      .from('event_waypoints')
      .select('*')
      .eq('evenement_id', eventId)
      .order('ordre', { ascending: true })

    if (error) {
      console.error('Erreur get waypoints:', error)
      return []
    }

    return data || []
  },

  async create(waypoint: Omit<WaypointDB, 'id' | 'created_at'>): Promise<WaypointDB | null> {
    const { data, error } = await supabase
      .from('event_waypoints')
      .insert([waypoint])
      .select()
      .single()

    if (error) {
      console.error('Erreur create waypoint:', error)
      return null
    }

    return data
  },

  async update(waypointId: string, updates: Partial<WaypointDB>): Promise<WaypointDB | null> {
    const { data, error } = await supabase
      .from('event_waypoints')
      .update(updates)
      .eq('id', waypointId)
      .select()
      .single()

    if (error) {
      console.error('Erreur update waypoint:', error)
      return null
    }

    return data
  },

  async delete(waypointId: string): Promise<boolean> {
    const { error } = await supabase
      .from('event_waypoints')
      .delete()
      .eq('id', waypointId)

    if (error) {
      console.error('Erreur delete waypoint:', error)
      return false
    }

    return true
  },

  async toggleVisited(waypointId: string, visited: boolean): Promise<boolean> {
    const result = await this.update(waypointId, { visited })
    return result !== null
  },

  async reorder(waypointId: string, newOrdre: number): Promise<boolean> {
    const result = await this.update(waypointId, { ordre: newOrdre })
    return result !== null
  }
}

export default {
  voyage: voyageService,
  evenement: evenementService,
  depense: depenseService,
  checklist: checklistService,
  waypoint: waypointService
}
