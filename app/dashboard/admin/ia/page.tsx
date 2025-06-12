'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'

export default function AdminIACerdiaPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setIsAdmin(false)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error || data?.role !== 'admin') {
        setIsAdmin(false)
      } else {
        setIsAdmin(true)
      }
    }

    verify()
  }, [supabase])

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-lg">
        Chargement de l’accès sécurisé...
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 text-lg font-semibold">
        Accès refusé. Cette section est réservée aux administrateurs.
      </div>
    )
  }

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">
        🧠 IA CERDIA – Mode Administrateur
      </h1>
      {/* 👉 Ton contenu IA va ici */}
      <p className="text-gray-700 text-center">
        Interface IA en cours de chargement...
      </p>
    </div>
  )
}

