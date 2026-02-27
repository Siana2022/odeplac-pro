'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatBox() {
  // Forzamos el inicio en falso, pero añadimos un log para ver si cambia
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat() as any;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!mounted) return null;

  return (
    // Subimos el Z-INDEX a 999999 para que nada lo tape
    <div className="fixed bottom-6 right-6 z-[999999]">
      
      {/* BOTÓN BURBUJA MEJORADO */}
      <button 
        type="button"
        onClick={() => {
          console.log("Presionado botón de OdeplacAI");
          setIsOpen(!isOpen);
        }}
        className="h-16 w-16 bg-[#295693] text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto"
        style={{ touchAction: 'manipulation' }}
      >
        {isOpen ? <X size={30} /> : <MessageCircle size={30} />}
      </button>

      {/* VENTANA DE CHAT */}
      {isOpen && (
        <div className="fixed inset-0 bg-white flex flex-col z-[1000000] lg:absolute lg:inset-auto lg:bottom-20 lg:right-0 lg:w-[420px] lg:h-[650px] lg:rounded-3xl lg:shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:border border-zinc-200 overflow-hidden">
          
          {/* CABECERA */}
          <div className="bg-[#1e3d6b] p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
              <Sparkles size={18} className="text-blue-300" /> Odeplac AI
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X size={24} />
            </button>
          </div>

          {/* MENSAJES */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-[#f8fafc] space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-zinc-400 text-sm mt-10 italic">
                Hola Omayra, ¿qué consulta tienes sobre Odeplac hoy?
              </div>
            )}
            {messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                  m.role === 'user' 
                  ? 'bg-[#295693] text-white rounded-tr-none shadow-md' 
                  : 'bg-white text-zinc-800 border border-zinc-200 rounded-tl-none shadow-sm'
                }`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-zinc-200 p-3 rounded-2xl shadow-sm">
                  <Loader2 size={18} className="animate-spin text-[#295693]" />
                </div>
              </div>
            )}
          </div>

          {/* INPUT */}
          <form onSubmit={handleSubmit} className="p-4 border-t bg-white flex gap-2 pb-10 lg:pb-4">
            <input 
              value={input || ''}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-xl px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#295693]" 
              placeholder="Escribe tu consulta..."
            />
            <button 
              type="submit" 
              disabled={isLoading || !input?.trim()}
              className="bg-[#295693] text-white p-3 rounded-xl disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}