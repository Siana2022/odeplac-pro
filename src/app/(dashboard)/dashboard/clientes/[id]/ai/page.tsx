'use client'

import { useEffect, useState, use, useRef } from 'react'
import { Sparkles, Send, ChevronLeft, Loader2, Bot, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/types/database'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function ClientAIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingClient, setFetchingClient] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchClient = async () => {
      setFetchingClient(true)
      const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (data) {
        setCliente(data)
        setMessages([
          {
            role: 'assistant',
            content: `Hola, soy tu asistente de ODEPLAC. Estoy listo para ayudarte con información sobre ${data.nombre}. ¿Qué te gustaría saber hoy?`
          }
        ])
      }
      setFetchingClient(false)
    }
    fetchClient()
  }, [id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: id,
          messages: [...messages, userMessage]
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error al procesar tu solicitud.' }])
      }
    } catch (_error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de red. Inténtalo de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  if (fetchingClient) return <div className="p-8 text-center text-muted-foreground">Cargando contexto del cliente...</div>

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/clientes/${id}`}>
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold flex items-center">
            Asistente IA <Sparkles className="ml-2 h-6 w-6 text-zinc-400" />
          </h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{cliente?.nombre}</p>
          <p className="text-xs text-muted-foreground">Contexto activado</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex space-x-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-600'}`}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`p-4 rounded-lg shadow-sm border ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}`}>
                  <p className="text-sm">{m.content}</p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 text-zinc-500 bg-white border rounded-lg p-3 px-4 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Pensando...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex space-x-2"
          >
            <Input
              placeholder={`Pregunta algo sobre ${cliente?.nombre}...`}
              className="flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
