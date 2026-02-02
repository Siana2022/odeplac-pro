'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Save, Building2, Globe, Percent } from "lucide-react"

export default function SettingsPage() {
  const [config, setConfig] = useState({
    companyName: 'ODEPLAC PRO',
    companyAddress: 'Calle Falsa 123, Madrid',
    companyEmail: 'contacto@odeplac.com',
    companyWeb: 'www.odeplac.com',
    taxRate: 21,
  })

  const handleSave = () => {
    // In a real app, this would save to DB.
    // For now we simulate success.
    toast.success("Configuración guardada correctamente")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Guardar Cambios
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" /> Datos de la Empresa
            </CardTitle>
            <CardDescription>Esta información aparecerá en tus presupuestos y facturas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre Comercial</Label>
              <Input
                id="companyName"
                value={config.companyName}
                onChange={(e) => setConfig({...config, companyName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Dirección Fiscal</Label>
              <Input
                id="companyAddress"
                value={config.companyAddress}
                onChange={(e) => setConfig({...config, companyAddress: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" /> Contacto y Web
            </CardTitle>
            <CardDescription>Canales de comunicación oficiales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email de Contacto</Label>
              <Input
                id="companyEmail"
                type="email"
                value={config.companyEmail}
                onChange={(e) => setConfig({...config, companyEmail: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWeb">Sitio Web</Label>
              <Input
                id="companyWeb"
                value={config.companyWeb}
                onChange={(e) => setConfig({...config, companyWeb: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Percent className="mr-2 h-5 w-5" /> Impuestos y Fiscalidad
            </CardTitle>
            <CardDescription>Configuración de tasas aplicables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">IVA Aplicable (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={config.taxRate}
                onChange={(e) => setConfig({...config, taxRate: parseInt(e.target.value)})}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-50 border-dashed">
          <CardHeader>
            <CardTitle className="text-zinc-500">Estado de la Conexión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Supabase DB</span>
              <span className="text-green-600 font-medium">Conectado</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Gemini AI (Flash)</span>
              <span className="text-green-600 font-medium">Activo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Resend Email</span>
              <span className="text-green-600 font-medium">Configurado</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
