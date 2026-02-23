'use client'

import React, { useState, useEffect } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react';

export default function ChatBox() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onResponse: (response: any) => {
      console.log("Respuesta de la API recibida:", response.status);
    },
    onError: (err: any) => {
      console.error("Error en useChat:", err);
    }
  } as any) as any;

  const onSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || input.trim() === "") return;
    handleSubmit(e);
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button 
        type="button"
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="h-14 w-14 bg-white text-[#295693] rounded-full shadow-2xl flex items-center justify-center border-2 border-zinc-200"
      >
        {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isAIChatOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
          <div className="bg-[#1e3d6b] p-4 text-white font-bold flex items-center gap-2 text-sm italic uppercase">
            <Sparkles size={18} /> Asistente Odeplac
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
            {messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold shadow-sm ${
                  m.role === 'user' ? 'bg-[#295693] text-white' : 'bg-white text-zinc-800 border'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 p-2 text-[10px] font-black text-zinc-400 uppercase animate-pulse">
                <Loader2 size={12} className="animate-spin" /> Pensando...
              </div>
            )}
          </div>

          <form onSubmit={onSubmitManual} className="p-3 border-t bg-white flex gap-2">
            <input 
              value={input}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none font-bold" 
              placeholder="Pregunta algo..." 
            />
            <button 
              type="submit" 
              className="bg-[#295693] text-white p-2 rounded-xl"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}