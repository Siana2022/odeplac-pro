'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Sparkles, Send, ChevronLeft, Loader2, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/types/database'
import Link from 'next/link'

export default function ClientAIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [fetchingClient, setFetchingClient] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input = '', handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/ai/chat',
    initialInput: '',
    body: {
      clienteId: id
    },
    onError: (err) => {
      console.error('Chat Error:', err)
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hola, soy tu asistente de ODEPLAC. Estoy analizando los datos del cliente y sus obras. ¿En qué puedo ayudarte hoy?`
      }
    ]
  })

  useEffect(() => {
    const fetchClient = async () => {
      setFetchingClient(true)
      const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (data) setCliente(data)
      setFetchingClient(false)
    }
    fetchClient()
  }, [id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (fetchingClient) return <div className="p-8 text-center text-muted-foreground">Cargando contexto del cliente...</div>

  console.log('Input actual:', input)

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
          <p className="text-xs text-muted-foreground">Contexto real activado</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 scroll-smooth">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-100 rounded-md">
              Error: {error.message}. Verifica la conexión o la clave de API.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex space-x-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-600'}`}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`p-4 rounded-lg shadow-sm border ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}`}>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 text-zinc-500 bg-white border rounded-lg p-3 px-4 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Generando respuesta...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border-t relative z-[999]">
          <form
            onSubmit={handleSubmit}
            className="flex space-x-2"
          >
            <input
              placeholder={`Pregunta sobre ${cliente?.nombre || 'el cliente'} o materiales...`}
              className="flex-1 h-10 px-3 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              value={input || ''}
              onChange={handleInputChange}
              autoFocus
              name="prompt"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={isLoading || !(input || '').trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
