'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Eye, EyeOff, Image as ImageIcon } from 'lucide-react'

interface HomeSlide {
  id: string
  image_url: string
  flag: string
  location: string
  sub: string | null
  stat: string | null
  label_fr: string
  label_en: string
  active: boolean
  sort_order: number
}

const EMPTY: Omit<HomeSlide, 'id' | 'sort_order'> = {
  image_url: '',
  flag: '🌍',
  location: '',
  sub: '',
  stat: '',
  label_fr: 'rendement locatif annuel',
  label_en: 'annual rental yield',
  active: true,
}

export default function HomeSlidesTab({ toast }: { toast?: (msg: string, ok?: boolean) => void }) {
  const [slides, setSlides] = useState<HomeSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Omit<HomeSlide, 'id' | 'sort_order'>>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const notify = (msg: string, ok = true) => toast ? toast(msg, ok) : undefined

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('home_slides')
      .select('*')
      .order('sort_order', { ascending: true })
    setSlides(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `home-slides/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true })
    if (error) { notify('Erreur upload: ' + error.message, false); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: publicUrl }))
    setUploading(false)
    notify('Image uploadée')
  }

  const handleSave = async () => {
    if (!form.location.trim() || !form.image_url) {
      notify('Lieu et image requis', false); return
    }
    if (editId) {
      const { error } = await supabase.from('home_slides').update(form).eq('id', editId)
      if (error) { notify('Erreur: ' + error.message, false); return }
      notify('Slide mis à jour')
    } else {
      const maxOrder = slides.length ? Math.max(...slides.map(s => s.sort_order)) + 1 : 0
      const { error } = await supabase.from('home_slides').insert({ ...form, sort_order: maxOrder })
      if (error) { notify('Erreur: ' + error.message, false); return }
      notify('Slide ajouté')
    }
    setForm(EMPTY)
    setEditId(null)
    load()
  }

  const handleEdit = (s: HomeSlide) => {
    setEditId(s.id)
    setForm({ image_url: s.image_url, flag: s.flag, location: s.location, sub: s.sub || '', stat: s.stat || '', label_fr: s.label_fr, label_en: s.label_en, active: s.active })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce slide ?')) return
    await supabase.from('home_slides').delete().eq('id', id)
    notify('Slide supprimé')
    load()
  }

  const toggleActive = async (s: HomeSlide) => {
    await supabase.from('home_slides').update({ active: !s.active }).eq('id', s.id)
    load()
  }

  const moveSlide = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= slides.length) return
    const a = slides[idx]
    const b = slides[target]
    await supabase.from('home_slides').update({ sort_order: b.sort_order }).eq('id', a.id)
    await supabase.from('home_slides').update({ sort_order: a.sort_order }).eq('id', b.id)
    load()
  }

  const cancelEdit = () => { setForm(EMPTY); setEditId(null) }

  return (
    <div className="space-y-8">

      {/* Formulaire ajout/édition */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <ImageIcon size={16} className="text-orange-500" />
          {editId ? 'Modifier le slide' : 'Ajouter un slide'}
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">

          {/* Upload image */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Image</label>
            {form.image_url ? (
              <div className="relative group w-full h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button onClick={() => { setForm(f => ({ ...f, image_url: '' })); if (fileRef.current) fileRef.current.value = '' }}
                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    Retirer
                  </button>
                  <button onClick={() => fileRef.current?.click()}
                    className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium">
                    Changer
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-400 transition text-gray-400 hover:text-orange-500">
                {uploading
                  ? <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  : <><Upload size={22} /><span className="text-sm">Cliquer pour uploader</span></>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
          </div>

          {/* Flag */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Drapeau (emoji)</label>
            <input value={form.flag} onChange={e => setForm(f => ({ ...f, flag: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="🇩🇴" />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Destination *</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="République Dominicaine" />
          </div>

          {/* Sub */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Villes</label>
            <input value={form.sub || ''} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="Punta Cana · Cabarete" />
          </div>

          {/* Stat */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Stat / Rendement</label>
            <input value={form.stat || ''} onChange={e => setForm(f => ({ ...f, stat: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="6–12 %" />
          </div>

          {/* Label FR */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Label (FR)</label>
            <input value={form.label_fr} onChange={e => setForm(f => ({ ...f, label_fr: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>

          {/* Label EN */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Label (EN)</label>
            <input value={form.label_en} onChange={e => setForm(f => ({ ...f, label_en: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white" />
          </div>

          {/* Actif */}
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <div className="w-10 h-5 bg-gray-300 peer-checked:bg-orange-500 rounded-full transition peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </label>
            <span className="text-sm text-gray-600 dark:text-gray-400">Visible sur l'accueil</span>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
            <Plus size={15} /> {editId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editId && (
            <button onClick={cancelEdit}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Liste des slides */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Slides ({slides.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">Les slides actifs apparaissent dans l'ordre affiché sur la page d'accueil.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : slides.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Aucun slide — ajoutez-en un ci-dessus.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {slides.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4">

                {/* Preview */}
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                  <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {s.flag} {s.location}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{s.sub} {s.stat && `— ${s.stat}`}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => moveSlide(idx, -1)} disabled={idx === 0}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-25 transition rounded">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-25 transition rounded">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => toggleActive(s)}
                    className={`p-1.5 rounded transition ${s.active ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
                    title={s.active ? 'Masquer' : 'Afficher'}>
                    {s.active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => handleEdit(s)}
                    className="p-1.5 text-gray-400 hover:text-orange-500 transition rounded text-xs font-medium">
                    Éditer
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
