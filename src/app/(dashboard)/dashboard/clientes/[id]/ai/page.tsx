'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { Sparkles, Send, ChevronLeft, Loader2, Bot, User, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/types/database'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { generarPDFPresupuesto } from '@/lib/utils/pdfGenerator'

export default function ClientAIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [fetchingClient, setFetchingClient] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const chat = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/ai/chat',
      body: { clienteId: id },
    }),
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

  const { messages = [], status, append } = chat as any
  const isLoading = status === 'submitted' || status === 'streaming'

  const descargarPDF = (content: string) => {
    const lines = content.split('\n');
    const tableLines = lines.filter(l => l.includes('|') && !l.includes('---'));
    
    const items = tableLines.slice(1)
      .filter(l => !l.toLowerCase().includes('total'))
      .map(l => {
        const cols = l.split('|').map(c => c.trim()).filter(c => c !== '');
        return [cols[0], cols[1], cols[2], cols[3]];
      });

    const totalLine = tableLines.find(l => l.toLowerCase().includes('total'));
    let subtotalValue = 0;
    if (totalLine) {
        const cols = totalLine.split('|').map(c => c.trim()).filter(c => c !== '');
        const lastCol = cols[cols.length - 1];
        subtotalValue = parseFloat(lastCol.replace(/[^0-9,.]/g, '').replace(',', '.'));
    }

    generarPDFPresupuesto({
      clienteNombre: cliente?.nombre || "Cliente",
      clienteNif: (cliente as any)?.nif_cif || "-",
      clienteDireccion: (cliente as any)?.direccion || "-",
      obraTitulo: "Propuesta Técnica ODEPLAC",
      items: items,
      subtotal: subtotalValue.toFixed(2),
      iva: (subtotalValue * 0.21).toFixed(2),
      total: (subtotalValue * 1.21).toFixed(2)
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    if (typeof append === 'function') append({ role: 'user', content: chatInput.trim() });
    setChatInput('');
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/clientes/${id}`}><Button variant="outline" size="icon"><ChevronLeft size={16}/></Button></Link>
          <h1 className="text-3xl font-bold">Asistente IA <Sparkles className="inline ml-2 text-zinc-400" /></h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{cliente?.nombre}</p>
          <p className="text-[10px] uppercase tracking-widest text-green-600 font-bold">Base de datos en tiempo real</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border rounded-xl bg-zinc-50 shadow-inner">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((m: any) => (
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex space-x-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-white border text-zinc-600'}`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-4 rounded-2xl shadow-sm border ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="border-collapse border border-zinc-300 w-full text-sm" {...props} /></div>,
                    th: ({node, ...props}) => <th className="border border-zinc-300 p-2 bg-zinc-100 text-zinc-900" {...props} />,
                    td: ({node, ...props}) => <td className="border border-zinc-300 p-2" {...props} />,
                  }}>{m.content}</ReactMarkdown>
                </div>
              </div>
              
              {m.role === 'model' && m.content.includes('|') && (
                <Button onClick={() => descargarPDF(m.content)} className="mt-3 ml-11 bg-green-600 hover:bg-green-700 text-xs h-8 rounded-full shadow-lg">
                  <FileDown className="mr-2 h-3 w-3" /> Generar Presupuesto PDF
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t">
          <form onSubmit={handleManualSubmit} className="flex space-x-2 max-w-4xl mx-auto">
            <input 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Pregunta o pide un cálculo..." 
              className="flex-1 h-11 px-4 rounded-full border bg-zinc-50 text-zinc-900 text-sm outline-none focus:ring-2 focus:ring-[#295693]" 
            />
            <Button type="submit" disabled={isLoading} className="h-11 w-11 rounded-full bg-zinc-900"><Send size={18} /></Button>
          </form>
        </div>
      </div>
    </div>
  )
}