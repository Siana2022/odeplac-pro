'use client'

import { useState } from "react";
import { Archivo } from "next/font/google";
import { MessageCircle, X, Send, Loader2 } from "lucide-react"; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          clienteId: 'general'
        })
      });

      const data = await response.text();
      setMessages(prev => [...prev, { role: 'model', content: data }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', content: "Error al conectar. Revisa la consola." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <html lang="es">
      <body className={`${archivo.variable} antialiased font-archivo bg-[#295693]`}>
        {children}
        
        {/* VENTANA DE CHAT GENERAL */}
        {isOpen && (
          <div className="fixed bottom-28 right-10 z-[99999] w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 animate-in fade-in slide-in-from-bottom-4">
            {/* Cabecera */}
            <div className="bg-[#295693] p-4 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="font-bold">Asistente ODEPLAC</span>
              </div>
              <X className="cursor-pointer hover:rotate-90 transition-transform" size={20} onClick={() => setIsOpen(false)} />
            </div>

            {/* Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50">
              {messages.length === 0 && (
                <p className="text-zinc-400 text-center text-sm mt-10">
                  Hola Juanjo, ¿en qué puedo ayudarte hoy? <br/> Pregúntame sobre normativa o gestión.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm shadow-sm border ${
                    m.role === 'user' 
                      ? 'bg-[#295693] text-white border-[#1e3d6b] rounded-tr-none' 
                      : 'bg-white text-zinc-800 border-zinc-200 rounded-tl-none'
                  }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => (
                          <div className="overflow-x-auto my-2">
                            <table className="border-collapse border border-zinc-300 w-full text-[11px]" {...props} />
                          </div>
                        ),
                        th: ({node, ...props}) => <th className="border border-zinc-300 bg-zinc-100 p-1 font-bold text-zinc-700" {...props} />,
                        td: ({node, ...props}) => <td className="border border-zinc-300 p-1" {...props} />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-zinc-100 rounded-tl-none">
                    <Loader2 className="animate-spin text-[#295693]" size={18} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta..."
                className="flex-1 bg-zinc-100 border-none rounded-full px-4 py-2 text-sm text-zinc-800 focus:ring-2 focus:ring-[#295693] outline-none"
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-[#295693] text-white p-2 rounded-full hover:scale-110 transition-transform disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {/* BOTÓN FLOTANTE */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-10 right-10 z-[99999] flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#295693] shadow-2xl hover:scale-110 transition-all border-none cursor-pointer"
        >
          {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
        </button>
      </body>
    </html>
  );
}