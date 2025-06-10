'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

interface Message {
  type: 'user' | 'ia'
  text: string
}

export default function AdminIACerdiaPage() {
  const supabase = createClientComponentClient<Database>()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // 🔐 Vérifie si l'utilisateur est admin
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user.id

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || data?.role !== 'admin') {
        setIsAdmin(false)
        window.location.href = '/'
      } else {
        setIsAdmin(true)
      }
    }

    checkRole()
  }, [supabase])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, { type: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ia-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      })

      const data = await res.json()

      if (data.result) {
        setMessages((prev) => [...prev, { type: 'ia', text: data.result }])
      } else {
        setMessages((prev) => [
          ...prev,
          { type: 'ia', text: '❌ Réponse non disponible.' },
        ])
      }
    } catch (e) {
      console.error('Erreur IA Admin:', e)
      setMessages((prev) => [
        ...prev,
        { type: 'ia', text: '❌ Erreur de communication avec IA Admin.' },
      ])
    }

    setLoading(false)
  }

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('ia_memory')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) setHistory(data || [])
    }

    fetchHistory()
  }, [supabase])

  const markAsStrategic = async (id: string) => {
    const { error } = await supabase
      .from('ia_memory')
      .update({ is_strategic: true })
      .eq('id', id)

    if (!error) {
      setHistory((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_strategic: true } : item))
      )
    }
  }

  // ✅ Proposer automatiquement une tâche IA stratégique
  const handleProposeTask = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/ia/propose-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (data.message) {
        setMessages(prev => [
          ...prev,
          { type: 'ia', text: `✅ ${data.message}` }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { type: 'ia', text: '❌ Aucune réponse reçue du moteur IA.' }
        ])
      }
    } catch (err) {
      console.error('Erreur propose-task:', err)
      setMessages(prev => [
        ...prev,
        { type: 'ia', text: '❌ Erreur système lors de la création de tâche IA.' }
      ])
    }

    setLoading(false)
  }
