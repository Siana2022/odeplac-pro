'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente, Obra } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, ChevronLeft, Mail, Phone, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: clienteData } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (clienteData) setCliente(clienteData)

      const { data: obrasData } = await supabase.from('obras').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
      if (obrasData) setObras(obrasData)

      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando cliente...</div>
  if (!cliente) return <div className="p-8 text-center text-red-500">Cliente no encontrado</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/clientes">
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{cliente.nombre}</h1>
        </div>
        <Link href={`/dashboard/clientes/${id}/ai`}>
          <Button className="bg-zinc-900 text-white flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Consultar IA sobre este cliente</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{cliente.email}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{cliente.telefono || 'Sin teléfono'}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{cliente.direccion || 'Sin dirección'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Proyectos (Obras)</CardTitle>
          </CardHeader>
          <CardContent>
            {obras.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Este cliente no tiene obras registradas.</p>
            ) : (
              <div className="space-y-4">
                {obras.map((obra) => (
                  <Link key={obra.id} href={`/dashboard/obras/${obra.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-zinc-50 transition-colors mb-2">
                      <div className="flex items-center space-x-4">
                        <Briefcase className="h-5 w-5 text-zinc-400" />
                        <div>
                          <p className="font-medium">{obra.titulo}</p>
                          <p className="text-xs text-muted-foreground">Estado: {obra.estado.toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge variant={obra.estado === 'curso' ? 'default' : 'secondary'}>
                        {obra.porcentaje_progreso}%
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
