'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2 } from "lucide-react";

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    console.log("🚀 [ODEPLAC-AI]: Chat listo y manual.");
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

    // Creamos el mensaje para nuestra pantalla (con ID para React)
    const userMsg = { id: Date.now().toString(), role: 'user', content: val };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setTextInput("");
    setIsLoading(true);

    try {
      // LIMPIEZA CRÍTICA: Groq SOLO acepta 'role' y 'content'
      const cleanMessages = newMessages.map(({ role, content }) => ({ 
        role, 
        content 
      }));

      console.log("📩 [CHIVATO]: Enviando a API datos limpios...");

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: cleanMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la respuesta");
      }

      const data = await response.json();
      console.log("✅ [CHIVATO]: Respuesta de IA recibida.");

      // Añadimos la respuesta a la pantalla
      setMessages((prev) => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: data.content 
      }]);

    } catch (err: any) {
      console.error("❌ [CHIVATO] Error:", err.message);
      setMessages((prev) => [...prev, { 
        id: 'err', 
        role: 'assistant', 
        content: `Error: ${err.message}. Revisa Groq o Vercel.` 
      }]);
    } finally {
      setIsLoading(false);
    }
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
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '15px', marginTop: '40px' }}>
                Hola Omayra. ¿Qué necesitas consultar hoy?
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