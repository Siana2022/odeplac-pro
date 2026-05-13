'use client'

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Sparkles, Send, Loader2, BarChart3, Package, Users, Construction, GraduationCap } from "lucide-react";

const SUGGESTIONS = [
  { label: "Seguimiento Obras",  query: "¿Qué seguimiento tienen los proyectos?", icon: <BarChart3 size={14} /> },
  { label: "Stock Materiales",   query: "¿Cuántos materiales tengo?",             icon: <Package size={14} /> },
  { label: "Mis Clientes",       query: "¿Quiénes son mis clientes?",             icon: <Users size={14} /> },
  { label: "Obra Gran Vía",      query: "¿Cómo va la obra de Gran Vía?",          icon: <Construction size={14} /> },
];

const TRAINING_SUGGESTIONS = [
  "Aprende que para tabiquería sencilla necesitamos...",
  "Cuando pregunten por falso techo continuo, la respuesta es...",
  "Recuerda que el precio de mano de obra por m² es...",
  "Aprende que un trasdosado lleva...",
];

export default function ChatBox() {
  const [isOpen,       setIsOpen]       = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [textInput,    setTextInput]    = useState("");
  const [messages,     setMessages]     = useState<any[]>([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [trainingMode, setTrainingMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  const sendMessage = async (content: string, forceTraining = false) => {
    const val = content.trim();
    if (!val || isLoading) return;

    const isTraining = forceTraining || trainingMode;

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
        body: JSON.stringify({ messages: cleanMessages, training: isTraining }),
      });

      if (!response.ok) throw new Error("Error en la respuesta");
      const data = await response.json();
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(textInput);
  };

  const toggleTraining = () => {
    setTrainingMode(prev => !prev);
    setMessages([]);
    setTextInput("");
  };

  if (!mounted) return null;

  const headerBg    = trainingMode ? '#92400e' : '#1e3d6b';
  const accentColor = trainingMode ? '#f59e0b' : '#295693';
  const inputBorder = trainingMode ? '#f59e0b' : '#295693';

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999999 }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            height: '64px', width: '64px',
            backgroundColor: trainingMode ? '#92400e' : '#295693',
            color: 'white', borderRadius: '50%',
            border: `4px solid ${trainingMode ? '#f59e0b' : 'white'}`,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {isOpen ? <X size={32} /> : trainingMode ? <GraduationCap size={32} /> : <MessageCircle size={32} />}
        </button>
      </div>

      {/* VENTANA DE CHAT */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '100px', right: '24px',
          width: 'calc(100vw - 48px)', maxWidth: '400px', height: '620px',
          backgroundColor: 'white', borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          border: `2px solid ${trainingMode ? '#f59e0b' : '#e2e8f0'}`,
          zIndex: 999999998, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}>

          {/* Cabecera */}
          <div style={{ padding: '14px 16px', background: headerBg, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              {trainingMode
                ? <><GraduationCap size={18} color="#fcd34d" /> MODO ENTRENAMIENTO</>
                : <><Sparkles size={18} color="#93c5fd" /> ODEPLAC AI</>
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Botón toggle entrenamiento */}
              <button
                onClick={toggleTraining}
                title={trainingMode ? "Salir del modo entrenamiento" : "Activar modo entrenamiento"}
                style={{
                  background: trainingMode ? '#fcd34d' : 'rgba(255,255,255,0.15)',
                  border: 'none', borderRadius: '8px', padding: '5px 10px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  color: trainingMode ? '#92400e' : 'white', fontSize: '11px', fontWeight: 'bold',
                  transition: 'all 0.2s',
                }}
              >
                <GraduationCap size={14} />
                {trainingMode ? 'Salir' : 'Entrenar'}
              </button>
              <X size={22} onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }} />
            </div>
          </div>

          {/* Banner modo entrenamiento */}
          {trainingMode && (
            <div style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '10px 16px', fontSize: '12px', color: '#92400e' }}>
              🎓 <strong>Modo Entrenamiento activo.</strong> Enseña a la IA escribiendo naturalmente.<br />
              <span style={{ opacity: 0.8 }}>Ej: <em>"Aprende que para tabiquería sencilla necesitamos..."</em></span>
            </div>
          )}

          {/* Área de mensajes */}
          <div ref={scrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', background: trainingMode ? '#fffdf5' : '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '16px' }}>
                {trainingMode ? (
                  <>
                    <p style={{ color: '#92400e', fontWeight: 'bold', marginBottom: '12px' }}>¿Qué quieres enseñarme hoy?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                      {TRAINING_SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setTextInput(s)}
                          style={{
                            padding: '10px 12px', borderRadius: '10px',
                            border: '1px solid #fcd34d', background: '#fffbeb',
                            cursor: 'pointer', fontSize: '12px', color: '#92400e',
                            textAlign: 'left', fontStyle: 'italic',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: '16px' }}>Hola. ¿Qué necesitas consultar hoy?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s.query)}
                          style={{
                            padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1',
                            background: 'white', cursor: 'pointer', fontSize: '13px', color: '#1e3d6b',
                            display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                          }}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {messages.map((m: any) => (
              <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '12px 16px', borderRadius: '16px', fontSize: '14px',
                  backgroundColor: m.role === 'user'
                    ? (trainingMode ? '#92400e' : '#295693')
                    : 'white',
                  color: m.role === 'user' ? 'white' : '#000',
                  border: m.role === 'user' ? 'none' : `1px solid ${trainingMode ? '#fcd34d' : '#e2e8f0'}`,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ padding: '10px' }}>
                <Loader2 className="animate-spin" size={20} color={accentColor} />
              </div>
            )}
          </div>

          {/* Sugerencias rápidas */}
          {messages.length > 0 && !isLoading && !trainingMode && (
            <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.query)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', border: '1px solid #295693',
                    background: 'rgba(41,86,147,0.05)', cursor: 'pointer',
                    fontSize: '11px', color: '#295693', whiteSpace: 'nowrap',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleFormSubmit} style={{ padding: '16px', borderTop: `1px solid ${trainingMode ? '#fcd34d' : '#e2e8f0'}`, background: 'white', display: 'flex', gap: '10px' }}>
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={trainingMode ? "Enseña algo a la IA..." : "Escribe aquí..."}
              autoFocus
              style={{
                flex: 1, padding: '14px', borderRadius: '12px', background: '#fff',
                border: `2px solid ${inputBorder}`, outline: 'none',
                fontSize: '15px', color: '#000', fontWeight: 'bold',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !textInput.trim()}
              style={{
                padding: '12px', background: accentColor, color: 'white',
                borderRadius: '12px', border: 'none', cursor: 'pointer',
                opacity: (isLoading || !textInput.trim()) ? 0.5 : 1,
                transition: 'background 0.2s',
              }}
            >
              <Send size={22} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
