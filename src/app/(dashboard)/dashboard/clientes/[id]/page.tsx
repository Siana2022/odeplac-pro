'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  User, Mail, Phone, Hash, Save, Trash2, ArrowLeft, Loader2,
  MapPin, FileText, Construction, Clock, CheckCircle2, AlertCircle,
  Euro, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const ESTADO_PRESUPUESTO: Record<string, { label: string; color: string }> = {
  borrador:  { label: 'Borrador',  color: 'bg-zinc-100 text-zinc-500' },
  enviado:   { label: 'Enviado',   color: 'bg-blue-50 text-blue-600' },
  aprobado:  { label: 'Aprobado',  color: 'bg-green-50 text-green-600' },
  rechazado: { label: 'Rechazado', color: 'bg-red-50 text-red-500' },
  pendiente: { label: 'Pendiente', color: 'bg-amber-50 text-amber-600' },
};

const ESTADO_OBRA: Record<string, { label: string; color: string }> = {
  lead:        { label: 'Lead',        color: 'bg-zinc-100 text-zinc-500' },
  presupuesto: { label: 'Presupuesto', color: 'bg-blue-50 text-blue-600' },
  curso:       { label: 'En curso',    color: 'bg-amber-50 text-amber-600' },
  terminado:   { label: 'Terminada',   color: 'bg-green-50 text-green-600' },
};

