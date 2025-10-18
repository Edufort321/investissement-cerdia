'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function TestSupabasePage() {
  const [status, setStatus] = useState('⏳ Connexion à Supabase en cours...')
  const [rows, setRows] = useState<any[]>([])

  useEffect(() => {
    const testConnection = async () => {
      const { data, error } = await supabase
        .from('ia_memory') // table réelle
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error(error)
        setStatus('❌ Erreur de connexion à Supabase.')
      } else {
        setStatus('✅ Connexion réussie à Supabase !')
        setRows(data || [])
      }
    }

    testConnection()
  }, [])

  return (
    <main className="p-6 max-w-3xl mx-auto text-black">
      <h1 className="text-2xl font-bold mb-4 text-blue-800">🧪 Test Supabase</h1>
      <p className="mb-4">{status}</p>

      {rows.length > 0 && (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(rows, null, 2)}
        </pre>
      )}
    </main>
  )
}
