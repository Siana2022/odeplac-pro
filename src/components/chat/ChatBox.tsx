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
    console.log("🚀 [CHIVATO]: Chat manual activado. Cero librerías, cero errores.");
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

    console.log("📩 [CHIVATO]: Enviando vía FETCH manual:", val);
    
    // 1. Añadimos mensaje del usuario localmente
    const userMsg = { id: Date.now().toString(), role: 'user', content: val };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setTextInput("");
    setIsLoading(true);

    try {
      // 2. Llamada directa a tu API de Groq
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Error en la respuesta de OdeplacAI");

      const data = await response.json();
      console.log("✅ [CHIVATO]: Respuesta recibida:", data);

      // 3. Añadimos respuesta de la IA
      setMessages((prev) => [...prev, data]);
    } catch (err: any) {
      console.error("❌ [CHIVATO]: Error crítico:", err.message);
      setMessages((prev) => [...prev, { 
        id: 'err', 
        role: 'assistant', 
        content: "Lo siento Omayra, ha habido un problema de conexión. ¿Puedes reintentarlo?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
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

      {isOpen && (
        <div style={{ 
          position: 'fixed', bottom: '100px', right: '24px', width: 'calc(100vw - 48px)',
          maxWidth: '400px', height: '600px', backgroundColor: 'white', borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid #e2e8f0',
          zIndex: 999999998, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px', background: '#1e3d6b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Sparkles size={18} color="#93c5fd" /> ODEPLAC AI
            </div>
            <X size={24} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
          </div>

          <div ref={scrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '15px', marginTop: '40px' }}>
                Hola Omayra. Ahora sí, ¿qué necesitas consultar?
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

          <form onSubmit={handleFormSubmit} style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
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
              style={{ padding: '12px', background: '#295693', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}