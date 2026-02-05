'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Plus, Users, Mail, Phone, Globe, MapPin, User, Loader2, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from 'sonner'

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estado con los campos exactos que necesitas
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    persona_contacto: '',
    direccion: '',
    web: ''
  })

  const fetchProveedores = async () => {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    if (data) setProveedores(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProveedores()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const { error } = await supabase.from('proveedores').insert([formData])

    if (error) {
      toast.error("Error al guardar el proveedor")
    } else {
      toast.success("Proveedor creado correctamente")
      setIsDialogOpen(false)
      setFormData({ nombre: '', email: '', telefono: '', persona_contacto: '', direccion: '', web: '' })
      fetchProveedores()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Gestión de Proveedores</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-[#295693] hover:bg-white/90 font-bold rounded-xl shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white max-w-md border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-[#295693] text-2xl font-bold">Añadir Proveedor</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {/* Campo Nombre */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Nombre de la Empresa</label>
                <input 
                  required 
                  value={formData.nombre} 
                  onChange={e => setFormData({...formData, nombre: e.target.value})} 
                  className="w-full p-3 border-2 border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900 outline-none focus:border-[#295693] transition-all placeholder:text-zinc-300" 
                  placeholder="Ej: Saint-Gobain Placo" 
                />
              </div>

              {/* Persona y Teléfono en paralelo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Persona de Contacto</label>
                  <input 
                    value={formData.persona_contacto} 
                    onChange={e => setFormData({...formData, persona_contacto: e.target.value})} 
                    className="w-full p-3 border-2 border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900 outline-none focus:border-[#295693] transition-all" 
                    placeholder="Nombre" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Teléfono</label>
                  <input 
                    value={formData.telefono} 
                    onChange={e => setFormData({...formData, telefono: e.target.value})} 
                    className="w-full p-3 border-2 border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900 outline-none focus:border-[#295693] transition-all" 
                    placeholder="600000000" 
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full p-3 border-2 border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900 outline-none focus:border-[#295693] transition-all" 
                  placeholder="comercial@proveedor.es" 
                />
              </div>

              {/* Dirección */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Dirección</label>
                <input 
                  value={formData.direccion} 
                  onChange={e => setFormData({...formData, direccion: e.target.value})} 
                  className="w-full p-3 border-2 border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900 outline-none focus:border-[#295693] transition-all" 
                  placeholder="Calle, Número, CP y Ciudad" 
                />
              </div>

              {/* Web */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Web</label>
                <input 
                  value={formData.web} 
                  onChange={e => setFormData({...formData, web: e.target.value})} 
                  className="w-full p-3 border-2 border-zinc-200 rounded-xl bg-zinc-50 text-zinc-900 outline-none focus:border-[#295693] transition-all" 
                  placeholder="www.proveedor.es" 
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full bg-[#295693] hover:bg-zinc-900 text-white font-bold h-14 rounded-2xl shadow-lg mt-4 transition-all">
                {saving ? <Loader2 className="animate-spin" /> : 'Guardar Proveedor'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de tarjetas con diseño "cristal" */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center text-white/30 italic">Sincronizando proveedores...</div>
        ) : proveedores.length === 0 ? (
          <div className="col-span-full py-20 text-center text-white/30 italic">No hay proveedores registrados. ¡Crea el primero!</div>
        ) : proveedores.map((p) => (
          <div key={p.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                <Users size={24} />
              </div>
              <ChevronRight className="text-white/20 group-hover:text-white transition-colors" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{p.nombre}</h3>
            <p className="text-[#90caf9] text-sm flex items-center gap-2 mb-6 font-medium">
              <User size={14} /> {p.persona_contacto || 'Sin contacto'}
            </p>

            <div className="space-y-3 pt-4 border-t border-white/5">
              {p.telefono && (
                <div className="flex items-center gap-3 text-white/70 text-xs">
                  <Phone size={14} className="text-[#90caf9]" /> {p.telefono}
                </div>
              )}
              {p.email && (
                <div className="flex items-center gap-3 text-white/70 text-xs">
                  <Mail size={14} className="text-[#90caf9]" /> {p.email}
                </div>
              )}
              {p.direccion && (
                <div className="flex items-center gap-3 text-white/70 text-xs line-clamp-1">
                  <MapPin size={14} className="text-[#90caf9]" /> {p.direccion}
                </div>
              )}
              {p.web && (
                <div className="flex items-center gap-3 text-white/70 text-xs">
                  <Globe size={14} className="text-[#90caf9]" /> {p.web}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}