'use client' // Necesario para el estado del botón

import { useState } from "react";
import { Archivo } from "next/font/google";
import { MessageCircle, X } from "lucide-react"; 
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <html lang="es">
      <body className={`${archivo.variable} antialiased font-archivo bg-[#295693]`}>
        {children}
        
        {/* VENTANA DE CHAT GENERAL (Solo se ve si isOpen es true) */}
        {isOpen && (
          <div className="fixed bottom-28 right-10 z-[99999] w-80 h-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-[#295693] p-4 text-white flex justify-between items-center">
              <span className="font-bold">Asistente General</span>
              <X className="cursor-pointer" size={20} onClick={() => setIsOpen(false)} />
            </div>
            <div className="flex-1 p-4 text-zinc-600 text-sm">
              ¡Hola! Soy tu IA de ODEPLAC. Pregúntame lo que quieras sobre normativa o gestión.
            </div>
          </div>
        )}

        {/* BOTÓN FLOTANTE */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-10 right-10 z-[99999] flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#295693] shadow-2xl hover:scale-110 transition-all border-none"
        >
          {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
        </button>
      </body>
    </html>
  );
}