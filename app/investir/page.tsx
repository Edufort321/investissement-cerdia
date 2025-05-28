'use client'

import { useState } from 'react'

export default function FormInvestisseur() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const form = e.target
    const data = new FormData(form)

    const res = await fetch('https://formspree.io/f/xldbqbrb', {
      method: 'POST',
      body: data,
      headers: {
        Accept: 'application/json',
      },
    })

    if (res.ok) {
      setSubmitted(true)
      form.reset()
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-6">✨ Candidature pour devenir investisseur CERDIA</h1>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Nom complet</label>
            <input type="text" name="nom" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Courriel</label>
            <input type="email" name="email" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Montant que vous envisagez d’investir</label>
            <input type="text" name="montant" required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Pourquoi souhaitez-vous investir avec CERDIA ?</label>
            <textarea name="motivation" rows={4} required className="w-full border rounded px-3 py-2" />
          </div>
          <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800">
            Soumettre ma candidature
          </button>
        </form>
      ) : (
        <div className="text-center bg-green-100 border border-green-400 text-green-800 px-4 py-6 rounded mt-6">
          <h2 className="text-xl font-semibold mb-2">✅ Merci de votre intérêt !</h2>
          <p>Nous prendrons contact avec vous dans les plus brefs délais.</p>
        </div>
      )}
    </div>
  )
}
