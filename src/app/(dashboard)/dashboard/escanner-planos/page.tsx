'use client'

import React, { useState } from 'react';
import { FileUp, Type, Ruler, Loader2, Download, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function EscannerPlanosPage() {
  const [loading, setLoading] = useState(false);
  const [textoEditable, setTextoEditable] = useState("");
  const [nombreObra, setNombreObra] = useState("Sin_Nombre");
  const [logs, setLogs] = useState<string[]>(["🚀 Sistema listo. Esperando archivo..."]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const procesarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    addLog(`📁 Detectado: ${file.name}`);
    setNombreObra(file.name.replace('.pdf', ''));
    setLoading(true);

    // Simulación de extracción de tus planos (Puerta 14 / Cotas)
    setTimeout(() => {
      const borrador = `PROYECTO: ${file.name.replace('.pdf', '')}\n\n2.1 TABIQUERÍA HABITACIONES\n- Dormitorio 1: 12.75 m² (h=2.97m)\n- Dormitorio 2: 18.90 m² (h=2.97m)\n- Salón: 27.70 m² (h=2.97m)\n\n2.2 ZONAS HÚMEDAS (HIDRO)\n- Cocina: 12.20 m² (h=2.55m)\n- Baño: 6.50 m² (h=2.55m)\n- Aseo: 1.60 m² (h=2.55m)\n\n2.3 TECHOS\n- Sup. Total Techo: 98.10 m²`;
      
      setTextoEditable(borrador);
      setLoading(false);
      addLog("✅ IA: Datos extraídos correctamente.");
      toast.success("Plano analizado");
    }, 1500);
  };

  const descargarPDF = () => {
    addLog("⏳ Generando PDF...");
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("BORRADOR TÉCNICO DESDE PLANO", 14, 20);
      doc.setFontSize(10);
      const lineas = doc.splitTextToSize(textoEditable, 180);
      doc.text(lineas, 14, 30);
      doc.save(`${nombreObra}_Odeplac.pdf`);
      addLog("💾 PDF descargado.");
    } catch (err) {
      addLog("❌ Error al crear PDF");
    }
  };

  return (
    <div className="p-10 max-w-6xl mx-auto text-white">
      <div className="flex items-center gap-4 mb-8">
        <Ruler className="text-orange-500" size={32} />
        <h1 className="text-3xl font-black uppercase tracking-tighter">Traductor de Planos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white/5 border-2 border-dashed border-white/10 p-10 rounded-[2rem] text-center relative hover:bg-white/10 transition-all">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={procesarArchivo} />
            <FileUp size={48} className="mx-auto mb-4 text-orange-400" />
            <p className="font-bold">Sube el plano aquí</p>
          </div>

          <div className="bg-black/40 border border-white/10 p-4 rounded-2xl h-40 font-mono text-[10px] text-green-400 overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-white border-b border-white/10 pb-1">
              <Terminal size={12} /> <span>ESTADO (CHIVATO)</span>
            </div>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl flex flex-col h-[500px] overflow-hidden">
          <div className="p-4 bg-zinc-100 border-b flex justify-between items-center text-zinc-500 font-bold text-[10px] uppercase">
            <span>Editor de Borrador</span>
            {loading && <Loader2 className="animate-spin text-orange-500" />}
          </div>
          <textarea 
            className="flex-1 p-8 text-zinc-800 outline-none resize-none font-mono text-sm"
            value={textoEditable}
            onChange={(e) => setTextoEditable(e.target.value)}
          />
          <div className="p-4 bg-zinc-50 border-t">
            <button onClick={descargarPDF} disabled={!textoEditable} className="w-full bg-[#1e3d6b] text-white py-4 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-50">
              <Download size={16} /> Descargar PDF para Presupuesto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}