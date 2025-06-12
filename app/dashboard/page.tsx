'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export default function DashboardInvestisseur() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/connexion') // Redirige vers login si non connecté
      } else {
        setUser(session.user)
      }
    }
    fetchSession()
  }, [supabase, router])

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📊 Tableau de bord Investisseur</h1>
        <a
          href="/dashboard/admin/ia"
          className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900"
        >
          Accéder à CERDIA IA
        </a>
      </div>

      {/* Google Sheet en temps réel */}
      <div className="w-full h-[600px] mb-10 border rounded shadow overflow-hidden">
        <iframe
          src="https://docs.google.com/spreadsheets/d/1wiWWrfgCXLDlBrMUzkn5GQl6YAVXFhKU/pubhtml?widget=true&headers=false"
          width="100%"
          height="100%"
          frameBorder="0"
          className="rounded"
        />
      </div>

      {/* Zone de note ou annonce */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">📝 Note interne</h2>
        <textarea
          rows={5}
          placeholder="Écrire une note ou un message ici..."
          className="w-full border rounded p-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </div>
  )
}
