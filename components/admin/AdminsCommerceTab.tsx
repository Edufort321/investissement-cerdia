'use client'

// Gestion DIRECTE des administrateurs COMMERCE depuis CERDIA (super_admin). Crée un vrai compte Supabase
// Auth (connexion directe email + mot de passe) avec rôle `org_commerce` (accès /commerce, PAS la zone
// investisseur). Indépendant du pont C-Secur360. API : /api/commerce/csecur360/admins (Bearer session).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, Trash2, Loader2, ShieldCheck } from 'lucide-react'

type Admin = { id: string; email: string; name: string; role: string }

export default function AdminsCommerceTab({ toast }: { toast: (t: { msg: string; type: 'success' | 'error' }) => void }) {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ email: '', name: '', password: '' })
  const [saving, setSaving] = useState(false)

  async function token(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }
  async function load() {
    setLoading(true)
    try {
      const t = await token()
      const r = await fetch('/api/commerce/csecur360/admins', { headers: { Authorization: `Bearer ${t}` } })
      const j = await r.json(); if (r.ok) setAdmins(j.admins || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!f.email.trim() || !f.password) { toast({ msg: 'Email et mot de passe requis.', type: 'error' }); return }
    setSaving(true)
    try {
      const t = await token()
      const r = await fetch('/api/commerce/csecur360/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ email: f.email.trim(), name: f.name.trim() || undefined, password: f.password, role: 'org_commerce' }),
      })
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Échec')
      toast({ msg: `✓ Admin commerce ${j.created ? 'créé' : 'mis à jour'} : ${f.email}`, type: 'success' })
      setF({ email: '', name: '', password: '' }); load()
    } catch (e: any) { toast({ msg: 'Erreur : ' + (e?.message || ''), type: 'error' }) }
    finally { setSaving(false) }
  }

  async function revoke(id: string) {
    if (!confirm('Révoquer l’accès commerce de cet admin ?')) return
    const t = await token()
    await fetch(`/api/commerce/csecur360/admins?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    load()
  }

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-1"><ShieldCheck size={18} /> Administrateurs commerce</h2>
      <p className="text-sm text-gray-500 mb-4">Accès à <b>/commerce</b> seulement (pas la zone investisseur). Ils se connectent directement sur CERDIA avec leur email + mot de passe.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Courriel *</label><input className="inp" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Nom</label><input className="inp" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Mot de passe *</label><input className="inp" type="text" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="initial" /></div>
        </div>
        <button onClick={create} disabled={saving} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={15} /> : <UserPlus size={15} />} {saving ? 'Création…' : 'Créer / mettre à jour'}</button>
      </div>

      {loading ? <p className="text-sm text-gray-400">Chargement…</p> : admins.length === 0 ? <p className="text-sm text-gray-400">Aucun admin commerce.</p> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-500 border-b"><th className="px-4 py-3">Courriel</th><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Rôle</th><th className="px-4 py-3"></th></tr></thead>
            <tbody>{admins.map(a => (
              <tr key={a.id} className="border-b border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{a.email}</td><td className="px-4 py-3 text-gray-600">{a.name}</td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${a.role === 'org_commerce' ? 'bg-orange-100 text-orange-700' : a.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{a.role}</span></td>
                <td className="px-4 py-3 text-right">{a.role !== 'super_admin' && <button onClick={() => revoke(a.id)} className="text-xs text-red-600 inline-flex items-center gap-1"><Trash2 size={13} /> Révoquer</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <style jsx>{`:global(.inp){ width:100%; padding:8px 11px; border:1px solid #d1d5db; border-radius:8px; font-size:13px; }`}</style>
    </div>
  )
}
