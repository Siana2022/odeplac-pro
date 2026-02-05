'use client'

import { useState } from "react";
import { Archivo } from "next/font/google";
import { MessageCircle, X, Send, Loader2, FileDown } from "lucide-react"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generarPDFPresupuesto } from '@/lib/utils/pdfGenerator';
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

  const procesarYDescargarPDF = (content: string) => {
    const lines = content.split('\n');
    const tableLines = lines.filter(l => l.includes('|') && !l.includes('---'));
    
    // Extraer filas de materiales
    const items = tableLines.slice(1)
      .filter(l => !l.toLowerCase().includes('total'))
      .map(l => {
        const cols = l.split('|').map(c => c.trim()).filter(c => c !== '');
        return [cols[0], cols[1], cols[2], cols[3]];
      });

    // Extraer el número del total
    const totalLine = tableLines.find(l => l.toLowerCase().includes('total'));
    let subtotalValue = 0;
    if (totalLine) {
        const cols = totalLine.split('|').map(c => c.trim()).filter(c => c !== '');
        const lastCol = cols[cols.length - 1];
        subtotalValue = parseFloat(lastCol.replace(/[^0-9,.]/g, '').replace(',', '.'));
    }

    generarPDFPresupuesto({
      clienteNombre: "Consulta General",
      clienteNif: "-",
      clienteDireccion: "-",
      obraTitulo: "Presupuesto Informativo",
      items: items,
      subtotal: subtotalValue.toFixed(2),
      iva: (subtotalValue * 0.21).toFixed(2),
      total: (subtotalValue * 1.21).toFixed(2)
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], clienteId: 'general' })
      });
      const data = await response.text();
      setMessages(prev => [...prev, { role: 'model', content: data }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Error de conexión." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <html lang="es">
      <body className={`${archivo.variable} antialiased font-archivo bg-[#295693]`}>
        {children}
        
        {isOpen && (
          <div className="fixed bottom-28 right-10 z-[99999] w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-[#295693] p-4 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="font-bold">Asistente ODEPLAC</span>
              </div>
              <X className="cursor-pointer" size={20} onClick={() => setIsOpen(false)} />
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm border ${
                    m.role === 'user' ? 'bg-[#295693] text-white border-[#1e3d6b]' : 'bg-white text-zinc-800 border-zinc-200'
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="border-collapse border border-zinc-300 w-full text-[10px]" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border border-zinc-300 bg-zinc-100 p-1 font-bold" {...props} />,
                        td: ({node, ...props}) => <td className="border border-zinc-300 p-1" {...props} />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  {m.role === 'model' && m.content.includes('|') && (
                    <button 
                      onClick={() => procesarYDescargarPDF(m.content)}
                      className="mt-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-[10px] px-3 py-1.5 rounded-full shadow-sm"
                    >
                      <FileDown size={14} /> Descargar PDF
                    </button>
                  )}
                </div>
              ))}
              {isLoading && <Loader2 className="animate-spin text-[#295693] ml-2" size={18} />}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Escribe aquí..." 
                className="flex-1 bg-zinc-100 rounded-full px-4 py-2 text-sm text-zinc-900 outline-none" 
              />
              <button type="submit" className="bg-[#295693] text-white p-2 rounded-full"><Send size={18} /></button>
            </form>
          </div>
        )}

        <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-10 right-10 z-[99999] flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#295693] shadow-2xl transition-all">
          {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
        </button>
      </body>
    </html>
  );
}