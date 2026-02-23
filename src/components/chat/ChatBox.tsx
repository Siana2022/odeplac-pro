'use client'

import React, { useState, useEffect } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react';

export default function ChatBox() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("ChatBox montado correctamente");
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onResponse: (response) => {
      console.log("Respuesta de la API recibida:", response.status);
    },
    onError: (err) => {
      console.error("Error en useChat:", err);
    }
  } as any) as any;

  // Función de envío manual para rastrear el fallo
  const onSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("--- INTENTO DE ENVÍO ---");
    console.log("Input actual:", input);
    
    if (!input || input.trim() === "") {
      console.warn("Envío cancelado: Input vacío");
      return;
    }

    try {
      console.log("Llamando a handleSubmit de la SDK...");
      handleSubmit(e);
      console.log("handleSubmit ejecutado sin errores de código");
    } catch (error) {
      console.error("Fallo crítico al ejecutar handleSubmit:", error);
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button 
        type="button"
        onClick={() => {
          console.log("Burbuja clickeada. Estado anterior:", isAIChatOpen);
          setIsAIChatOpen(!isAIChatOpen);
        }}
        className="h-14 w-14 bg-white text-[#295693] rounded-full shadow-2xl flex items-center justify-center border-2 border-zinc-200"
      >
        {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isAIChatOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden shadow-black/20">
          <div className="bg-[#1e3d6b] p-4 text-white font-bold flex items-center gap-2 text-sm italic uppercase tracking-tighter">
            <Sparkles size={18} /> Asistente Odeplac
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
            {messages?.length === 0 && (
              <div className="text-[10px] text-zinc-400 font-bold uppercase text-center py-10">
                Escribe una pregunta para empezar
              </div>
            )}
            {messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold shadow-sm ${
                  m.role === 'user' ? 'bg-[#295693] text-white' : 'bg-white text-zinc-800 border'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
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
              className="bg-[#295693] text-white p-2 rounded-xl active:scale-95 transition-transform"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}