'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { Sparkles, Send, ChevronLeft, Loader2, Bot, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/types/database'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ClientAIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [fetchingClient, setFetchingClient] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const chat = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/ai/chat',
      body: {
        clienteId: id
      },
    }),
    onError: (err: Error) => {
      console.error('Chat Error:', err)
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hola, soy tu asistente de ODEPLAC. Estoy analizando los datos del cliente y sus obras. ¿En qué puedo ayudarte hoy?`
      }
    ]
  } as any)

  useEffect(() => {
    const fetchClient = async () => {
      setFetchingClient(true)
      const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (data) setCliente(data)
      setFetchingClient(false)
    }
    fetchClient()
  }, [id])

  const { messages = [], error, status, append, sendMessage } = chat as any
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (fetchingClient) return <div className="p-8 text-center text-muted-foreground italic">Cargando contexto de inteligencia artificial...</div>

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const val = (chatInput || '').trim()
    if (!val || isLoading) return

    if (typeof append === 'function') {
      append({ role: 'user', content: val })
    } else if (typeof sendMessage === 'function') {
      sendMessage({ text: val })
    }

    setChatInput('')
  }

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
          <p className="text-sm font-medium">{cliente?.nombre || 'Cliente'}</p>
          <p className="text-[10px] uppercase tracking-widest text-green-600 font-bold">Contexto real activado</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border rounded-xl bg-zinc-50 dark:bg-zinc-900 shadow-inner">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 scroll-smooth">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-100 rounded-md">
              Error de conexión: {error.message}.
            </div>
          )}
          
          {messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex space-x-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-white border text-zinc-600'}`}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm border ${m.role === 'user' ? 'bg-zinc-900 text-white border-zinc-800' : 'bg-white text-zinc-800 border-zinc-200'}`}>
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-4">
                            <table className="border-collapse border border-zinc-300 w-full" {...props} />
                          </div>
                        ),
                        th: ({node, ...props}) => <th className={`border border-zinc-300 p-2 font-bold text-left ${m.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-800'}`} {...props} />,
                        td: ({node, ...props}) => <td className="border border-zinc-300 p-2" {...props} />,
                      }}
                    >
                      {m.content || (m.parts && m.parts.map((p: any) => p.text).join(''))}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-3 text-zinc-500 bg-white border border-zinc-200 rounded-full py-2 px-4 shadow-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] font-medium uppercase tracking-tighter">Odeplac AI está pensando...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border-t">
          <form onSubmit={handleManualSubmit} className="flex space-x-2 max-w-4xl mx-auto">
            <input
              placeholder={`Pregunta sobre las obras de ${cliente?.nombre || 'este cliente'}...`}
              className="flex-1 h-11 px-4 rounded-full border border-zinc-200 bg-zinc-50 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={isLoading || !chatInput.trim()} className="h-11 w-11 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-transform active:scale-95">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}