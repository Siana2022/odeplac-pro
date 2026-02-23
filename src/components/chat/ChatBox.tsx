'use client'

import React, { useState } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react';

export default function ChatBox() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (err: any) => {
      console.error("Error crítico de IA:", err);
      alert("Error al conectar con la IA. Revisa la consola.");
    }
  } as any) as any;

  // Forzamos el envío
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    handleSubmit(e);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button 
        type="button"
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="h-14 w-14 bg-white text-[#295693] rounded-full shadow-2xl flex items-center justify-center border-2 border-[#295693]/10 hover:scale-105 transition-transform"
      >
        {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isAIChatOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] md:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-[#1e3d6b] p-5 text-white flex items-center gap-3">
            <Sparkles size={20} className="text-blue-300" /> 
            <span className="font-bold tracking-tight italic uppercase text-sm">Asistente Odeplac AI</span>
          </div>

          {/* Chat */}
          <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
            {messages?.length === 0 && (
              <div className="bg-white p-4 rounded-2xl text-xs font-bold text-[#1e3d6b] border border-zinc-100 shadow-sm italic">
                Hola Juanjo, ¿qué revisamos de las obras hoy?
              </div>
            )}
            {messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold shadow-sm ${
                  m.role === 'user' ? 'bg-[#295693] text-white rounded-tr-none' : 'bg-white text-zinc-800 border border-zinc-100 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 p-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">
                <Loader2 size={12} className="animate-spin" /> Procesando...
              </div>
            )}
          </div>

          {/* Formulario - IMPORTANTE: action lo dejamos vacío y usamos onSubmit */}
          <form onSubmit={handleFormSubmit} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
            <input 
              name="chat-input"
              value={input}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-xl px-4 py-3 text-zinc-900 outline-none text-sm font-bold focus:ring-2 ring-blue-500/20" 
              placeholder="Pregunta algo..." 
              autoComplete="off"
            />
            <button 
              type="submit" 
              className="bg-[#295693] text-white p-3 rounded-xl hover:bg-blue-800 transition-colors shadow-md active:scale-95 flex items-center justify-center min-w-[45px]"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}