'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, Search, Loader2, TrendingUp, Trash2, Eye, X, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';

export default function GastosMaterialPage() {
  const supabase = createClient();
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [totalMes, setTotalMes] = useState(0);
  const [selectedGasto, setSelectedGasto] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { fetchGastos(); }, []);

  const parseNumeric = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val || val === '') return 0;
    let str = val.toString().replace(/[€\s]/g, '');
    if (str.includes(',') && str.includes('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    }
    const final = parseFloat(str);
    return isNaN(final) ? 0 : final;
  };

  const fetchGastos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gastos_materiales').select('*').order('fecha_factura', { ascending: false });
      if (error) throw error;
      setGastos(data || []);
      const total = (data || []).reduce((acc, curr) => acc + Number(curr.total_gasto || 0), 0);
      setTotalMes(total);
    } catch (error: any) { toast.error("Error al cargar Supabase"); } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("🚀 Enviando a n8n...");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('https://n8n.sianadigital.com/webhook/8ec4ddfb-2453-40b1-bcae-ad769f0bec08', {
        method: 'POST',
        body: formData,
      });

      // --- ESCUDO DE SEGURIDAD ---
      const responseText = await response.text(); // Leemos como texto primero para evitar el error de JSON
      
      let resIA;
      try {
        resIA = JSON.parse(responseText);
      } catch (e) {
        console.error("Respuesta no válida de n8n:", responseText);
        alert("ERROR DE n8n: El servidor respondió algo que no es un objeto. Probablemente el flujo de n8n se detuvo o dio error.");
        throw new Error("Respuesta del servidor no válida");
      }

      let rawContent = Array.isArray(resIA) ? (resIA[0].text || resIA[0]) : (resIA.text || resIA);
      let dataIA: any;

      if (typeof rawContent === 'string') {
        const cleanJsonStr = rawContent.replace(/```json\n?|```/g, '').trim();
        dataIA = JSON.parse(cleanJsonStr);
      } else {
        dataIA = rawContent;
      }

      const totalCalculado = parseNumeric(dataIA.total || dataIA.total_gasto);

      const { error } = await supabase.from('gastos_materiales').insert([{
        proveedor_nombre: dataIA.proveedor || "PROVEEDOR DESCONOCIDO",
        fecha_factura: dataIA.fecha || new Date().toISOString().split('T')[0],
        numero_factura: dataIA.factura_n || dataIA.numero_factura || "S/N",
        obra_referencia: dataIA.referencia_obra || "ALMACÉN",
        subtotal: parseNumeric(dataIA.base_imponible || dataIA.subtotal),
        iva: parseNumeric(dataIA.iva_total || dataIA.iva),
        total_gasto: totalCalculado,
        desglose_materiales: dataIA.lineas_factura || [],
        mes_registro: new Date().getMonth() + 1,
        anio_registro: new Date().getFullYear()
      }]);

      if (error) throw error;
      toast.success("¡Registrado!", { id: toastId });
      fetchGastos();
    } catch (err: any) {
      toast.error("Error en el proceso. Mira la consola.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6 lg:p-10 text-white font-sans relative">
      {/* MODAL DESGLOSE */}
      {isModalOpen && selectedGasto && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-8 text-white">
              <div>
                <h2 className="text-3xl font-black uppercase italic text-emerald-400">Detalle de Material</h2>
                <p className="text-xs font-bold opacity-50 uppercase tracking-widest mt-2">{selectedGasto.proveedor_nombre}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white"><X size={24}/></button>
            </div>
            <div className="max-h-[400px] overflow-y-auto rounded-3xl border border-white/5 bg-black/40 mb-8 p-4">
              <table className="w-full text-left">
                <thead className="bg-white/5 sticky top-0 font-black uppercase text-[10px] text-emerald-400/70 tracking-widest italic">
                  <tr><th className="px-8 py-5">Material</th><th className="px-8 py-5 text-center">Cant.</th><th className="px-8 py-5 text-right">Precio Unit.</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedGasto.desglose_materiales?.map((m: any, i: number) => (
                    <tr key={i} className="text-sm hover:bg-white/5">
                      <td className="px-8 py-5 font-bold uppercase opacity-80">{m.item || m.descripcion || m.material}</td>
                      <td className="px-8 py-5 text-center font-black text-white">{m.cant || m.cantidad || 0}</td>
                      <td className="px-8 py-5 text-right font-black text-emerald-400">{parseNumeric(m.precio || m.precio_unitario).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-emerald-500/10 p-8 rounded-[2rem] border border-emerald-500/20 text-right">
                <p className="text-[10px] font-black uppercase text-emerald-400 italic">Total Neto Factura</p>
                <p className="text-4xl font-black italic tracking-tighter text-white">{(selectedGasto.total_gasto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD PRINCIPAL */}
      <div className="flex justify-between items-end mb-12">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Gastos de <span className="text-emerald-400">Material</span></h1>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 px-10 text-right shadow-xl">
          <p className="text-[10px] font-black uppercase text-emerald-400 italic">Gasto Mensual</p>
          <p className="text-4xl font-black italic tracking-tighter">{totalMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white/10 border border-white/20 rounded-[2.5rem] p-8 backdrop-blur-md sticky top-10 text-center">
            <ReceiptText size={48} className="mx-auto text-emerald-400 mb-4 opacity-20" />
            <label className={`w-full border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${isUploading ? 'opacity-30' : 'hover:border-emerald-400 bg-white/5'}`}>
              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf" disabled={isUploading} />
              {isUploading ? <Loader2 className="animate-spin text-emerald-400 h-10 w-10" /> : <Upload className="text-white/20 h-10 w-10 mb-4" />}
              <span className="text-[9px] font-black uppercase opacity-40 italic">Cargar Factura</span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-2xl backdrop-blur-sm">
          <table className="w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="text-[10px] font-black uppercase text-emerald-400/60 italic tracking-[0.2em]">
                <th className="px-6">Fecha</th>
                <th className="px-6">Proveedor</th>
                <th className="px-6 text-right">Total</th>
                <th className="px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="bg-white/5 hover:bg-white/10 transition-all rounded-2xl group">
                  <td className="px-6 py-6 rounded-l-2xl font-bold">{new Date(g.fecha_factura).toLocaleDateString()}</td>
                  <td className="px-6 py-6 uppercase font-black text-sm tracking-tight">{g.proveedor_nombre}</td>
                  <td className="px-6 py-6 text-right font-black text-xl italic tracking-tighter">{Number(g.total_gasto).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                  <td className="px-6 py-6 rounded-r-2xl text-center flex justify-center gap-2">
                    <button onClick={() => { setSelectedGasto(g); setIsModalOpen(true); }} className="p-3 bg-white/10 rounded-xl hover:bg-emerald-500 transition-all shadow-lg text-white"><Eye size={16} /></button>
                    <button onClick={async () => { if(confirm("¿Eliminar?")) { await supabase.from('gastos_materiales').delete().eq('id', g.id); fetchGastos(); } }} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}