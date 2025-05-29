'use client'

import { useState } from 'react'

export default function PageConnexion() {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="max-w-md mx-auto mt-20 px-6 py-10 border rounded-xl shadow-md bg-white">
      <h1 className="text-2xl font-bold text-center mb-6">🔐 Connexion à CERDIA</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form
        action="/api/connexion"
        method="POST"
        className="space-y-4"
        onSubmit={() => setError(null)}
      >
        <input
          type="email"
          name="email"
          placeholder="Adresse courriel"
          required
          className="w-full px-4 py-2 border rounded"
        />

        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          required
          className="w-full px-4 py-2 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2 rounded"
        >
          Se connecter
        </button>
      </form>
    </div>
  )
}
