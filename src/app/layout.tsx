'use client'

import { useState, useEffect } from "react";
import { Archivo } from "next/font/google";
import { MessageCircle, X, Send, Loader2, FileDown, Check } from "lucide-react"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generarPDFPresupuesto } from '@/lib/utils/pdfGenerator';
import { supabase } from '@/lib/supabase/client';
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para el desplegable de clientes
  const [clientes, setClientes] = useState<any[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedContent, setSelectedContent] = useState("");

  // Cargar clientes al iniciar
  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase.from('clientes').select('*').order('nombre');
      if (data) setClientes(data);
    };
    fetchClientes();
  }, []);

  const prepararPDF = (content: string) => {
    setSelectedContent(content);
    setShowSelector(true);
  };

  const ejecutarDescarga = (cliente: any) => {
    const cleanContent = selectedContent.replace(/\*\*/g, '').replace(/<br\s*\/?>/gi, '\n');
    const lines = cleanContent.split('\n');
    const tableLines = lines.filter(l => l.includes('|') && !l.includes('---'));
    
    let totalSumado = 0;
    const items = tableLines.slice(1)
      .filter(l => !l.toLowerCase().includes('total') && !l.toLowerCase().includes('concepto'))
      .map(l => {
        const cols = l.split('|').map(c => c.trim()).filter(c => c !== '');
        const coste = parseFloat(cols[3]?.replace(/[^0-9,.]/g, '').replace(',', '.') || "0");
        totalSumado += coste;
        return [cols[0], cols[1], cols[2], cols[3]];
      });

    generarPDFPresupuesto({
      clienteNombre: cliente.nombre,
      clienteNif: cliente.nif_cif || "-",
      clienteDireccion: cliente.direccion || "No registrada",
      obraTitulo: "Presupuesto Técnico ODEPLAC",
      items: items,
      subtotal: totalSumado.toFixed(2)
    });
    
    setShowSelector(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ messages: [...messages, userMsg], clienteId: 'general' }) 
      });
      const data = await res.text();
      setMessages(prev => [...prev, { role: 'model', content: data }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <html lang="es">
      <body className={`${archivo.variable} antialiased font-archivo bg-[#295693]`}>
        {children}
        
        {isOpen && (
          <div className="fixed bottom-28 right-10 z-[99999] w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
            {/* Cabecera */}
            <div className="bg-[#295693] p-4 text-white flex justify-between items-center shadow-md">
              <span className="font-bold">Asistente ODEPLAC</span>
              <X className="cursor-pointer" size={20} onClick={() => setIsOpen(false)} />
            </div>

            {/* Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50 relative">
              
              {/* DESPLEGABLE DE CLIENTES (MODAL INTERNO) */}
              {showSelector && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                  <h3 className="text-[#295693] font-bold mb-4 text-center">¿A qué cliente asignamos el presupuesto?</h3>
                  <div className="w-full space-y-2 max-h-60 overflow-y-auto pr-2">
                    {clientes.map(c => (
                      <button 
                        key={c.id}
                        onClick={() => ejecutarDescarga(c)}
                        className="w-full text-left p-3 rounded-xl border border-zinc-200 hover:border-[#295693] hover:bg-[#295693]/5 transition-all text-sm flex justify-between items-center group"
                      >
                        <span className="font-medium text-zinc-700">{c.nombre}</span>
                        <Check size={14} className="text-[#295693] opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowSelector(false)} className="mt-6 text-zinc-400 text-xs underline">Cancelar</button>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm border ${
                    m.role === 'user' ? 'bg-[#295693] text-white border-[#1e3d6b]' : 'bg-white text-zinc-800 border-zinc-200'
                  }`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                  {m.role === 'model' && m.content.includes('|') && (
                    <button 
                      onClick={() => prepararPDF(m.content)}
                      className="mt-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[10px] px-3 py-1.5 rounded-full shadow-sm"
                    >
                      <FileDown size={14} /> Descargar PDF Oficial
                    </button>
                  )}
                </div>
              ))}
              {isLoading && <Loader2 className="animate-spin text-[#295693] ml-2" size={18} />}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe aquí..." className="flex-1 bg-zinc-100 rounded-full px-4 py-2 text-sm text-zinc-900 outline-none" />
              <button type="submit" className="bg-[#295693] text-white p-2 rounded-full"><Send size={18} /></button>
            </form>
          </div>
        )}

        <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-10 right-10 z-[99999] flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#295693] shadow-2xl transition-all border-none cursor-pointer">
          {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
        </button>
      </body>
    </html>
  );
}