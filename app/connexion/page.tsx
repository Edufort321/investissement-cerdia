'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/database.types'

export default function ConnexionPage() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Connexion Investisseurs</h1>

      {/* Email */}
      <input
        type="email"
        placeholder="Courriel"
        className="border p-2 w-full mb-2"
        onChange={(e) => setEmail(e.target.value)}
        value={email}
        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('password')?.focus()}
        autoFocus
      />

      {/* Mot de passe */}
      <div className="relative mb-2">
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Mot de passe"
          className="border p-2 w-full pr-10"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="absolute top-2 right-2 text-gray-600"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>

      <button
        onClick={handleLogin}
        className="bg-blue-700 text-white px-4 py-2 w-full"
      >
        Connexion
      </button>

      <p className="text-sm mt-4 text-center">
        <a href="/reset" className="text-blue-500 hover:underline">
          Mot de passe oublié ?
        </a>
      </p>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  )
}
