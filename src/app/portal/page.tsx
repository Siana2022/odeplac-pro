'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Layout, Clock, CheckCircle2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PortalCliente() {
  const [obras, setObras] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchMisObras = async () => {
      // Gracias al SQL que pusimos arriba, esta consulta 
      // traerá automáticamente SOLO lo que le pertenece.
      const { data } = await supabase.from('obras').select('*, obra_seguimiento(*)');
      setObras(data || []);
    };
    fetchMisObras();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex justify-between items-center bg-[#295693] p-8 rounded-[3rem] text-white shadow-2xl">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">ODEPLAC</h1>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Portal del Cliente</p>
          </div>
          <button onClick={handleLogout} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
            <LogOut size={20} />
          </button>
        </header>

        {obras.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-zinc-200">
             <p className="text-zinc-400 font-black uppercase italic">No hay obras asignadas a tu cuenta todavía.</p>
          </div>
        ) : (
          obras.map(obra => (
            <div key={obra.id} className="bg-white rounded-[3rem] p-10 shadow-xl border border-zinc-100 space-y-8">
              <div className="flex justify-between items-start">
                <h2 className="text-3xl font-black uppercase italic text-[#295693] tracking-tighter">{obra.titulo}</h2>
                <span className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  {obra.estado}
                </span>
              </div>

              {/* BARRA DE PROGRESO ODEPLAC STYLE */}
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black text-zinc-500 uppercase italic">
                  <span>Progreso de ejecución</span>
                  <span className="text-[#295693]">{obra.porcentaje_avance}%</span>
                </div>
                <div className="h-6 bg-zinc-100 rounded-full overflow-hidden p-1 shadow-inner">
                  <div 
                    className="h-full bg-[#295693] rounded-full transition-all duration-1000 flex items-center justify-end px-2 shadow-lg" 
                    style={{ width: `${obra.porcentaje_avance}%` }}
                  />
                </div>
              </div>

              {/* SEGUIMIENTO */}
              <div className="pt-8 border-t border-zinc-50 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Diario de seguimiento</h3>
                <div className="space-y-4">
                  {obra.obra_seguimiento?.map((s: any) => (
                    <div key={s.id} className="flex gap-4 p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 group hover:bg-white transition-all">
                      <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <p className="text-sm font-bold text-zinc-600 leading-relaxed">{s.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}