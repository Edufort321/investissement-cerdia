'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  const supabase = createClientComponentClient()
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
      alert('Le nom de l\'entreprise est requis')
      return
    }
    setIsLoading(true)
    const data = { ...formData, status: 'active', rating: parseFloat(formData.rating) }
    const { error } = editingContractor
      ? await supabase.from('contractors').update(data).eq('id', editingContractor.id)
      : await supabase.from('contractors').insert(data)

    if (error) {
      console.error(error)
      alert('Erreur lors de la sauvegarde')
    } else {
      await loadContractors()
      setIsDialogOpen(false)
    }
    setIsLoading(false)
  }

  const deleteContractor = async (id: string) => {
    if (!confirm('Supprimer cet entrepreneur?')) return
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

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Entrepreneurs</h1>
          <p className="text-muted-foreground mt-2">Gérez votre réseau d'entrepreneurs et fournisseurs</p>
        </div>
        <Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Nouvel Entrepreneur</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Entrepreneurs</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Actifs</CardDescription><CardTitle className="text-2xl text-green-600">{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Valeur Totale</CardDescription><CardTitle className="text-xl">{formatCurrency(stats.totalValue)}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Note Moyenne</CardDescription><CardTitle className="text-2xl">{stats.avgRating.toFixed(1)}/5</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="w-40">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border rounded-md">
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
                <option value="blacklisted">Blacklistés</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entreprise</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Évaluation</TableHead>
                <TableHead>Projets</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContractors.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucun entrepreneur trouvé</TableCell></TableRow>
              ) : (
                filteredContractors.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.company_name}</div>
                      {c.license_number && <div className="text-xs text-muted-foreground">Licence: {c.license_number}</div>}
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
                      {c.status === 'active' && <Badge variant="default" className="bg-green-600">Actif</Badge>}
                      {c.status === 'inactive' && <Badge variant="secondary">Inactif</Badge>}
                      {c.status === 'blacklisted' && <Badge variant="destructive">Blacklisté</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDialog(c)} disabled={isLoading}><Edit className="h-3 w-3" /></Button>
                        {c.status === 'active' && <Button size="sm" variant="ghost" onClick={() => changeStatus(c.id, 'inactive')} disabled={isLoading}>Désactiver</Button>}
                        {c.status === 'inactive' && <Button size="sm" variant="ghost" onClick={() => changeStatus(c.id, 'active')} disabled={isLoading}>Activer</Button>}
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
            <DialogTitle>{editingContractor ? 'Modifier l\'Entrepreneur' : 'Nouvel Entrepreneur'}</DialogTitle>
            <DialogDescription>Informations de l'entrepreneur ou fournisseur</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom de l'Entreprise *</Label>
                <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
              </div>
              <div>
                <Label>Personne Contact</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <Label>Spécialité</Label>
                <Input value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} placeholder="Ex: Plomberie" />
              </div>
              <div>
                <Label>Numéro de Licence</Label>
                <Input value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} />
              </div>
              <div>
                <Label>Évaluation (0-5)</Label>
                <Input type="number" min="0" max="5" step="0.1" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveContractor} disabled={isLoading}>{editingContractor ? 'Mettre à Jour' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
