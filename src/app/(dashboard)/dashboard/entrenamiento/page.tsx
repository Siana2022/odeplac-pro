'use client'

import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Send, Loader2, Trash2, BookOpen, Layers, Tag, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const EJEMPLOS = [
  'Aprende que para tabiquería sencilla 15mm necesitamos 2 placas de yeso 15mm por m², 1.2 montantes 48mm por metro lineal y 0.5kg de pasta de juntas por m²',
  'Aprende que para falso techo continuo necesitamos 1 placa de yeso 12.5mm por m², 0.9 perfiles primarios por m² y 1.1 varillas cuelgue por m²',
  'Recuerda que el precio de mano de obra para tabiquería sencilla es de 12€ por m²',
  'Aprende que para trasdosado directo necesitamos 1 placa yeso 12.5mm por m² y 1kg de adhesivo por m²',
];

const CATEGORIA_COLORES: Record<string, { bg: string; text: string; border: string }> = {
  sistemas:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  materiales:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  precios:     { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  procesos:    { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  general:     { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

interface Conocimiento {
  id: string;
  pregunta: string;
  respuesta: string;
  keywords: string[];
  categoria: string;
  activo: boolean;
  created_at: string;
}

interface Mensaje {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function EntrenamientoIA() {
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [conocimientos, setConocimientos]   = useState<Conocimiento[]>([]);
  const [mensajes, setMensajes]             = useState<Mensaje[]>([]);
  const [input, setInput]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [stats, setStats]                   = useState({ total: 0, sistemas: 0, precios: 0 });

  // Cargar conocimientos
  const cargarConocimientos = async () => {
    setLoadingKnowledge(true);
    const { data } = await supabase
      .from('ia_conocimientos')
      .select('*')
      .order('created_at', { ascending: false });
    const lista = data || [];
    setConocimientos(lista);
    setStats({
      total:    lista.length,
      sistemas: lista.filter(c => c.categoria === 'sistemas').length,
      precios:  lista.filter(c => c.categoria === 'precios').length,
    });
    setLoadingKnowledge(false);
  };

  useEffect(() => { cargarConocimientos(); }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, isLoading]);

  const enviarMensaje = async (contenido: string) => {
    const val = contenido.trim();
    if (!val || isLoading) return;

    const userMsg: Mensaje = { id: Date.now().toString(), role: 'user', content: val };
    const nuevosMensajes = [...mensajes, userMsg];
    setMensajes(nuevosMensajes);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nuevosMensajes.map(({ role, content }) => ({ role, content })),
          training: true,
        }),
      });
      const data = await response.json();
      setMensajes(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }]);
      // Recargar conocimientos tras entrenar
      await cargarConocimientos();
    } catch {
      toast.error('Error al comunicarse con la IA');
    } finally {
      setIsLoading(false);
    }
  };

  const eliminarConocimiento = async (id: string) => {
    const { error } = await supabase.from('ia_conocimientos').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Conocimiento eliminado');
    cargarConocimientos();
  };

  const toggleActivo = async (id: string, activo: boolean) => {
    await supabase.from('ia_conocimientos').update({ activo: !activo }).eq('id', id);
    cargarConocimientos();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarMensaje(input);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans">

      {/* CABECERA */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-amber-500/20 border border-amber-500/30 p-4 rounded-2xl">
          <GraduationCap size={28} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            Entrenar <span className="text-amber-400">IA</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Enseña a OdeplacAI para que genere presupuestos más precisos
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Conocimientos totales', value: stats.total,    color: 'text-white' },
          { label: 'Sistemas aprendidos',   value: stats.sistemas, color: 'text-blue-400' },
          { label: 'Precios guardados',     value: stats.precios,  color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase text-white/30 mb-1">{s.label}</p>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* PANEL IZQUIERDO — Chat de entrenamiento */}
        <div className="flex flex-col bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-amber-200" style={{ height: '680px' }}>

          {/* Cabecera chat */}
          <div className="bg-amber-700 px-6 py-4 flex items-center gap-3">
            <GraduationCap size={20} className="text-amber-300" />
            <div>
              <p className="font-black text-white text-sm uppercase tracking-widest">Modo Entrenamiento</p>
              <p className="text-amber-300/70 text-[10px]">Todo lo que escribas aquí se guarda como conocimiento</p>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-amber-50 flex flex-col gap-4">
            {mensajes.length === 0 && (
              <div className="text-center py-4">
                <p className="text-amber-800 font-bold text-sm mb-4">¿Qué quieres enseñarme hoy?</p>
                <div className="flex flex-col gap-3">
                  {EJEMPLOS.map((ej, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(ej)}
                      className="text-left p-3 rounded-xl border border-amber-200 bg-white text-xs text-amber-900 hover:bg-amber-100 transition-all italic"
                    >
                      {ej}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-amber-700 text-white'
                    : 'bg-white border border-amber-200 text-zinc-800'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-amber-200 px-4 py-3 rounded-2xl">
                  <Loader2 size={18} className="animate-spin text-amber-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t-2 border-amber-200 bg-white flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enseña algo a la IA... (ej: Aprende que para tabiquería...)"
              className="flex-1 px-4 py-3 rounded-xl border-2 border-amber-300 outline-none text-zinc-800 font-bold text-sm focus:border-amber-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-amber-600 text-white px-4 py-3 rounded-xl disabled:opacity-40 hover:bg-amber-700 transition-all"
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        {/* PANEL DERECHO — Conocimientos guardados */}
        <div className="flex flex-col" style={{ height: '680px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black uppercase text-sm tracking-widest text-white/60 flex items-center gap-2">
              <BookOpen size={16} /> Conocimiento guardado
            </h2>
            <button
              onClick={cargarConocimientos}
              className="text-white/30 hover:text-white transition-all"
              title="Actualizar"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loadingKnowledge ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-white/20" size={32} />
              </div>
            ) : conocimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-white/20 gap-3">
                <BookOpen size={40} />
                <p className="text-sm font-bold uppercase">Aún no hay conocimiento guardado</p>
                <p className="text-xs">Empieza entrenando a la IA en el panel de la izquierda</p>
              </div>
            ) : (
              conocimientos.map(c => {
                const colores = CATEGORIA_COLORES[c.categoria] || CATEGORIA_COLORES.general;
                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-2xl p-4 border ${c.activo ? 'border-zinc-100' : 'border-zinc-200 opacity-50'} shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                          style={{ background: colores.bg, color: colores.text, border: `1px solid ${colores.border}` }}
                        >
                          {c.categoria}
                        </span>
                        {c.categoria === 'sistemas' && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                            <Layers size={10} /> Sistema Maestro
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleActivo(c.id, c.activo)}
                          title={c.activo ? 'Desactivar' : 'Activar'}
                          className="text-zinc-300 hover:text-zinc-600 transition-all"
                        >
                          {c.activo
                            ? <CheckCircle2 size={16} className="text-emerald-500" />
                            : <AlertCircle size={16} className="text-zinc-300" />
                          }
                        </button>
                        <button
                          onClick={() => eliminarConocimiento(c.id)}
                          className="text-zinc-200 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p className="text-zinc-800 font-black text-sm mb-1">{c.pregunta}</p>
                    <p className="text-zinc-400 text-xs line-clamp-2 mb-3">{c.respuesta}</p>

                    {c.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.keywords.slice(0, 5).map((kw, i) => (
                          <span key={i} className="flex items-center gap-1 text-[9px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                            <Tag size={8} /> {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[9px] text-zinc-300 mt-2">
                      {new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
