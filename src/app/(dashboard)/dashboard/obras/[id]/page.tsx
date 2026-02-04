'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Obra, Cliente, Material, PresupuestoItem } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Save, Sparkles, FileText, ChevronLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Editor } from '@/components/shared/Editor'
import { CheckCircle2 } from 'lucide-react'
import { MaterialSelector } from '@/components/shared/MaterialSelector'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PDFDownloadButton } from '@/components/shared/PDFDownloadButton'

export default function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [obra, setObra] = useState<Obra | null>(null)
  const [items, setItems] = useState<(PresupuestoItem & { materiales: Material })[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingMemory, setGeneratingMemory] = useState(false)
  // Ajustamos el tipo para que sea más amigable con TypeScript
  const [invoice, setInvoice] = useState<any | null>(null)
  const [emitting, setEmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const { data: obraData } = await supabase.from('obras').select('*, clientes(*)').eq('id', id).single()
    if (obraData) {
      setObra(obraData)
    }

    const { data: itemsData } = await supabase.from('presupuestos_items').select('*, materiales(*)').eq('obra_id', id)
    if (itemsData) setItems(itemsData as (PresupuestoItem & { materiales: Material })[])

    const { data: invoiceData } = await supabase.from('facturas').select('*').eq('obra_id', id).single()
    if (invoiceData) setInvoice(invoiceData)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleEmitInvoice = async () => {
    setEmitting(true)
    try {
      const response = await fetch('/api/obras/emit-invoice', {
        method: 'POST',
        body: JSON.stringify({ obraId: id }),
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Factura emitida y registrada en Veri*factu')
        fetchData()
      } else {
        toast.error(data.error)
      }
    } catch (e) {
      toast.error('Error al emitir factura')
    } finally {
      setEmitting(false)
    }
  }

  const handleGenerateMemory = async (obraId: string) => {
    setGeneratingMemory(true)
    try {
      const response = await fetch('/api/obras/generate-memory', {
        method: 'POST',
        body: JSON.stringify({ obraId }),
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.memory) {
        setObra(prev => prev ? { ...prev, memoria_tecnica_final: data.memory } : null)
        toast.success('Memoria técnica generada con éxito')
      }
    } catch (error) {
      toast.error('Error al generar la memoria')
    } finally {
      setGeneratingMemory(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando obra...</div>
  if (!obra) return <div className="p-8 text-center text-destructive">Obra no encontrada</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/obras">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{obra.titulo}</h1>
        </div>
        <PDFDownloadButton obra={obra} items={items} />
      </div>

      <Tabs defaultValue="presupuesto">
        <TabsList>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="memoria">Memoria Técnica</TabsTrigger>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="presupuesto" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Partidas del Presupuesto</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Añadir Material
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Seleccionar Material</DialogTitle>
                  </DialogHeader>
                  <MaterialSelector onSelect={async (material) => {
                    const { error } = await supabase.from('presupuestos_items').insert({
                      obra_id: id,
                      material_id: material.id,
                      cantidad: 1,
                      precio_aplicado: material.precio_unitario,
                      margen_beneficio: 20
                    })
                    if (error) toast.error(error.message)
                    else {
                      toast.success('Material añadido')
                      fetchData()
                    }
                  }} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>P. Aplicado</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.materiales.nombre}</TableCell>
                      <TableCell>{item.materiales.unidad}</TableCell>
                      <TableCell>{item.cantidad}</TableCell>
                      <TableCell>€{item.precio_aplicado}</TableCell>
                      <TableCell>€{(item.cantidad * item.precio_aplicado).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No hay partidas añadidas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memoria" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Memoria Técnica Descriptiva</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={async () => {
                  const { error } = await supabase.from('obras').update({ memoria_tecnica_final: obra.memoria_tecnica_final }).eq('id', id)
                  if (error) toast.error(error.message)
                  else toast.success('Memoria guardada')
                }}>
                  <Save className="mr-2 h-4 w-4" /> Guardar
                </Button>
                <Button onClick={() => handleGenerateMemory(id)} disabled={generatingMemory}>
                  {generatingMemory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generar con IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Editor
                content={obra.memoria_tecnica_final || '<p>La memoria aún no ha sido generada.</p>'}
                onChange={(html) => setObra(prev => prev ? { ...prev, memoria_tecnica_final: html } : null)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguimiento" className="space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>Progreso de la Obra</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium w-24">Estado:</span>
                    <Badge>{obra.estado.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium w-24">Progreso:</span>
                    <div className="flex-1 max-w-md">
                      <Progress value={obra.porcentaje_progreso} className="h-2" />
                    </div>
                    <span className="text-sm">{obra.porcentaje_progreso}%</span>
                  </div>
                </div>
             </CardContent>
           </Card>

           {obra.estado === 'terminado' && (
             <Card className="border-zinc-900 border-2">
               <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>Certificación Veri*factu (AEAT)</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Cumplimiento legal de integridad y encadenamiento.</p>
                 </div>
                 {!invoice && (
                   <Button onClick={handleEmitInvoice} disabled={emitting} className="bg-zinc-900 text-white">
                     {emitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                     Emitir Factura Final
                   </Button>
                 )}
               </CardHeader>
               <CardContent>
                 {invoice ? (
                   <div className="flex items-start space-x-6 p-4 bg-zinc-50 rounded-lg">
                      <div className="flex-1 space-y-2">
                        {/* 🛠️ FIJACIÓN DE TIPOS AQUÍ */}
                        <p className="text-sm"><strong>Nº Factura:</strong> {String(invoice.numero_factura)}</p>
                        <p className="text-sm text-zinc-500 font-mono text-[10px] break-all"><strong>Hash Actual:</strong> {String(invoice.hash)}</p>
                        <p className="text-sm text-zinc-500 font-mono text-[10px] break-all"><strong>Hash Anterior:</strong> {String(invoice.prev_hash)}</p>
                        <div className="flex items-center mt-4 text-green-700 text-xs font-bold">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> REGISTRADO EN AEAT 2026
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <img src={String(invoice.qr_code)} alt="QR Verifactu" className="h-24 w-24 border bg-white" />
                        <p className="text-[10px] text-zinc-500">Escanea para verificar</p>
                      </div>
                   </div>
                 ) : (
                   <div className="text-center py-6 text-muted-foreground italic text-sm">
                     La obra está terminada. Puede proceder a la emisión legal de la factura.
                   </div>
                 )}
               </CardContent>
             </Card>
           )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
