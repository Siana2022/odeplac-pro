import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Briefcase, Users, Package, TrendingUp } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const mockObras = [
  { id: '1', titulo: 'Reforma Integral Loft Chueca', cliente: 'Inversiones Madrileñas S.L.', estado: 'curso', total: 45200 },
  { id: '2', titulo: 'Instalación Pladur Oficinas Azca', cliente: 'Tech Solutions Madrid', estado: 'presupuesto', total: 12500 },
  { id: '3', titulo: 'Tabiquería Seca Hotel Gran Vía', cliente: 'Hoteles del Sol', estado: 'lead', total: 89000 },
  { id: '4', titulo: 'Acabados Vivienda Unifamiliar Las Rozas', cliente: 'Familia García-López', estado: 'terminado', total: 32150 },
]

const mockLeads = [
  { id: '1', nombre: 'Roberto Sanz', interes: 'Tabiquería Acústica', fecha: 'Hoy' },
  { id: '2', nombre: 'Elena Martínez', interes: 'Falso Techo Registrable', fecha: 'Ayer' },
  { id: '3', nombre: 'Construcciones Serna', interes: 'Presupuesto Obra Nueva', fecha: '23 Ene' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-zinc-900">Dashboard General</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras en Curso</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">+5 este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materiales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">3 proveedores activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación Proyectada</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€45,231.89</div>
            <p className="text-xs text-muted-foreground">+12% vs. mes anterior</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Obras Recientes</CardTitle>
            <CardDescription>Seguimiento de proyectos activos en ODEPLAC.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockObras.map((obra) => (
                  <TableRow key={obra.id}>
                    <TableCell className="font-medium">
                      <div>{obra.titulo}</div>
                      <div className="text-xs text-muted-foreground">{obra.cliente}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={obra.estado === 'curso' ? 'default' : 'secondary'}>
                        {obra.estado.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      €{obra.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Leads Recientes</CardTitle>
            <CardDescription>Nuevas oportunidades comerciales.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-600">
                      {lead.nombre[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{lead.nombre}</p>
                      <p className="text-xs text-muted-foreground">{lead.interes}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{lead.fecha}</div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-zinc-500 text-xs">Ver todos los leads</Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
