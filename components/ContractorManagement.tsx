'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Star, Phone, Mail, FileText } from 'lucide-react'

interface Contractor {
  id: string
  company_name: string
  contact_name?: string
  email?: string
  phone?: string
  specialty?: string
  license_number?: string
  status: string
  rating?: number
  total_projects: number
  total_value: number
  notes?: string
}

export default function ContractorManagement() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filterStatus, setFilterStatus] = useState('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)
  const [formData, setFormData] = useState({
    company_name: '', contact_name: '', email: '', phone: '',
    specialty: '', license_number: '', rating: '0', notes: ''
  })

  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  useEffect(() => {
    loadContractors()
  }, [filterStatus])

  const loadContractors = async () => {
    setIsLoading(true)
    let query = supabase.from('contractors').select('*').order('company_name')
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)
    const { data } = await query
    setContractors(data || [])
    setIsLoading(false)
  }

  const openDialog = (contractor?: Contractor) => {
    if (contractor) {
      setEditingContractor(contractor)
      setFormData({
        company_name: contractor.company_name, contact_name: contractor.contact_name || '',
        email: contractor.email || '', phone: contractor.phone || '',
        specialty: contractor.specialty || '', license_number: contractor.license_number || '',
        rating: contractor.rating?.toString() || '0', notes: contractor.notes || ''
      })
    } else {
      setEditingContractor(null)
      setFormData({ company_name: '', contact_name: '', email: '', phone: '', specialty: '', license_number: '', rating: '0', notes: '' })
    }
    setIsDialogOpen(true)
  }

  const saveContractor = async () => {
    if (!formData.company_name) {
      alert(fr ? 'Le nom de l\'entreprise est requis' : 'Company name is required')
      return
    }
    setIsLoading(true)
    const data = { ...formData, status: 'active', rating: parseFloat(formData.rating) }
    const { error } = editingContractor
      ? await supabase.from('contractors').update(data).eq('id', editingContractor.id)
      : await supabase.from('contractors').insert(data)

    if (error) {
      console.error(error)
      alert(fr ? 'Erreur lors de la sauvegarde' : 'Error saving contractor')
    } else {
      await loadContractors()
      setIsDialogOpen(false)
    }
    setIsLoading(false)
  }

  const deleteContractor = async (id: string) => {
    if (!confirm(fr ? 'Supprimer cet entrepreneur?' : 'Delete this contractor?')) return
    setIsLoading(true)
    await supabase.from('contractors').delete().eq('id', id)
    await loadContractors()
    setIsLoading(false)
  }

  const changeStatus = async (id: string, status: string) => {
    setIsLoading(true)
    await supabase.from('contractors').update({ status }).eq('id', id)
    await loadContractors()
    setIsLoading(false)
  }

  const filteredContractors = contractors.filter(c =>
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: contractors.length,
    active: contractors.filter(c => c.status === 'active').length,
    totalValue: contractors.reduce((sum, c) => sum + c.total_value, 0),
    avgRating: contractors.length > 0 ? contractors.reduce((sum, c) => sum + (c.rating || 0), 0) / contractors.filter(c => c.rating).length : 0
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(amount)

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{fr ? 'Gestion des Entrepreneurs' : 'Contractor Management'}</h1>
          <p className="text-muted-foreground mt-2">{fr ? 'Gérez votre réseau d\'entrepreneurs et fournisseurs' : 'Manage your contractor and supplier network'}</p>
        </div>
        <Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />{fr ? 'Nouvel Entrepreneur' : 'New Contractor'}</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Total Entrepreneurs' : 'Total Contractors'}</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Actifs' : 'Active'}</CardDescription><CardTitle className="text-2xl text-green-600">{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Valeur Totale' : 'Total Value'}</CardDescription><CardTitle className="text-xl">{formatCurrency(stats.totalValue)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>{fr ? 'Note Moyenne' : 'Avg Rating'}</CardDescription><CardTitle className="text-2xl">{stats.avgRating.toFixed(1)}/5</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input placeholder={fr ? 'Rechercher...' : 'Search...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="w-40">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                <option value="all">{fr ? 'Tous' : 'All'}</option>
                <option value="active">{fr ? 'Actifs' : 'Active'}</option>
                <option value="inactive">{fr ? 'Inactifs' : 'Inactive'}</option>
                <option value="blacklisted">{fr ? 'Blacklistés' : 'Blacklisted'}</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fr ? 'Entreprise' : 'Company'}</TableHead>
                <TableHead>{fr ? 'Contact' : 'Contact'}</TableHead>
                <TableHead>{fr ? 'Spécialité' : 'Specialty'}</TableHead>
                <TableHead>{fr ? 'Évaluation' : 'Rating'}</TableHead>
                <TableHead>{fr ? 'Projets' : 'Projects'}</TableHead>
                <TableHead>{fr ? 'Valeur' : 'Value'}</TableHead>
                <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                <TableHead>{fr ? 'Actions' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContractors.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{fr ? 'Aucun entrepreneur trouvé' : 'No contractors found'}</TableCell></TableRow>
              ) : (
                filteredContractors.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.company_name}</div>
                      {c.license_number && <div className="text-xs text-muted-foreground">{fr ? 'Licence' : 'License'}: {c.license_number}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {c.contact_name && <div>{c.contact_name}</div>}
                        {c.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{c.phone}</div>}
                        {c.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />{c.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{c.specialty || '-'}</TableCell>
                    <TableCell>
                      {c.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{c.rating.toFixed(1)}</span>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{c.total_projects}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(c.total_value)}</TableCell>
                    <TableCell>
                      {c.status === 'active' && <Badge variant="default" className="bg-green-600">{fr ? 'Actif' : 'Active'}</Badge>}
                      {c.status === 'inactive' && <Badge variant="secondary">{fr ? 'Inactif' : 'Inactive'}</Badge>}
                      {c.status === 'blacklisted' && <Badge variant="destructive">{fr ? 'Blacklisté' : 'Blacklisted'}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(c)} disabled={isLoading}><Edit className="h-3 w-3" /></Button>
                        {c.status === 'active' && <Button size="sm" variant="ghost" onClick={() => changeStatus(c.id, 'inactive')} disabled={isLoading}>{fr ? 'Désactiver' : 'Deactivate'}</Button>}
                        {c.status === 'inactive' && <Button size="sm" variant="ghost" onClick={() => changeStatus(c.id, 'active')} disabled={isLoading}>{fr ? 'Activer' : 'Activate'}</Button>}
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteContractor(c.id)} disabled={isLoading}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingContractor ? (fr ? 'Modifier l\'Entrepreneur' : 'Edit Contractor') : (fr ? 'Nouvel Entrepreneur' : 'New Contractor')}</DialogTitle>
            <DialogDescription>{fr ? 'Informations de l\'entrepreneur ou fournisseur' : 'Contractor or supplier information'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{fr ? 'Nom de l\'Entreprise *' : 'Company Name *'}</Label>
                <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Personne Contact' : 'Contact Person'}</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Telephone' : 'Phone'}</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Spécialité' : 'Specialty'}</Label>
                <Input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} placeholder={fr ? 'Ex: Plomberie' : 'e.g. Plumbing'} />
              </div>
              <div>
                <Label>{fr ? 'Numéro de Licence' : 'License Number'}</Label>
                <Input value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} />
              </div>
              <div>
                <Label>{fr ? 'Évaluation (0-5)' : 'Rating (0-5)'}</Label>
                <Input type="number" min="0" max="5" step="0.1" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>{fr ? 'Notes' : 'Notes'}</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
            <Button onClick={saveContractor} disabled={isLoading}>{editingContractor ? (fr ? 'Mettre à Jour' : 'Update') : (fr ? 'Créer' : 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
