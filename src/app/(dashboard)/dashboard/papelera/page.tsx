'use client'

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trash2, RotateCcw, Calendar, User, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function PapeleraPage() {
  const supabase = createClient();
  const [lista, setLista] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLista = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('presupuestos_generados')
      .select('*')
      .eq('estado', 'papelera')
      .order('created_at', { ascending: false });
    if (!error) setLista(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLista(); }, []);

  const restaurar = async (id: string) => {
    const { error } = await supabase
      .from('presupuestos_generados')
      .update({ estado: 'pendiente' })
      .eq('id', id);
    if (error) return toast.error('Error al restaurar');
    toast.success('Presupuesto restaurado a Pendientes');
    fetchLista();
  };

  const eliminarDefinitivamente = async (id: string) => {
    if (!confirm('¿Eliminar definitivamente? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('presupuestos_generados').delete().eq('id', id);
    if (error) return toast.error('Error al eliminar');
    toast.success('Eliminado definitivamente');
    fetchLista();
  };

  const vaciarPapelera = async () => {
    if (!confirm(`¿Vaciar la papelera? Se eliminarán ${lista.length} presupuesto(s) definitivamente.`)) return;
    const ids = lista.map(p => p.id);
    const { error } = await supabase.from('presupuestos_generados').delete().in('id', ids);
    if (error) return toast.error('Error al vaciar');
    toast.success('Papelera vaciada');
    fetchLista();
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto p-6 lg:p-10 text-white">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-600/20 rounded-xl flex items-center justify-center">
            <Trash2 size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Papelera</h1>
            <p className="text-sm text-zinc-400">Presupuestos eliminados — puedes recuperarlos o borrarlos definitivamente</p>
          </div>
        </div>
        {lista.length > 0 && (
          <button
            onClick={vaciarPapelera}
            className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl hover:bg-red-600/30 transition-all text-sm font-medium"
          >
            <Trash2 size={14} /> Vaciar papelera
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-400">Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-20">
          <Trash2 size={48} className="mx-auto text-zinc-600 mb-4" />
          <p className="text-zinc-400 text-lg">La papelera está vacía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{p.obra_nombre}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><User size={11} /> {p.cliente_nombre}</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(p.created_at).toLocaleDateString('es-ES')}
                  </span>
                  <span className="font-medium text-zinc-300">
                    {Number(p.total_materiales || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => restaurar(p.id)}
                  className="flex items-center gap-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-2 rounded-xl hover:bg-blue-600/30 transition-all text-xs font-medium"
                >
                  <RotateCcw size={13} /> Restaurar
                </button>
                <button
                  onClick={() => eliminarDefinitivamente(p.id)}
                  className="flex items-center gap-1.5 bg-red-600/10 text-red-400 border border-red-500/20 px-3 py-2 rounded-xl hover:bg-red-600/25 transition-all text-xs font-medium"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lista.length > 0 && (
        <div className="mt-6 flex items-start gap-2 text-xs text-zinc-500 bg-white/3 border border-white/8 rounded-xl p-4">
          <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />
          <span>Los presupuestos restaurados vuelven a <strong className="text-zinc-400">Pendientes</strong>. La eliminación definitiva no se puede deshacer.</span>
        </div>
      )}
    </div>
  );
}
