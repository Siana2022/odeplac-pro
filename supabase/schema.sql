-- ENUMs
CREATE TYPE metodo_ingesta AS ENUM ('api', 'pdf');
CREATE TYPE estado_obra AS ENUM ('lead', 'presupuesto', 'curso', 'terminado');

-- Tables
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefono TEXT,
    direccion TEXT,
    token_acceso_portal TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    categoria TEXT,
    metodo_ingesta metodo_ingesta NOT NULL DEFAULT 'pdf',
    config_api JSONB DEFAULT '{}',
    last_sync TIMESTAMP WITH TIME ZONE,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materiales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad TEXT NOT NULL DEFAULT 'ud', -- m2, kg, ud
    precio_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0,
    stock DECIMAL(12, 2) DEFAULT 0,
    categoria TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plantillas_memoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_plantilla TEXT NOT NULL,
    contenido_base TEXT NOT NULL, -- markdown/html
    variables_requeridas TEXT[], -- array of variable names
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    estado estado_obra NOT NULL DEFAULT 'lead',
    porcentaje_progreso INTEGER DEFAULT 0 CHECK (porcentaje_progreso >= 0 AND porcentaje_progreso <= 100),
    fotos_progreso TEXT[] DEFAULT '{}',
    total_presupuesto DECIMAL(12, 2) DEFAULT 0,
    memoria_tecnica_final TEXT,
    approval_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presupuestos_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materiales(id) ON DELETE SET NULL,
    cantidad DECIMAL(12, 3) NOT NULL,
    precio_aplicado DECIMAL(12, 2) NOT NULL,
    margen_beneficio DECIMAL(5, 2) NOT NULL, -- percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_memoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_items ENABLE ROW LEVEL SECURITY;

-- Basic Policies (for now, allow all to authenticated users)
-- Basic Policies (FOR DEMO: allow full access to public/anon)
CREATE POLICY "Allow public full access" ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON proveedores FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON materiales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON plantillas_memoria FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON obras FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access" ON presupuestos_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_materiales_updated_at BEFORE UPDATE ON materiales FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_obras_updated_at BEFORE UPDATE ON obras FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Billing Table for Veri*factu
CREATE TABLE IF NOT EXISTS facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    numero_factura TEXT UNIQUE NOT NULL,
    qr_code TEXT,
    hash TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    datos_completos JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON facturas FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert" ON facturas FOR INSERT TO anon WITH CHECK (true);
-- No UPDATE or DELETE policies means records are immutable via RLS.
