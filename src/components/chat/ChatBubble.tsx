'use client'

import { useChat } from 'ai/react';
import { useState } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {/* Botón Flotante */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#295693] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 border-2 border-white/20"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>

      {/* Ventana de Chat */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[400px] h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-zinc-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-[#295693] p-6 text-white flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Bot size={20} />
            </div>
            <div>
              <p className="font-black uppercase text-[10px] tracking-widest italic leading-none">Asistente</p>
              <h3 className="text-lg font-black tracking-tighter uppercase italic">Odeplac AI</h3>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm font-bold shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-[#295693] text-white rounded-tr-none' 
                    : 'bg-white text-zinc-800 border border-zinc-100 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start italic text-zinc-400 text-[10px] font-black uppercase tracking-widest gap-2 items-center">
                <Loader2 size={12} className="animate-spin" /> Procesando...
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
            <input 
              value={input}
              onChange={handleInputChange}
              placeholder="Pregunta sobre stock u obras..."
              className="flex-1 bg-zinc-100 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-[#295693]/20"
            />
            <button type="submit" className="bg-[#295693] text-white p-3 rounded-xl hover:bg-blue-700 transition-all">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}