'use client'

import React, { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    <div className="flex min-h-screen bg-[#295693]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsAIChatOpen(!isAIChatOpen)}
          className="h-14 w-14 bg-white text-[#295693] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border-2 border-white/20"
        >
          {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </button>

        {isAIChatOpen && (
          <div className="absolute bottom-16 right-0 w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col border border-zinc-200 animate-in slide-in-from-bottom-2 overflow-hidden">
            <div className="bg-[#1e3d6b] p-4 text-white font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-blue-300" /> 
              <span className="uppercase tracking-tighter italic font-black">Asistente Odeplac AI</span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
              {messages.length === 0 && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-xs font-bold italic">
                  Hola Juanjo, estoy conectado a tu base de datos. ¿Qué revisamos hoy?
                </div>
              )}
              
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-[#295693] text-white rounded-tr-none' 
                      : 'bg-white text-zinc-800 border border-zinc-200 rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">
                  <Loader2 size={12} className="animate-spin" /> Analizando datos...
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t bg-white flex gap-2">
              <input 
                value={input}
                onChange={handleInputChange}
                className="flex-1 bg-zinc-100 rounded-lg px-3 py-2 text-zinc-900 outline-none text-sm font-bold focus:ring-2 ring-blue-500/20 transition-all" 
                placeholder="Pregunta algo..." 
              />
              <button 
                type="submit" 
                disabled={isLoading || !input}
                className="bg-[#295693] text-white p-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}