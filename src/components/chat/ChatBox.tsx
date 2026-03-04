'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2, BarChart3, Package, Users, Construction } from "lucide-react";

// Definimos las sugerencias rápidas
const SUGGESTIONS = [
  { label: "Seguimiento Obras", query: "¿Qué seguimiento tienen los proyectos?", icon: <BarChart3 size={14} /> },
  { label: "Stock Materiales", query: "¿Cuántos materiales tengo?", icon: <Package size={14} /> },
  { label: "Mis Clientes", query: "¿Quiénes son mis clientes?", icon: <Users size={14} /> },
  { label: "Obra Gran Vía", query: "¿Cómo va la obra de Gran Vía?", icon: <Construction size={14} /> },
];

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    console.log("🚀 [ODEPLAC-AI]: Chat listo con sugerencias.");
  }, []);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  // Función genérica para enviar mensajes (tanto manuales como de botones)
  const sendMessage = async (content: string) => {
    const val = content.trim();
    if (!val || isLoading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: val };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setTextInput("");
    setIsLoading(true);

    try {
      const cleanMessages = newMessages.map(({ role, content }) => ({ role, content }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: cleanMessages }),
      });

      if (!response.ok) throw new Error("Error en la respuesta");

      const data = await response.json();
      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: 'err', role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(textInput);
  };

  if (!mounted) return null;

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999999 }}>
        <button 
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
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '15px', marginTop: '20px' }}>
                <p>Hola Omayra. ¿Qué necesitas consultar hoy?</p>
                {/* Sugerencias iniciales cuando el chat está vacío */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => sendMessage(s.query)}
                      style={{
                        padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1',
                        background: 'white', cursor: 'pointer', fontSize: '13px', color: '#1e3d6b',
                        display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
                      }}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((m: any) => (
              <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
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

          {/* Sugerencias rápidas flotantes sobre el input (opcional) */}
          {messages.length > 0 && !isLoading && (
             <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => sendMessage(s.query)}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', border: '1px solid #295693',
                      background: 'rgba(41, 86, 147, 0.05)', cursor: 'pointer', fontSize: '11px', 
                      color: '#295693', whiteSpace: 'nowrap'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
             </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleFormSubmit} style={{ padding: '16px', borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', gap: '10px' }}>
            <input 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
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