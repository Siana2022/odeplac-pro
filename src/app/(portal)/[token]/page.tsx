'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Obra, Cliente, PresupuestoItem, Material } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PDFDownloadButton } from '@/components/shared/PDFDownloadButton'
import { toast } from 'sonner'

export default function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [obras, setObras] = useState<(Obra & { clientes: Cliente; items: (PresupuestoItem & { materiales: Material })[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)

  const fetchPortalData = async () => {
    setLoading(true)
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('token_acceso_portal', token)
      .single()

    if (cliente) {
      const { data: obrasData } = await supabase
        .from('obras')
        .select('*, clientes(*)')
        .eq('cliente_id', cliente.id)

      if (obrasData) {
        // Fetch items for each obra
        const obrasWithItems = await Promise.all(obrasData.map(async (obra) => {
          const { data: items } = await supabase
            .from('presupuestos_items')
            .select('*, materiales(*)')
            .eq('obra_id', obra.id)
          return { ...obra, items: items || [] }
        }))
        setObras(obrasWithItems as any)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPortalData()
  }, [token])

  const handleApprove = async (obraId: string) => {
    setApproving(obraId)
    try {
      const response = await fetch('/api/obras/approve', {
        method: 'POST',
        body: JSON.stringify({ obraId }),
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Proyecto aceptado correctamente. ¡Comenzamos!')
        fetchPortalData()
      } else {
        toast.error(data.error || 'Error al aceptar el proyecto')
      }
    } catch (error) {
      toast.error('Error de red al aceptar el proyecto')
    } finally {
      setApproving(null)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      <p className="text-zinc-500">Cargando tu portal...</p>
    </div>
  )

  if (obras.length === 0) return <div className="flex min-h-screen items-center justify-center">No se encontraron obras para este acceso.</div>

  const cliente = obras[0].clientes

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Portal del Cliente</h1>
          <p className="text-muted-foreground">Bienvenido, {cliente.nombre}</p>
        </header>

        <div className="grid gap-6">
          {obras.map(obra => (
            <Card key={obra.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{obra.titulo}</CardTitle>
                  <Badge className="mt-2" variant={obra.estado === 'lead' ? 'outline' : 'default'}>
                    {obra.estado.toUpperCase()}
                  </Badge>
                </div>
                <div className="relative h-20 w-20">
                  <svg className="h-full w-full" viewBox="0 0 36 36">
                    <path
                      className="stroke-zinc-200 fill-none"
                      strokeWidth="3"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="stroke-zinc-900 fill-none transition-all duration-500"
                      strokeWidth="3"
                      strokeDasharray={`${obra.porcentaje_progreso}, 100`}
                      strokeLinecap="round"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="text-[8px] font-bold" textAnchor="middle" fill="currentColor">
                      {obra.porcentaje_progreso}%
                    </text>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PDFDownloadButton obra={obra} items={obra.items} />
                </div>

                {(obra.estado === 'lead' || obra.estado === 'presupuesto') && (
                  <div className="pt-4 border-t">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={approving === obra.id}
                      onClick={() => handleApprove(obra.id)}
                    >
                      {approving === obra.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Confirmar Recepción y Aceptar Presupuesto
                    </Button>
                    <p className="mt-2 text-center text-[10px] text-zinc-500">
                      Al hacer clic, aceptas los términos del presupuesto. Se registrará tu dirección IP y marca de tiempo como firma digital.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
