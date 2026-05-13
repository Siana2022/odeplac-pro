'use client'

import React, { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import ChatBox from "../../components/chat/ChatBox";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#295693] overflow-x-hidden">
      {/* Botón de Menú para Móvil */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-[100] p-2 bg-white text-[#295693] rounded-lg shadow-lg"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar con lógica de visibilidad móvil */}
      <div className={`
        fixed inset-y-0 left-0 z-[90] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Overlay para cerrar el menú al tocar fuera en móvil */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[80] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Contenido Principal */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto italic mt-12 lg:mt-0">
          {children}
        </div>
      </main>
      
      {/* Versión e IA */}
      <div className="fixed top-4 right-4 bg-red-500 text-white text-[8px] lg:text-[10px] p-1 z-[9999] rounded">
        v.1.0-AI-MOBILE
      </div>

      <ChatBox />
    </div>
  );
}