'use client'

import React from "react";
import Sidebar from "../../components/layout/Sidebar";
import ChatBox from "../../components/chat/ChatBox"; // Importa el nuevo componente

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#295693]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto italic">
          {children}
        </div>
      </main>
      
      {/* Solo ponemos el componente aquí, él gestiona su propio estado sin cerrar el layout */}
      <ChatBox />
    </div>
  );
}