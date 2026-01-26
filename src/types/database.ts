export type MetodoIngesta = 'api' | 'pdf';
export type EstadoObra = 'lead' | 'presupuesto' | 'curso' | 'terminado';

export interface Cliente {
  id: string;
  nombre_fiscal: string;
  email: string;
  telefono?: string;
  direccion?: string;
  token_acceso_portal: string;
  created_at: string;
  updated_at: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  metodo_ingesta: MetodoIngesta;
  config_api: Record<string, unknown>;
  last_sync?: string;
  created_at: string;
}

export interface Material {
  id: string;
  proveedor_id: string;
  nombre: string;
  unidad: string;
  precio_coste: number;
  categoria?: string;
  tags?: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlantillaMemoria {
  id: string;
  nombre_plantilla: string;
  contenido_base: string;
  variables_requeridas: string[];
  created_at: string;
}

export interface Obra {
  id: string;
  cliente_id: string;
  titulo: string;
  estado: EstadoObra;
  porcentaje_progreso: number;
  fotos_progreso: string[];
  total_presupuesto: number;
  memoria_tecnica_final?: string;
  created_at: string;
  updated_at: string;
}

export interface PresupuestoItem {
  id: string;
  obra_id: string;
  material_id: string;
  cantidad: number;
  precio_aplicado: number;
  margen_beneficio: number;
  created_at: string;
}
