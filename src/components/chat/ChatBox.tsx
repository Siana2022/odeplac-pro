'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
// Usamos la importación que el compilador sí encuentra en tu proyecto
import { useChat } from '@ai-sdk/react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatBox() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Parcheamos el tipado con 'as any' para asegurar que el deploy en Vercel pase
  const chatHelpers = useChat() as any;
  const { messages, input, handleInputChange, handleSubmit, isLoading } = chatHelpers;

  useEffect(() => {
    setMounted(true);
    console.log("🚀 [CHIVATO]: OdeplacAI montado y listo");
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-[9999]">
      {/* Botón Burbuja */}
      <button 
        type="button"
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="h-14 w-14 bg-[#295693] text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white hover:scale-110 transition-all"
      >
        {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Ventana de Chat */}
      {isAIChatOpen && (
        <div className="fixed inset-0 bg-white flex flex-col z-[10000] lg:absolute lg:inset-auto lg:bottom-20 lg:right-0 lg:w-[400px] lg:h-[600px] lg:rounded-3xl lg:shadow-2xl lg:border border-zinc-200 animate-in slide-in-from-bottom-5">
          
          {/* Cabecera Profesional */}
          <div className="bg-[#1e3d6b] p-4 text-white font-bold flex items-center justify-between shrink-0 lg:rounded-t-3xl">
            <div className="flex items-center gap-2 text-sm italic uppercase tracking-wider">
              <Sparkles size={18} className="text-blue-300" /> Odeplac AI
            </div>
            <button onClick={() => setIsAIChatOpen(false)} className="lg:hidden">
              <X size={20} />
            </button>
          </div>

          {/* Chat con histórico */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-zinc-400 text-xs mt-10">
                Hola Omayra, soy OdeplacAI. ¿Qué consulta tienes hoy?
              </div>
            )}
            {messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-[#295693] text-white rounded-tr-none' 
                  : 'bg-white text-zinc-800 border border-zinc-200 rounded-tl-none'
                }`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-zinc-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                  <Loader2 size={16} className="animate-spin text-[#295693]" />
                </div>
              </div>
            )}
          </div>

          {/* Entrada de texto */}
          <form onSubmit={handleSubmit} className="p-4 border-t bg-white flex gap-2 pb-8 lg:pb-4 shrink-0 lg:rounded-b-3xl">
            <input 
              value={input || ''}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-2xl px-4 py-3 text-sm text-zinc-900 outline-none font-bold" 
              placeholder="Escribe aquí..."
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading || !input?.trim()}
              className="bg-[#295693] text-white p-3 rounded-2xl disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}