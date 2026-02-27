'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatBox() {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Usamos las funciones nativas del SDK para evitar errores de tipos
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  useEffect(() => {
    setMounted(true);
    console.log("🚀 [CHIVATO]: Componente ChatBox montado");
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-[9999]">
      <button 
        type="button"
        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
        className="h-14 w-14 bg-[#295693] text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white hover:scale-110 transition-all"
      >
        {isAIChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {isAIChatOpen && (
        <div className="fixed inset-0 bg-white flex flex-col z-[10000] lg:absolute lg:inset-auto lg:bottom-20 lg:right-0 lg:w-[400px] lg:h-[600px] lg:rounded-3xl lg:shadow-2xl lg:border border-zinc-200 animate-in slide-in-from-bottom-5">
          <div className="bg-[#1e3d6b] p-4 text-white font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm italic uppercase tracking-wider">
              <Sparkles size={18} className="text-blue-300" /> Odeplac AI
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-zinc-50 space-y-4">
            {messages.map((m) => (
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
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t bg-white flex gap-2 pb-8 lg:pb-4 shrink-0">
            <input 
              value={input}
              onChange={handleInputChange}
              className="flex-1 bg-zinc-100 rounded-2xl px-4 py-3 text-sm text-zinc-900 outline-none font-bold" 
              placeholder="Escribe aquí..."
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading}
              className="bg-[#295693] text-white p-3 rounded-2xl disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}