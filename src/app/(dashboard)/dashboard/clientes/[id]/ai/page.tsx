'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport } from 'ai'
import { Sparkles, Send, ChevronLeft, Loader2, Bot, User, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { generarPDFPresupuesto } from '@/lib/utils/pdfGenerator'

export default function ClientAIPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<any>(null)
  const [chatInput, setChatInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const chat = useChat({
    transport: new TextStreamChatTransport({ api: '/api/ai/chat', body: { clienteId: id } }),
  } as any)

  const { messages = [], status, append } = chat as any
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    supabase.from('clientes').select('*').eq('id', id).single().then(({ data }) => setCliente(data))
  }, [id])

  const descargarPDF = (content: string) => {
    const cleanContent = content.replace(/\*\*/g, '').replace(/<br\s*\/?>/gi, '\n');
    const lines = cleanContent.split('\n');
    const tableLines = lines.filter(l => l.includes('|') && !l.includes('---'));
    
    let subtotalCalculado = 0;
    const items = tableLines.slice(1)
      .filter(l => {
        const low = l.toLowerCase();
        return !low.includes('concepto') && !low.includes('total');
      })
      .map(l => {
        const cols = l.split('|').map(c => c.trim()).filter(c => c !== '');
        const costeCelda = cols[3]?.replace(/[^0-9,.]/g, '').replace(',', '.') || "0";
        subtotalCalculado += parseFloat(costeCelda);
        return [cols[0], cols[1], cols[2], cols[3]];
      });

    generarPDFPresupuesto({
      clienteNombre: cliente?.nombre || "Cliente",
      clienteNif: cliente?.nif_cif || "-",
      clienteDireccion: cliente?.direccion || "Dirección no registrada",
      obraTitulo: "Presupuesto Técnico ODEPLAC",
      items: items,
      subtotal: subtotalCalculado.toFixed(2)
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
      <div className="flex-1 overflow-hidden flex flex-col border rounded-xl bg-zinc-50 shadow-inner">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.map((m: any) => (
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm border ${m.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-800'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
              {m.role === 'model' && m.content.includes('|') && (
                <Button onClick={() => descargarPDF(m.content)} className="mt-3 bg-green-600 hover:bg-green-700 text-xs h-8 rounded-full shadow-lg">
                  <FileDown className="mr-2 h-3 w-3" /> Generar Presupuesto PDF
                </Button>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); append({ role: 'user', content: chatInput }); setChatInput('') }} className="p-4 bg-white border-t flex gap-2">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Escribe..." className="flex-1 h-11 px-4 rounded-full border bg-zinc-50 text-zinc-900 text-sm outline-none" />
          <Button type="submit" disabled={isLoading} className="h-11 w-11 rounded-full bg-zinc-900"><Send size={18} /></Button>
        </form>
      </div>
    </div>
  )
}