'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatBox() {
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
  }, [messages, isOpen]); // También hacemos scroll al abrir

  if (!mounted) return null;

  return (
    <>
      {/* 1. EL BOTÓN - Siempre visible y por encima de todo */}
      <div className="fixed bottom-6 right-6" style={{ zIndex: 9999999 }}>
        <button 
          type="button"
          onClick={() => {
            console.log("🚀 [ODEPLACAI]: Toggle ventana. Nuevo estado:", !isOpen);
            setIsOpen(!isOpen);
          }}
          className="h-16 w-16 bg-[#295693] text-white rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex items-center justify-center border-4 border-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
        >
          {isOpen ? <X size={30} /> : <MessageCircle size={30} />}
        </button>
      </div>

      {/* 2. LA VENTANA - Usamos FIXED absoluto para que no dependa de ningún padre */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-4 left-4 top-4 lg:left-auto lg:top-auto lg:bottom-24 lg:right-6 lg:w-[420px] lg:h-[650px] bg-white flex flex-col rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ zIndex: 9999998 }}
        >
          {/* Cabecera */}
          <div className="bg-[#1e3d6b] p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs">
              <Sparkles size={18} className="text-blue-300" /> Odeplac AI
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded">
              <X size={24} />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-[#f8fafc] space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-zinc-400 text-sm mt-10 italic">
                Hola Omayra, soy OdeplacAI. ¿En qué puedo ayudarte?
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

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-4 border-t bg-white flex gap-2 pb-6">
            <input 
              value={input || ''}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-xl px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-[#295693]" 
              placeholder="Escribe tu consulta..."
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading || !input?.trim()}
              className="bg-[#295693] text-white p-3 rounded-xl disabled:opacity-50 transition-colors"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}