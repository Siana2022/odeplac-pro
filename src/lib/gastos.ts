import { Truck, Fuel, Building2, ShoppingBag, type LucideIcon } from 'lucide-react'

export type CategoriaGasto = 'proveedores' | 'gasolina' | 'alquiler' | 'otros'

export interface CategoriaInfo {
  id: CategoriaGasto
  label: string
  descripcion: string
  Icon: LucideIcon
  /** Clases de color tailwind (fijas para que el compilador las detecte) */
  text: string
  bg: string
  border: string
  bar: string
}

export const CATEGORIAS: CategoriaInfo[] = [
  { id: 'proveedores', label: 'Proveedores', descripcion: 'Facturas de materiales (Isoterm, Decoplak, Cir92, Leroy Merlin, Obramat...)', Icon: Truck,
    text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-400' },
  { id: 'gasolina', label: 'Gasolina', descripcion: 'Tickets y facturas de combustible', Icon: Fuel,
    text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-400' },
  { id: 'alquiler', label: 'Gastos de empresa', descripcion: 'Alquiler, gestoría, seguros y otros gastos de empresa', Icon: Building2,
    text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', bar: 'bg-sky-400' },
  { id: 'otros', label: 'Otros gastos', descripcion: 'Ropa laboral, tarjetas de visita, material de oficina...', Icon: ShoppingBag,
    text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', bar: 'bg-fuchsia-400' },
]

export const getCategoria = (id?: string | null): CategoriaInfo | undefined =>
  CATEGORIAS.find(c => c.id === id)

export const eur = (n: number | string | null | undefined) =>
  Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