export default function FichaClientePage() {
  const params  = useParams();
  const id      = params.id as string;
  const router  = useRouter();
  const supabase = createClient();

  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);
  const [cliente, setCliente]   = useState<any>(null);

  // Historial
  const [presupuestos, setPresupuestos] = useState<any[]>([]);
  const [obras, setObras]               = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchCliente(), fetchObras()]).finally(() => setLoading(false));
  }, [id]);

  const fetchCliente = async () => {
    const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
    if (error) { toast.error('No se encontró el cliente'); router.push('/dashboard/clientes'); return; }
    setCliente(data);
    // Presupuestos por nombre de cliente (texto)
    if (data?.nombre) {
      const { data: pres } = await supabase
        .from('presupuestos_generados')
        .select('id, obra_nombre, numero_presupuesto, total_materiales, estado, created_at')
        .ilike('cliente_nombre', `%${data.nombre}%`)
        .order('created_at', { ascending: false });
      setPresupuestos(pres || []);
    }
  };

  const fetchObras = async () => {
    const { data } = await supabase
      .from('obras')
      .select('id, titulo, estado, total_presupuesto, created_at, fecha_inicio, fecha_fin')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false });
    setObras(data || []);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const { error } = await supabase.from('clientes').update({
      nombre: cliente.nombre, email: cliente.email,
      telefono: cliente.telefono, nif_cif: cliente.nif_cif,
      direccion: cliente.direccion,
    }).eq('id', id);
    if (error) toast.error('Error al actualizar: ' + error.message);
    else toast.success('Ficha actualizada correctamente');
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm('¿Seguro que quieres eliminar a este cliente?')) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Cliente eliminado'); router.push('/dashboard/clientes'); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen text-white">
      <Loader2 className="animate-spin text-blue-400 mb-4" size={48} />
      <p className="font-bold uppercase tracking-widest text-xs opacity-50">Cargando ficha...</p>
    </div>
  );

  if (!cliente) return null;

  // Stats
  const totalFacturado = presupuestos
    .filter(p => p.estado === 'aprobado')
    .reduce((s, p) => s + (p.total_materiales || 0), 0);
  const obraEnCurso = obras.filter(o => o.estado === 'curso').length;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Volver */}
      <button onClick={() => router.push('/dashboard/clientes')}
        className="flex items-center gap-2 text-blue-200/40 hover:text-white transition-all group"
      >
        <ArrowLeft size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">Volver a Clientes</span>
      </button>

      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-white">{cliente.nombre}</h1>
          <p className="text-blue-200/40 text-[10px] font-bold uppercase tracking-widest mt-1">Ficha de cliente</p>
        </div>
        <button onClick={handleDelete}
          className="bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-3 rounded-2xl transition-all flex items-center gap-2 border border-red-500/20 font-bold text-[10px] uppercase tracking-widest"
        >
          <Trash2 size={16} /> Eliminar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Presupuestos',    value: presupuestos.length,   icon: FileText,       color: 'text-blue-300' },
          { label: 'Obras',           value: obras.length,           icon: Construction,   color: 'text-amber-300' },
          { label: 'Obras en curso',  value: obraEnCurso,            icon: Clock,          color: 'text-green-300' },
          { label: 'Facturado aprob.', value: fmt(totalFacturado),   icon: Euro,           color: 'text-purple-300' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-2">
            <s.icon size={20} className={s.color} />
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-[9px] font-black uppercase text-blue-200/40 tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Formulario datos */}
      <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 backdrop-blur-xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
        <div className="md:col-span-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-200/50 italic">Datos de contacto</h2>
        </div>
        {[
          { label: 'Nombre / Razón Social', key: 'nombre',    Icon: User },
          { label: 'CIF / NIF',             key: 'nif_cif',   Icon: Hash },
          { label: 'Email',                  key: 'email',     Icon: Mail },
          { label: 'Teléfono',               key: 'telefono',  Icon: Phone },
        ].map(f => (
          <div key={f.key} className="space-y-2">
            <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">{f.label}</label>
            <div className="relative">
              <f.Icon className="absolute left-5 top-5 text-blue-300/30" size={20} />
              <input
                className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold text-white"
                value={cliente[f.key] || ''}
                onChange={e => setCliente({ ...cliente, [f.key]: e.target.value })}
              />
            </div>
          </div>
        ))}
        <div className="md:col-span-2 space-y-2">
          <label className="text-[10px] uppercase font-black text-blue-200/40 ml-4 tracking-widest">Dirección</label>
          <div className="relative">
            <MapPin className="absolute left-5 top-5 text-blue-300/30" size={20} />
            <input
              className="w-full bg-white/5 border border-white/10 p-5 pl-14 rounded-2xl outline-none focus:border-blue-400 transition-all font-bold text-white"
              value={cliente.direccion || ''}
              onChange={e => setCliente({ ...cliente, direccion: e.target.value })}
            />
          </div>
        </div>
        <div className="md:col-span-2 pt-4">
          <button type="submit" disabled={updating}
            className="w-full bg-white text-[#1e3d6b] p-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 hover:bg-blue-50 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50"
          >
            {updating ? <Loader2 className="animate-spin" /> : <Save size={22} />}
            Actualizar Datos
          </button>
        </div>
      </form>

      {/* Historial presupuestos */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-200/50 italic flex items-center gap-3">
          <FileText size={16} /> Presupuestos ({presupuestos.length})
        </h2>
        {presupuestos.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
            <p className="text-blue-200/30 font-black uppercase text-xs tracking-widest">Sin presupuestos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {presupuestos.map(p => {
              const est = ESTADO_PRESUPUESTO[p.estado] || ESTADO_PRESUPUESTO['borrador'];
              return (
                <div key={p.id}
                  className="bg-white rounded-[2rem] p-6 flex items-center justify-between shadow-lg border border-zinc-100 hover:ring-4 hover:ring-blue-500/10 transition-all cursor-pointer"
                  onClick={() => router.push('/dashboard/presupuestos')}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl"><FileText size={18} className="text-[#295693]" /></div>
                    <div>
                      <p className="font-black text-zinc-900">{p.obra_nombre || 'Sin nombre'}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {p.numero_presupuesto ? `#${p.numero_presupuesto} · ` : ''}
                        {new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${est.color}`}>{est.label}</span>
                    <p className="font-black text-[#295693] text-lg">{fmt(p.total_materiales || 0)}</p>
                    <ChevronRight size={16} className="text-zinc-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial obras */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-200/50 italic flex items-center gap-3">
          <Construction size={16} /> Obras ({obras.length})
        </h2>
        {obras.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
            <p className="text-blue-200/30 font-black uppercase text-xs tracking-widest">Sin obras</p>
          </div>
        ) : (
          <div className="space-y-3">
            {obras.map(o => {
              const est = ESTADO_OBRA[o.estado] || ESTADO_OBRA['lead'];
              return (
                <div key={o.id}
                  className="bg-white rounded-[2rem] p-6 flex items-center justify-between shadow-lg border border-zinc-100 hover:ring-4 hover:ring-blue-500/10 transition-all cursor-pointer"
                  onClick={() => router.push('/dashboard/obras')}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-50 p-3 rounded-2xl"><Construction size={18} className="text-amber-500" /></div>
                    <div>
                      <p className="font-black text-zinc-900">{o.titulo}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {o.fecha_inicio
                          ? `Inicio: ${new Date(o.fecha_inicio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : `Alta: ${new Date(o.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        }
                        {o.fecha_fin && ` · Fin: ${new Date(o.fecha_fin + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${est.color}`}>{est.label}</span>
                    {o.total_presupuesto > 0 && (
                      <p className="font-black text-[#295693] text-lg">{fmt(o.total_presupuesto)}</p>
                    )}
                    <ChevronRight size={16} className="text-zinc-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
