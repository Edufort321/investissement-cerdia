'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClientComponentClient<Database>()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user.id

      if (!userId) return

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (!error && data?.role === 'admin') {
        setIsAdmin(true)
      }
    }

    checkRole()
  }, [])

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
        {/* Logo CERDIA responsive */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-cerdia.png"
            alt="CERDIA Logo"
            width={150}
            height={48}
            className="h-auto w-[120px] sm:w-[180px] md:w-[225px]"
            priority
          />
        </Link>

        {/* Navigation */}
        <nav className="flex gap-4 sm:gap-6 items-center text-sm sm:text-base mt-3 sm:mt-0">
          <Link href="/" className="hover:underline transition">Accueil</Link>
          <Link href="/vision-cerdia" className="hover:underline transition">Vision</Link>
          <Link href="/connexion" className="hover:underline transition">Connexion</Link>
          <Link href="/investir">
            <button className="bg-[#0F1E47] text-white px-4 py-2 rounded-full hover:bg-[#1a2960] transition">
              Investir
            </button>
          </Link>
          {isAdmin && (
            <Link href="/dashboard/strategie" className="text-blue-900 font-semibold hover:underline transition">
              🧭 Planification
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
