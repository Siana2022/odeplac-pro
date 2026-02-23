'use client'

import React, { useState } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react';

export default function ChatBox() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    // Esto nos ayudará a ver el error en pantalla si la API falla
    onError: (err) => console.error("Error de la IA:", err)
  } as any) as any;

  // Función para evitar que el formulario recargue la página
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault(); // CRUCIAL: Detiene el refresco de página
    e.stopPropagation(); // Detiene que el evento suba al layout
    if (!input.trim()) return;
    handleSubmit(e);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button 
        type="button"
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="h-14 w-14 bg-white text-[#295693] rounded-full shadow-2xl flex items-center justify-center border-2 border-white/20"
      >
        {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isAIChatOpen && (
        <div className="absolute bottom-16 right-0 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
          <div className="bg-[#1e3d6b] p-4 text-white font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-blue-300" /> 
            <span className="text-sm">Asistente Odeplac AI</span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
            {messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' ? 'bg-[#295693] text-white' : 'bg-white text-zinc-800 border'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {error && (
              <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded">
                Error: {error.message}
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="p-3 border-t bg-white flex gap-2">
            <input 
              value={input}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-lg px-3 py-2 text-zinc-900 outline-none text-sm" 
              placeholder="Escribe..." 
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#295693] text-white p-2 rounded-lg"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}