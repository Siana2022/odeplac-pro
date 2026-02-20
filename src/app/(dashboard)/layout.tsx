'use client'

import React, { useState } from "react";
// Usamos ruta relativa para asegurar que VS Code lo encuentre
import Sidebar from "../../components/layout/Sidebar";
import { MessageCircle, X, Sparkles, Send } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [input, setInput] = useState("");

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
          <div className="absolute bottom-16 right-0 w-96 h-[550px] bg-white rounded-2xl shadow-2xl flex flex-col border border-zinc-200 animate-in slide-in-from-bottom-2">
            <div className="bg-[#1e3d6b] p-4 text-white font-bold rounded-t-2xl flex items-center gap-2">
              <Sparkles size={18} /> Asistente Odeplac
            </div>
            <div className="flex-1 p-4 text-zinc-800 text-sm overflow-y-auto">
              Hola Juanjo, ¿qué revisamos hoy?
            </div>
            <div className="p-3 border-t flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-zinc-100 rounded-lg px-3 py-2 text-zinc-900 outline-none text-sm" 
                placeholder="Escribe..." 
              />
              <button className="bg-[#295693] text-white p-2 rounded-lg">
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}