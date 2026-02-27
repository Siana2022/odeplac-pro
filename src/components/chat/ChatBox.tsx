'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";
import { useChat } from '@ai-sdk/react'; 

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Usamos el hook y protegemos los valores
  const chatData = useChat() as any;
  const messages = chatData.messages || [];
  const input = chatData.input || '';
  const handleInputChange = chatData.handleInputChange;
  const handleSubmit = chatData.handleSubmit;
  const isLoading = chatData.isLoading;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!mounted) return null;

  return (
    <>
      {/* BOTÓN FLOTANTE */}
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
            <X size={20} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
          </div>

          {/* Mensajes (Texto Plano para evitar errores) */}
          <div ref={scrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '40px' }}>
                Hola Omayra, ¿qué necesitas consultar?
              </div>
            )}
            {messages.map((m: any) => (
              <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  padding: '12px 16px', borderRadius: '16px', fontSize: '14px',
                  backgroundColor: m.role === 'user' ? '#295693' : 'white',
                  color: m.role === 'user' ? 'white' : '#1e293b',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  whiteSpace: 'pre-wrap' // Para que respete los saltos de línea
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ padding: '8px' }}>
                <Loader2 className="animate-spin" size={20} color="#295693" />
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <input 
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe aquí..."
              style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', background: '#f1f5f9', 
                border: 'none', outline: 'none', fontSize: '14px'
              }}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              style={{ padding: '12px', background: '#295693', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}