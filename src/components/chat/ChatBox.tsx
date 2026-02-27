'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react'; 

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [textInput, setTextInput] = useState(""); // Gestionamos el texto nosotros
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Solo sacamos lo que realmente funciona bien: mensajes y estado de carga
  const { messages, append, isLoading } = useChat() as any;

  useEffect(() => {
    setMounted(true);
    console.log("🔍 [CHIVATO]: Montado. Usando gestión de texto manual.");
  }, []);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = textInput.trim();
    if (!val || isLoading) return;

    console.log("📩 [CHIVATO]: Enviando manualmente:", val);
    
    try {
      // Usamos 'append' que es la función más estable del SDK
      await append({ role: 'user', content: val });
      setTextInput(""); // Limpiamos el cuadro al enviar
      console.log("✅ [CHIVATO]: Mensaje enviado y cuadro limpiado.");
    } catch (err) {
      console.error("❌ [CHIVATO]: Error al enviar:", err);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* BOTÓN BURBUJA */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999999 }}>
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            height: '64px', width: '64px', backgroundColor: '#295693', color: 'white',
            borderRadius: '50%', border: '4px solid white', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
        </button>
      </div>

      {/* VENTANA DE CHAT */}
      {isOpen && (
        <div style={{ 
          position: 'fixed', bottom: '100px', right: '24px', width: 'calc(100vw - 48px)',
          maxWidth: '400px', height: '600px', backgroundColor: 'white', borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid #e2e8f0',
          zIndex: 999999998, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Cabecera */}
          <div style={{ padding: '16px', background: '#1e3d6b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Sparkles size={18} color="#93c5fd" /> ODEPLAC AI
            </div>
            <X size={24} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
          </div>

          {/* Área de Mensajes */}
          <div ref={scrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '15px', marginTop: '40px' }}>
                Hola Omayra. ¿En qué puedo ayudarte?
              </div>
            )}
            {messages.map((m: any, idx: number) => (
              <div key={m.id || idx} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  padding: '12px 16px', borderRadius: '16px', fontSize: '14px',
                  backgroundColor: m.role === 'user' ? '#295693' : 'white',
                  color: m.role === 'user' ? 'white' : '#000',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ padding: '10px' }}>
                <Loader2 className="animate-spin" size={20} color="#295693" />
              </div>
            )}
          </div>

          {/* Formulario con texto controlado por nosotros */}
          <form 
            onSubmit={handleFormSubmit}
            style={{ padding: '16px', borderTop: '2px solid #f1f5f9', background: 'white', display: 'flex', gap: '10px' }}
          >
            <input 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)} // Esto NO fallará nunca
              placeholder="Escribe aquí..."
              autoFocus
              style={{ 
                flex: 1, padding: '14px', borderRadius: '12px', background: '#fff', 
                border: '2px solid #295693', outline: 'none', fontSize: '16px', 
                color: '#000', fontWeight: 'bold'
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading || !textInput.trim()}
              style={{ padding: '12px', background: '#295693', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', opacity: (isLoading || !textInput.trim()) ? 0.5 : 1 }}
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}